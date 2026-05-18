import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".dev.vars") });

export const BASE = (process.env.BASE_URL ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);
export const TOKEN = process.env.SESSION_TOKEN;

export function requireSessionToken(): string {
  if (!TOKEN) {
    console.error("Missing SESSION_TOKEN in .dev.vars (or env)");
    process.exit(1);
  }
  return TOKEN;
}

export const cookie = () =>
  `better-auth.session_token=${requireSessionToken()}`;

export type JsonReqOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  json?: boolean;
};

export async function jsonReq(
  name: string,
  path: string,
  expectedStatus: number,
  opts: JsonReqOptions = {},
): Promise<{ res: Response; body: unknown }> {
  const useJson = opts.json !== false;
  const headers: Record<string, string> = {
    Cookie: cookie(),
    ...opts.headers,
  };
  if (useJson && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  console.log(`\n=== ${name} ===`);
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : useJson
          ? JSON.stringify(opts.body)
          : (opts.body as BodyInit),
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  console.log(res.status, JSON.stringify(body, null, 2));
  if (res.status !== expectedStatus) {
    throw new Error(`${name}: expected ${expectedStatus}, got ${res.status}`);
  }
  return { res, body };
}

export async function rawReq(
  name: string,
  path: string,
  expectedStatus: number,
  init?: RequestInit,
): Promise<Response> {
  console.log(`\n=== ${name} ===`);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Cookie: cookie(),
      ...init?.headers,
    },
  });
  if (res.status !== expectedStatus) {
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* raw */
    }
    console.log(res.status, body);
    throw new Error(`${name}: expected ${expectedStatus}, got ${res.status}`);
  }
  console.log(res.status, init?.method === "GET" ? "(binary or json)" : "OK");
  return res;
}

export async function assertServerReachable(): Promise<void> {
  const health = await fetch(`${BASE}/api/applications`);
  if (health.status !== 401 && !health.ok) {
    throw new Error(`Server not reachable: ${health.status}`);
  }
  console.log("\n=== Server reachable ===\nOK");
}

/** Minimal PDF that passes magic-byte validation. */
export function minimalPdf(extra = ""): Blob {
  const core = `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF${extra}`;
  return new Blob([core], { type: "application/pdf" });
}

/** PDF with embedded text (for resume upload + analyzer smoke tests). */
export function resumeTestPdf(): Blob {
  const body = [
    "Jane Developer — Senior Software Engineer",
    "Skills: TypeScript, React, Node.js, PostgreSQL, REST APIs, communication",
    "Experience: Built scalable web apps with React and TypeScript at Tech Corp for six years.",
    "Education: Bachelor of Science in Computer Science",
  ].join(" ");
  const safe = body.replace(/[\\()]/g, " ");
  const stream = `BT /F1 11 Tf 48 740 Td (${safe}) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
trailer<</Size 6/Root 1 0 R>>
startxref
0
%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function readFixtureText(name: string): string {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures", name);
  return readFileSync(path, "utf8");
}

export type AuthSession = {
  user?: { id?: string; isPro?: boolean };
  session?: unknown;
};

export async function getSession(): Promise<AuthSession | null> {
  const res = await fetch(`${BASE}/api/auth/get-session`, {
    headers: { Cookie: cookie() },
  });
  if (!res.ok) return null;
  return (await res.json()) as AuthSession | null;
}

export async function pollAnalysis(
  applicationId: string,
  opts: { maxMs?: number; intervalMs?: number } = {},
): Promise<unknown> {
  const maxMs = opts.maxMs ?? 180_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + maxMs;
  let last: unknown;

  while (Date.now() < deadline) {
    const { body } = await jsonReq(
      "GET /api/applications/:id/analysis (poll)",
      `/api/applications/${applicationId}/analysis`,
      200,
    );
    last = body;
    const status = (body as { status?: string }).status;
    if (status === "complete" || status === "failed") {
      return body;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Analysis poll timed out after ${maxMs}ms; last: ${JSON.stringify(last)}`,
  );
}
