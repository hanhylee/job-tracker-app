import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runAnalysisFromText } from '../src/lib/analysis-pipeline';
import { jdRequirementsSchema, analysisResultSchema } from '../src/lib/analysis-types';
import type { CloudflareBindings } from '../src/types';

const mockEnv = {
  AI: { run: async () => { throw new Error('no ai'); } },
} as unknown as Pick<CloudflareBindings, 'AI' | 'ANALYSIS_LLM_MODEL'>;

async function main() {
  const f = JSON.parse(
    readFileSync('test/fixtures/golden-strong-match.json', 'utf8'),
  );
  const jd = jdRequirementsSchema.parse(f.jdRequirements);

  const result = await runAnalysisFromText(mockEnv, {
    jobDescription: 'Senior Software Engineer role requiring React',
    resumeText: f.resumeText,
    jd,
    skipCoaching: true,
  });

  assert.ok(analysisResultSchema.safeParse(result).success);
  assert.equal(result.overallScore, f.expected.overallScore);
  assert.equal(result.scoreBreakdown.skills, f.expected.skills.score);
  assert.equal(result.scoreBreakdown.weights.skills, 0.55);
  assert.equal(result.categories.skills.score, f.expected.skills.score);
  assert.equal(result.categories.experience.score, f.expected.experience.score);
  assert.equal(
    result.categories.titleAlignment.score,
    f.expected.titleAlignment.score,
  );
  console.log('pipeline.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
