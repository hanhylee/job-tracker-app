import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".dev.vars") });

const BASE = (process.env.BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");
const TOKEN = process.env.SESSION_TOKEN;

if (!TOKEN) {
  console.error("Missing SESSION_TOKEN in .dev.vars (or env)");
  process.exit(1);
}

const cookie = `better-auth.session_token=${TOKEN}`;

async function req(
  name: string,
  path: string,
  expectedStatus: number,
  init?: RequestInit,
): Promise<unknown> {
  console.log(`\n=== ${name} ===`);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      ...init?.headers,
    },
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
  return body;
}

async function main() {
  const health = await fetch(`${BASE}/api/applications`);
  if (health.status !== 401 && !health.ok) {
    throw new Error(`Server not reachable: ${health.status}`);
  }
  console.log("\n=== Server reachable ===\nOK");

  await req("GET /api/applications", "/api/applications", 200);

  const created = (await req("POST /api/applications", "/api/applications", 201, {
    method: "POST",
    body: JSON.stringify({
      company: "Test Co",
      title: "Test Role",
      status: "applied",
      notes: "Created by test-api.ts",
    }),
  })) as { application: { id: string } };

  const id = created.application.id;

  await req("GET /api/applications/:id", `/api/applications/${id}`, 200);
  await req("DELETE /api/applications/:id", `/api/applications/${id}`, 200, {
    method: "DELETE",
  });

  const otherId = "3SDD8cdM3m41RD8iya4mgkEBW0a3HDQm";
  await req(
    "GET other user's application (should 404)",
    `/api/applications/${otherId}`,
    404,
  );
  await req(
    "DELETE other user's application (should 404)",
    `/api/applications/${otherId}`,
    404,
    { method: "DELETE" },
  );

  console.log("\nAll tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
