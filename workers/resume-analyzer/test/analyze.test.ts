import assert from 'node:assert/strict';
import { normalizeText, sha256Hex } from '../src/lib/hash';
import {
  analysisResultSchema,
  jdExtractSchema,
  resumeExtractSchema,
} from '../src/lib/analysis-types';
import { buildMatchContext, scoreFromMatches } from '../src/lib/match';
import type { CloudflareBindings } from '../src/types';

async function testHashStable() {
  const a = await sha256Hex('hello');
  const b = await sha256Hex('hello');
  assert.equal(a, b);
  assert.equal(a.length, 64);
}

function testNormalize() {
  assert.equal(normalizeText('  foo   bar  '), 'foo bar');
}

function testJdSchema() {
  const parsed = jdExtractSchema.parse({
    requiredSkills: ['TypeScript'],
    preferredSkills: [],
    mustHaveKeywords: ['React'],
    titleSignals: ['Senior Engineer'],
    tools: ['Git'],
    softSkills: [],
  });
  assert.equal(parsed.requiredSkills[0], 'TypeScript');
}

function testResumeSchema() {
  const parsed = resumeExtractSchema.parse({
    skills: ['JavaScript'],
    jobTitles: ['Developer'],
    bullets: [{ section: 'Experience', text: 'Built apps with React' }],
    education: ['B.S. Computer Science'],
  });
  assert.equal(parsed.bullets.length, 1);
}

function testAnalysisResultSchema() {
  const sample = {
    schemaVersion: 1 as const,
    overallScore: 72,
    categories: {
      skills: {
        score: 70,
        summary: 'Good',
        matched: ['React'],
        missing: ['GraphQL'],
      },
      experience: {
        score: 75,
        summary: 'Solid',
        matched: [],
        missing: [],
      },
      titleAlignment: {
        score: 80,
        summary: 'Aligned',
        matched: [],
        missing: [],
      },
      atsFormatting: { score: 90, risks: [] },
    },
    keywords: {
      required: [{ term: 'React', found: true, locations: ['Skills'] }],
      preferred: [],
    },
    actions: [
      {
        priority: 1,
        type: 'add_keyword' as const,
        message: 'Add GraphQL',
      },
    ],
    meta: {
      model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
      analyzedAt: new Date().toISOString(),
      resumeTextHash: 'abc',
      jobDescriptionHash: 'def',
    },
  };
  assert.ok(analysisResultSchema.safeParse(sample).success);
}

function testScoreFromMatches() {
  const score = scoreFromMatches([
    { term: 'a', found: true, locations: [] },
    { term: 'b', found: false, locations: [] },
  ]);
  assert.equal(score, 50);
}

async function testKeywordMatchWithoutEmbeddings() {
  const mockEnv = {
    AI: {
      run: async () => {
        throw new Error('embeddings disabled in unit test');
      },
    },
  } as unknown as Pick<CloudflareBindings, 'AI'>;

  const { keywordMatches } = await buildMatchContext(
    mockEnv,
    {
      requiredSkills: ['TypeScript'],
      preferredSkills: ['Drizzle'],
      mustHaveKeywords: ['React'],
      titleSignals: [],
      tools: [],
      softSkills: [],
    },
    {
      skills: ['TypeScript', 'React'],
      jobTitles: ['Software Engineer'],
      bullets: [
        {
          section: 'Experience',
          text: 'Built REST APIs with Node.js',
        },
      ],
      education: [],
    },
  );

  const react = keywordMatches.required.find((m) => m.term === 'React');
  assert.equal(react?.found, true);
  assert.equal(react?.matchType, 'exact');

  const node = keywordMatches.required.find((m) => m.term === 'TypeScript');
  assert.equal(node?.found, true);
}

async function main() {
  await testHashStable();
  testNormalize();
  testJdSchema();
  testResumeSchema();
  testAnalysisResultSchema();
  testScoreFromMatches();
  await testKeywordMatchWithoutEmbeddings();
  console.log('All resume-analyzer unit tests passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
