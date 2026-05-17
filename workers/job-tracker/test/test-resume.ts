import {
  assertServerReachable,
  jsonReq,
  minimalPdf,
  rawReq,
  requireSessionToken,
} from "./helpers.js";

requireSessionToken();

type Application = {
  id: string;
  resumeUrl: string | null;
};

type UsageResponse = {
  success: boolean;
  month: string;
  usage: {
    classA: { count: number; limit: number; percent: number };
    classB: { count: number; limit: number; percent: number };
    storageBytes: { count: number; limit: number; percent: number };
  };
};

async function createTestApplication(): Promise<string> {
  const { body } = await jsonReq(
    "POST /api/applications (fixture)",
    "/api/applications",
    201,
    {
      method: "POST",
      body: {
        company: "Resume Test Co",
        title: "Resume Test Role",
        status: "applied",
        notes: "Created by test-resume.ts",
      },
    },
  );
  return (body as { application: Application }).application.id;
}

async function deleteApplication(id: string): Promise<void> {
  await jsonReq(
    "DELETE /api/applications/:id (cleanup)",
    `/api/applications/${id}`,
    200,
    { method: "DELETE" },
  );
}

async function main() {
  await assertServerReachable();

  const id = await createTestApplication();
  let applicationDeleted = false;

  try {
    await rawReq(
      "GET resume before upload (404)",
      `/api/applications/${id}/resume`,
      404,
    );

    await rawReq(
      "PUT resume invalid type (400)",
      `/api/applications/${id}/resume`,
      400,
      {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: "not a pdf",
      },
    );

    await rawReq(
      "PUT resume fake pdf header wrong body (400)",
      `/api/applications/${id}/resume`,
      400,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: "hello",
      },
    );

    const pdfV1 = minimalPdf();
    const uploadRes = await rawReq(
      "PUT resume (200)",
      `/api/applications/${id}/resume`,
      200,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdfV1,
      },
    );
    const uploaded = (await uploadRes.json()) as {
      application: Application;
    };
    if (!uploaded.application.resumeUrl?.includes(id)) {
      throw new Error("resumeUrl should contain application id as object key");
    }

    const downloadRes = await rawReq(
      "GET resume (200)",
      `/api/applications/${id}/resume`,
      200,
    );
    const ct = downloadRes.headers.get("Content-Type");
    if (!ct?.includes("application/pdf")) {
      throw new Error(`Expected application/pdf, got ${ct}`);
    }
    const downloaded = new Uint8Array(await downloadRes.arrayBuffer());
    const header = new TextDecoder().decode(downloaded.slice(0, 5));
    if (!header.startsWith("%PDF")) {
      throw new Error("Downloaded body is not a PDF");
    }
    if (downloaded.byteLength !== pdfV1.size) {
      throw new Error("Downloaded size should match uploaded PDF");
    }

    const { body: usageAfterUpload } = await jsonReq(
      "GET /api/r2/usage (200)",
      "/api/r2/usage",
      200,
    );
    const usage = usageAfterUpload as UsageResponse;
    if (!usage.success || !usage.month || !usage.usage?.classA) {
      throw new Error("Invalid /api/r2/usage response shape");
    }
    if (usage.usage.classA.count < 1) {
      throw new Error("Expected classA count >= 1 after upload");
    }
    if (usage.usage.storageBytes.count < pdfV1.size) {
      throw new Error("Expected stored_bytes to reflect uploaded PDF size");
    }

    const pdfV2 = minimalPdf("-replaced");
    await rawReq(
      "PUT resume replace (200)",
      `/api/applications/${id}/resume`,
      200,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdfV2,
      },
    );

    const download2 = await rawReq(
      "GET resume after replace (200)",
      `/api/applications/${id}/resume`,
      200,
    );
    const bytes2 = new Uint8Array(await download2.arrayBuffer());
    if (bytes2.byteLength !== pdfV2.size) {
      throw new Error("Replaced resume size mismatch");
    }

    await jsonReq(
      "DELETE resume (200)",
      `/api/applications/${id}/resume`,
      200,
      { method: "DELETE" },
    );

    const { body: afterDelete } = await jsonReq(
      "GET application after resume delete",
      `/api/applications/${id}`,
      200,
    );
    if ((afterDelete as { application: Application }).application.resumeUrl) {
      throw new Error("resumeUrl should be null after resume delete");
    }

    await rawReq(
      "GET resume after delete (404)",
      `/api/applications/${id}/resume`,
      404,
    );

    await jsonReq(
      "DELETE resume when none (404)",
      `/api/applications/${id}/resume`,
      404,
      { method: "DELETE" },
    );

    const pdfForAppDelete = minimalPdf("-app-delete");
    await rawReq(
      "PUT resume before app delete",
      `/api/applications/${id}/resume`,
      200,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: pdfForAppDelete,
      },
    );

    await deleteApplication(id);
    applicationDeleted = true;

    await rawReq(
      "GET resume after application deleted (404)",
      `/api/applications/${id}/resume`,
      404,
    );

    await jsonReq(
      "PUT resume on deleted application (404)",
      `/api/applications/${id}/resume`,
      404,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: minimalPdf(),
        json: false,
      },
    );

    const otherId = "3SDD8cdM3m41RD8iya4mgkEBW0a3HDQm";
    await rawReq(
      "PUT resume on other user's application (404)",
      `/api/applications/${otherId}/resume`,
      404,
      {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: minimalPdf(),
      },
    );

    const noAuth = await fetch(`${process.env.BASE_URL ?? "http://localhost:8787"}/api/r2/usage`);
    if (noAuth.status !== 401) {
      throw new Error(`Expected 401 without session, got ${noAuth.status}`);
    }
    console.log("\n=== GET /api/r2/usage without auth (401) ===\nOK");

    console.log("\nAll resume tests passed.");
  } finally {
    if (!applicationDeleted) {
      try {
        await deleteApplication(id);
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
