import assert from 'node:assert/strict';
import {
  expandTermVariants,
  fuzzyIncludes,
  matchTerms,
  placementBonus,
  applySemanticMatches,
  scoreFromMatches,
  resumeCorpus,
  findLocations,
  stemVariants,
} from '../src/lib/match';
import { parseResumeFromText } from '../src/lib/resume-parse';
import type { ResumeExtract } from '../src/lib/analysis-types';
import type { CloudflareBindings } from '../src/types';

const resume: ResumeExtract = {
  skills: ['TypeScript', 'React'],
  jobTitles: ['Software Engineer'],
  headline: null,
  totalYearsExperience: 4,
  seniority: 'mid',
  bullets: [
    { section: 'Experience', text: 'Built REST APIs with Node.js and Kubernetes' },
  ],
  education: [],
};

function testStemVariants() {
  // -ation → base verb
  assert.ok(stemVariants('automation').includes('automate'));
  assert.ok(stemVariants('automation').includes('automating'));
  // -ing → base
  assert.ok(stemVariants('troubleshooting').includes('troubleshoot'));
  // JD says "troubleshoot", resume says "troubleshooting" → should match
  assert.ok(fuzzyIncludes('responsible for troubleshooting network issues', 'troubleshoot'));
  // JD says "automate", resume says "automation" → should match
  assert.ok(fuzzyIncludes('scripting and automation of deployments', 'automate'));
}

function testHyphenAndDotNormalization() {
  // Dot stripping: node.js ↔ nodejs
  const nodejsVariants = expandTermVariants('node.js');
  assert.ok(nodejsVariants.includes('nodejs'));
  assert.ok(fuzzyIncludes('built with nodejs and express', 'node.js'));

  // Hyphen stripping: multi-threading ↔ multithreading
  const multiVariants = expandTermVariants('multi-threading');
  assert.ok(multiVariants.includes('multithreading'));
  assert.ok(fuzzyIncludes('experience with multithreading', 'multi-threading'));
}

function testAcronymFallbackToSemantic() {
  // K8s ↔ Kubernetes is no longer a hardcoded alias — handled by semantic matching.
  // The fuzzy/exact layer should NOT match these by default.
  const corpus = 'experience with kubernetes clusters';
  assert.equal(fuzzyIncludes(corpus, 'K8s'), false, 'K8s should not fuzzy-match kubernetes without alias');
}

function testSlashSeparatedSkills() {
  const variants = expandTermVariants('C/C++');
  assert.ok(variants.includes('c++'));
  assert.ok(variants.includes('c'));
  const corpus =
    'coursework: c, c++, pthreads. relevant: multithreading and systems programming.';
  const matches = matchTerms(['C/C++', 'multithreading'], resume, corpus);
  assert.equal(matches.find((m) => m.term === 'C/C++')?.found, true);
  assert.equal(matches.find((m) => m.term === 'multithreading')?.found, true);
}

function testEducationLocation() {
  const resumeText = `EDUCATION
B.S. CS — coursework in C, C++, multithreading`;
  const parsed = parseResumeFromText(resumeText);
  const corpus = resumeCorpus(resumeText);
  const matches = matchTerms(['C/C++', 'multithreading'], parsed, corpus);
  assert.equal(matches.find((m) => m.term === 'C/C++')?.found, true);
  const locs = findLocations(parsed, 'multithreading');
  assert.ok(locs.includes('Education'));
}

function testExactAndFuzzyMatch() {
  const corpus = 'typescript react node.js experience';
  const matches = matchTerms(['React', 'GraphQL'], resume, corpus);
  const react = matches.find((m) => m.term === 'React');
  assert.equal(react?.found, true);
  const gql = matches.find((m) => m.term === 'GraphQL');
  assert.equal(gql?.found, false);
}

function testPlacementBonus() {
  const matches = matchTerms(['Node.js'], resume, 'node.js rest apis');
  const bonus = placementBonus(matches);
  assert.ok(bonus >= 5);
  assert.ok(bonus <= 15);
}

function testScoreFromMatches() {
  assert.equal(
    scoreFromMatches([
      { term: 'a', found: true, locations: [] },
      { term: 'b', found: false, locations: [] },
    ]),
    50,
  );
  assert.equal(scoreFromMatches([]), 100);
}

async function testSemanticCap() {
  const mockEnv = {
    AI: {
      run: async (_model: string, input: { text?: string[] }) => {
        const n = input.text?.length ?? 0;
        return {
          data: Array.from({ length: n }, (_, i) => {
            const v = new Array(8).fill(0);
            v[0] = i < 3 ? 1 : 0.5;
            return v;
          }),
        };
      },
    },
  } as unknown as Pick<CloudflareBindings, 'AI'>;

  const terms = Array.from({ length: 10 }, (_, i) => ({
    term: `skill${i}`,
    found: false,
    locations: [] as string[],
  }));
  const { matches } = await applySemanticMatches(mockEnv, terms, resume);
  const semanticCount = matches.filter((m) => m.matchType === 'semantic').length;
  assert.ok(semanticCount <= 3);
}

async function main() {
  testStemVariants();
  testHyphenAndDotNormalization();
  testAcronymFallbackToSemantic();
  testSlashSeparatedSkills();
  testEducationLocation();
  testExactAndFuzzyMatch();
  testPlacementBonus();
  testScoreFromMatches();
  await testSemanticCap();
  console.log('match.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
