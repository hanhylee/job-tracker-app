import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { CloudflareBindings } from "../types";
import type { schema } from "../db";
import {
  assertWithinFreeTier,
  recordR2Usage,
  R2FreeTierError,
  setUsageWarningHeader,
} from "./r2-usage";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

type Db = DrizzleD1Database<typeof schema>;

export function resumeObjectKey(userId: string, applicationId: string): string {
  return `users/${userId}/applications/${applicationId}/resume.pdf`;
}

export function validatePdf(
  buffer: ArrayBuffer,
  contentType: string | undefined,
): string | null {
  if (contentType && !contentType.toLowerCase().includes("application/pdf")) {
    return "Content-Type must be application/pdf";
  }
  if (buffer.byteLength < 5) {
    return "Invalid PDF file";
  }
  const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
  if (!header.startsWith("%PDF")) {
    return "Invalid PDF file";
  }
  if (buffer.byteLength > MAX_RESUME_BYTES) {
    return `Resume must be at most ${MAX_RESUME_BYTES / (1024 * 1024)} MiB`;
  }
  return null;
}

export type ResumePutResult = {
  warning: boolean;
};

export async function putResumeObject(
  env: CloudflareBindings,
  db: Db,
  key: string,
  body: ArrayBuffer,
  oldSizeBytes: number,
): Promise<ResumePutResult> {
  const storageDelta = body.byteLength - oldSizeBytes;
  const { warning: warnStorage } = await assertWithinFreeTier(
    db,
    "storage",
    storageDelta,
  );
  const { warning: warnA } = await assertWithinFreeTier(db, "classA");

  await env.RESUMES.put(key, body, {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: { bytes: String(body.byteLength) },
  });

  await recordR2Usage(db, {
    classA: 1,
    storageDeltaBytes: storageDelta,
  });

  return { warning: warnStorage || warnA };
}

export async function getResumeObject(
  env: CloudflareBindings,
  db: Db,
  key: string,
): Promise<{ object: R2ObjectBody; warning: boolean }> {
  const { warning } = await assertWithinFreeTier(db, "classB");
  const object = await env.RESUMES.get(key);
  if (!object) {
    throw new ResumeNotFoundError();
  }
  await recordR2Usage(db, { classB: 1 });
  return { object, warning };
}

export async function resolveResumeSizeBytes(
  env: CloudflareBindings,
  key: string,
  db: Db,
): Promise<number> {
  await assertWithinFreeTier(db, "classB");
  const head = await env.RESUMES.head(key);
  if (!head) return 0;
  await recordR2Usage(db, { classB: 1 });
  const fromMeta = head.customMetadata?.bytes;
  if (fromMeta) {
    const n = Number.parseInt(fromMeta, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return head.size;
}

export async function deleteResumeObject(
  env: CloudflareBindings,
  db: Db,
  key: string,
  sizeBytes: number,
): Promise<{ warning: boolean }> {
  const { warning } = await assertWithinFreeTier(db, "classA");
  let size = sizeBytes;
  if (size <= 0) {
    size = await resolveResumeSizeBytes(env, key, db);
  }
  await env.RESUMES.delete(key);
  await recordR2Usage(db, { classA: 1, storageDeltaBytes: -size });
  return { warning };
}

export class ResumeNotFoundError extends Error {
  constructor() {
    super("Resume not found");
    this.name = "ResumeNotFoundError";
  }
}

export function handleR2Error(
  err: unknown,
): { status: number; body: Record<string, unknown> } | null {
  if (err instanceof R2FreeTierError) {
    return {
      status: 429,
      body: { error: err.message, usage: err.usage },
    };
  }
  if (err instanceof ResumeNotFoundError) {
    return { status: 404, body: { error: err.message } };
  }
  return null;
}

export { R2FreeTierError, setUsageWarningHeader };
