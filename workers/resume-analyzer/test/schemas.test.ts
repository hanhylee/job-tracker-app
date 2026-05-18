import assert from 'node:assert/strict';
import {
  jdRequirementsSchema,
  resumeExtractSchema,
  analysisResultSchema,
  coachingOutputSchema,
  scoreBreakdownSchema,
} from '../src/lib/analysis-types';

function testJdRequirementsSchema() {
  const parsed = jdRequirementsSchema.parse({
    skills: { requiredPhrases: ['React'], preferredPhrases: ['GraphQL'] },
    experience: {
      minYears: 5,
      seniority: 'senior',
      requiredPhrases: ['B2B SaaS'],
    },
    title: { targetPhrases: ['Senior Engineer'] },
  });
  assert.equal(parsed.skills.requiredPhrases[0], 'React');
}

function testResumeExtractSchema() {
  const parsed = resumeExtractSchema.parse({
    skills: ['Python'],
    jobTitles: ['Developer'],
    headline: 'Backend Developer',
    totalYearsExperience: 4,
    seniority: 'mid',
    bullets: [{ section: 'Experience', text: 'Built APIs' }],
    education: [],
  });
  assert.equal(parsed.totalYearsExperience, 4);
  assert.equal(parsed.seniority, 'mid');
}

function testAnalysisResultSchema() {
  const sample = {
    overallScore: 80,
    scoreBreakdown: {
      skills: 85,
      experience: 75,
      titleAlignment: 80,
      weights: { skills: 0.55, experience: 0.4, titleAlignment: 0.05 },
    },
    categories: {
      skills: {
        score: 85,
        summary: 'Good',
        matched: ['React'],
        missing: [],
      },
      experience: {
        score: 75,
        summary: 'OK',
        matched: [],
        missing: [],
      },
      titleAlignment: {
        score: 80,
        summary: 'Aligned',
        matched: [],
        missing: [],
      },
      atsFormatting: { score: 90, risks: [], tips: [], wordCount: 150 },
      measurableImpact: {
        score: 80,
        quantifiedBullets: 2,
        totalBullets: 3,
        tips: [],
      },
    },
    keywords: {
      required: [{ term: 'React', found: true, locations: ['Skills'] }],
      preferred: [],
    },
    actions: [],
    meta: {
      model: 'test',
      analyzedAt: new Date().toISOString(),
      resumeTextHash: 'a',
      jobDescriptionHash: 'b',
    },
  };
  assert.ok(analysisResultSchema.safeParse(sample).success);
  assert.ok(scoreBreakdownSchema.safeParse(sample.scoreBreakdown).success);
}

function testCoachingSchema() {
  const parsed = coachingOutputSchema.parse({
    categories: {
      skills: { summary: 's', matched: [], missing: [] },
      experience: { summary: 'e', matched: [], missing: [] },
      titleAlignment: { summary: 't', matched: [], missing: [] },
    },
    actions: [{ priority: 1, type: 'add_keyword', message: 'Add React' }],
  });
  assert.equal(parsed.actions.length, 1);
}

function main() {
  testJdRequirementsSchema();
  testResumeExtractSchema();
  testAnalysisResultSchema();
  testCoachingSchema();
  console.log('schemas.test.ts passed');
}

main();
