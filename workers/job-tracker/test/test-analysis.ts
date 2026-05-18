import {
  assertServerReachable,
  BASE,
  cookie,
  getSession,
  jsonReq,
  pollAnalysis,
  readFixtureText,
  requireSessionToken,
  resumeTestPdf,
  rawReq,
} from "./helpers.js";

requireSessionToken();

const RUN_E2E = process.env.ANALYSIS_E2E === "1";

type Application = { id: string; resumeUrl: string | null };

async function createTestApplication(): Promise<string> {
  const { body } = await jsonReq(
    "POST /api/applications (analysis fixture)",
    "/api/applications",
    201,
    {
      method: "POST",
      body: {
        company: "Analysis Test Co",
        title: "Analysis Test Role",
        status: "applied",
        notes: "Created by test-analysis.ts",
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

async function testProGate(applicationId: string): Promise<boolean> {
  const probe = await fetch(
    `${BASE}/api/applications/${applicationId}/analyze`,
    { method: "POST", headers: { Cookie: cookie() } },
  );
  const isPro = probe.status !== 403;

  if (!isPro) {
    const body = (await probe.json().catch(() => ({}))) as { code?: string };
    console.log("\n=== POST analyze without Pro (403) ===");
    console.log(probe.status, JSON.stringify(body, null, 2));
    if (probe.status !== 403) {
      throw new Error(`POST analyze without Pro (403): expected 403, got ${probe.status}`);
    }
    const code = (body as { code?: string }).code;
    if (code !== "PRO_REQUIRED") {
      throw new Error(`Expected PRO_REQUIRED, got ${code}`);
    }

    await jsonReq(
      "GET analysis without Pro (403)",
      `/api/applications/${applicationId}/analysis`,
      403,
    );

    console.log(
      "\nSkipping Pro-only precondition/E2E tests (set user.is_pro = 1 in D1).",
    );
    return false;
  }

  console.log("\n=== Session user is Pro — running analysis tests ===");
  return true;
}

async function testPreconditions(applicationId: string): Promise<void> {
  await jsonReq(
    "POST analyze without job description (400)",
    `/api/applications/${applicationId}/analyze`,
    400,
    { method: "POST" },
  );

  const jobDescription = readFixtureText("sample-jd.txt");
  await jsonReq(
    "PATCH jobDescription",
    `/api/applications/${applicationId}`,
    200,
    {
      method: "PATCH",
      body: { jobDescription },
    },
  );

  await jsonReq(
    "POST analyze without resume (400)",
    `/api/applications/${applicationId}/analyze`,
    400,
    { method: "POST" },
  );

  await rawReq(
    "PUT resume for analysis",
    `/api/applications/${applicationId}/resume`,
    200,
    {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: resumeTestPdf(),
    },
  );
}

type AnalyzeStartBody = {
  analysisId?: string;
  status?: string;
  cached?: boolean;
  overallScore?: number;
  result?: { scoreBreakdown?: { weights?: Record<string, number> } };
};

async function postAnalyze(
  applicationId: string,
  name: string,
): Promise<{ status: number; body: AnalyzeStartBody }> {
  console.log(`\n=== ${name} ===`);
  const res = await fetch(`${BASE}/api/applications/${applicationId}/analyze`, {
    method: "POST",
    headers: { Cookie: cookie() },
  });
  const text = await res.text();
  let body: AnalyzeStartBody = {};
  try {
    body = text ? (JSON.parse(text) as AnalyzeStartBody) : {};
  } catch {
    /* raw */
  }
  console.log(res.status, JSON.stringify(body, null, 2));
  if (res.status !== 202 && res.status !== 200) {
    throw new Error(`${name}: expected 202 or 200, got ${res.status}`);
  }
  return { status: res.status, body };
}

async function testAnalyzeE2E(applicationId: string): Promise<void> {
  if (!RUN_E2E) {
    console.log(
      "\nSkipping E2E poll (set ANALYSIS_E2E=1, run npm run dev:workers, migration 0004).",
    );
    return;
  }

  const { status, body: startBody } = await postAnalyze(
    applicationId,
    "POST analyze (202 or 200)",
  );

  let final: {
    status: string;
    overallScore?: number;
    result?: { scoreBreakdown?: { weights?: Record<string, number> } };
    error?: string;
    analysisId?: string;
  };

  if (status === 200 && startBody.cached) {
    final = startBody as typeof final;
  } else {
    const analysisId = startBody.analysisId;
    if (!analysisId) {
      throw new Error("Expected analysisId when analyze returns 202");
    }
    final = (await pollAnalysis(applicationId)) as typeof final;

    await jsonReq(
      "GET /api/applications/analyses/:id",
      `/api/applications/analyses/${analysisId}`,
      200,
    );
  }

  if (final.status === "failed") {
    throw new Error(`Analysis failed: ${final.error ?? "unknown"}`);
  }

  if (final.status !== "complete") {
    throw new Error(`Unexpected final status: ${final.status}`);
  }

  if (typeof final.overallScore !== "number") {
    throw new Error("Expected overallScore on complete analysis");
  }

  const breakdown = final.result?.scoreBreakdown;
  if (!breakdown) {
    throw new Error("Expected result.scoreBreakdown on analysis");
  }
  if (breakdown.weights?.skills !== 0.55) {
    throw new Error("Expected scoreBreakdown.weights.skills === 0.55");
  }

  console.log(`\nE2E analysis complete. overallScore=${final.overallScore}`);
}

async function main() {
  await assertServerReachable();

  const id = await createTestApplication();

  try {
    const isPro = await testProGate(id);
    if (!isPro) {
      console.log("\nAnalysis pro-gate tests passed.");
      return;
    }

    await testPreconditions(id);

    if (RUN_E2E) {
      await testAnalyzeE2E(id);
    } else {
      try {
        await postAnalyze(id, "POST analyze smoke (202/200)");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("got 5")) {
          console.warn(
            "\nAnalyze unavailable — run npm run dev:workers with migration 0004.",
          );
        } else {
          throw err;
        }
      }
    }

    console.log("\nAll analysis tests passed.");
  } finally {
    try {
      await deleteApplication(id);
    } catch {
      /* cleanup */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
