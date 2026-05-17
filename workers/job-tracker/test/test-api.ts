import {
  assertServerReachable,
  jsonReq,
  requireSessionToken,
} from "./helpers.js";

requireSessionToken();

async function main() {
  await assertServerReachable();

  await jsonReq("GET /api/applications", "/api/applications", 200);

  const { body: created } = await jsonReq(
    "POST /api/applications",
    "/api/applications",
    201,
    {
      method: "POST",
      body: {
        company: "Test Co",
        title: "Test Role",
        status: "applied",
        notes: "Created by test-api.ts",
      },
    },
  );

  const id = (created as { application: { id: string } }).application.id;

  await jsonReq("GET /api/applications/:id", `/api/applications/${id}`, 200);
  await jsonReq("PATCH /api/applications/:id", `/api/applications/${id}`, 200, {
    method: "PATCH",
    body: { status: "interviewing", notes: "Updated by test-api.ts" },
  });
  await jsonReq("DELETE /api/applications/:id", `/api/applications/${id}`, 200, {
    method: "DELETE",
  });

  const otherId = "3SDD8cdM3m41RD8iya4mgkEBW0a3HDQm";
  await jsonReq(
    "GET other user's application (should 404)",
    `/api/applications/${otherId}`,
    404,
  );
  await jsonReq(
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
