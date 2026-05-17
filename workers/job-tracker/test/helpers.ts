import { config } from "dotenv";
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
