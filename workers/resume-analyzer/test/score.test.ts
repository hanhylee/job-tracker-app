import assert from 'node:assert/strict';
import { SCORE_WEIGHTS } from '../src/lib/analysis-types';
import {
  scoreAllCategories,
  synthesizeOverallScore,
  buildAnalysisResult,
} from '../src/lib/score';
import { checkResumeFormatting } from '../src/lib/format-check';
import type { CloudflareBindings } from '../src/types';
import type { JdRequirements } from '../src/lib/analysis-types';

const mockEnv = {
  AI: { run: async () => { throw new Error('no ai'); } },
} as unknown as Pick<CloudflareBindings, 'AI'>;

const jd: JdRequirements = {
  skills: {
    requiredPhrases: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
    preferredPhrases: [],
  },
  experience: { minYears: 5, seniority: 'senior', requiredPhrases: [] },
  title: { targetPhrases: ['Senior Engineer'] },
};

const resumeText =
  'react typescript engineer. 3 years of professional experience. mid-level software engineer.';

async function testSkillsFourOfFive() {
  const smallJd: JdRequirements = {
    skills: {
      requiredPhrases: ['A', 'B', 'C', 'D', 'E'],
      preferredPhrases: [],
    },
    experience: { minYears: null, seniority: null, requiredPhrases: [] },
    title: { targetPhrases: [] },
  };
  const cats = await scoreAllCategories(mockEnv, smallJd, 'a b c d');
  assert.equal(cats.skills.score, 80);
}

async function testOverallWeightedSum() {
  const cats = await scoreAllCategories(mockEnv, jd, resumeText);
  const { overallScore } = synthesizeOverallScore(cats);
  const expected = Math.round(
    SCORE_WEIGHTS.skills * cats.skills.score +
      SCORE_WEIGHTS.experience * cats.experience.score +
      SCORE_WEIGHTS.titleAlignment * cats.titleAlignment.score,
  );
  assert.equal(overallScore, expected);
}

async function testFormattingDoesNotAffectOverall() {
  const cats = await scoreAllCategories(mockEnv, jd, 'react typescript');
  const { overallScore: before } = synthesizeOverallScore(cats);
  const badFormat = checkResumeFormatting('x');
  const goodFormat = checkResumeFormatting(
    'Experience\nEducation\nSkills\njane@test.com\n555-123-4567\n' +
      'Senior engineer with many years of professional work history.',
  );
  assert.notEqual(badFormat.score, goodFormat.score);
  assert.equal(before, synthesizeOverallScore(cats).overallScore);
}

async function testIdempotency() {
  const scores: number[] = [];
  for (let i = 0; i < 10; i++) {
    const cats = await scoreAllCategories(mockEnv, jd, 'react typescript');
    scores.push(synthesizeOverallScore(cats).overallScore);
  }
  assert.ok(scores.every((s) => s === scores[0]));
}

function testBuildAnalysisResult() {
  const result = buildAnalysisResult({
    categories: {
      skills: { score: 80, matched: ['React'], missing: [], keywordMatches: [] },
      experience: { score: 70, matched: [], missing: [], keywordMatches: [] },
      titleAlignment: { score: 90, matched: [], missing: [], keywordMatches: [] },
      measurableImpact: {
        score: 50,
        quantifiedBullets: 1,
        totalBullets: 2,
        tips: [],
      },
      keywords: { required: [], preferred: [] },
    },
    coaching: {
      categories: {
        skills: { summary: 's', matched: [], missing: [] },
        experience: { summary: 'e', matched: [], missing: [] },
        titleAlignment: { summary: 't', matched: [], missing: [] },
      },
      actions: [],
    },
    format: { score: 50, risks: ['bad'], tips: [], wordCount: 10 },
    overallScore: 79,
    scoreBreakdown: {
      skills: 80,
      experience: 70,
      titleAlignment: 90,
      weights: { skills: 0.55, experience: 0.4, titleAlignment: 0.05 },
    },
    model: 'test',
    resumeTextHash: 'a',
    jobDescriptionHash: 'b',
  });
  assert.equal(result.overallScore, 79);
  assert.equal(result.categories.measurableImpact.quantifiedBullets, 1);
}

function testWeightsSumToOne() {
  const sum =
    SCORE_WEIGHTS.skills +
    SCORE_WEIGHTS.experience +
    SCORE_WEIGHTS.titleAlignment;
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights must sum to 1, got ${sum}`);
}

async function main() {
  testWeightsSumToOne();
  await testSkillsFourOfFive();
  await testOverallWeightedSum();
  await testFormattingDoesNotAffectOverall();
  await testIdempotency();
  testBuildAnalysisResult();
  console.log('score.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
