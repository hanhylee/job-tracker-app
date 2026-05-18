import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreAllCategories, synthesizeOverallScore } from '../src/lib/score';
import { jdRequirementsSchema } from '../src/lib/analysis-types';
import type { CloudflareBindings } from '../src/types';

const mockEnv = {
  AI: { run: async () => { throw new Error('no ai'); } },
} as unknown as Pick<CloudflareBindings, 'AI'>;

async function runGolden(name: string) {
  const f = JSON.parse(
    readFileSync(`test/fixtures/${name}.json`, 'utf8'),
  );
  const jd = jdRequirementsSchema.parse(f.jdRequirements);
  const cats = await scoreAllCategories(mockEnv, jd, f.resumeText);
  const { overallScore } = synthesizeOverallScore(cats);

  assert.equal(cats.skills.score, f.expected.skills.score, `${name} skills`);
  assert.equal(
    cats.experience.score,
    f.expected.experience.score,
    `${name} experience`,
  );
  assert.equal(
    cats.titleAlignment.score,
    f.expected.titleAlignment.score,
    `${name} title`,
  );
  assert.equal(overallScore, f.expected.overallScore, `${name} overall`);
}

async function main() {
  await runGolden('golden-strong-match');
  await runGolden('golden-weak-match');
  await runGolden('golden-sparse-jd');
  console.log('golden.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
