import assert from 'node:assert/strict';
import { checkResumeFormatting } from '../src/lib/format-check';
import { synthesizeOverallScore } from '../src/lib/score';
import type { AllCategoryScores } from '../src/lib/analysis-types';

function testGoodResumeLowRisk() {
  // Build a text with enough words (300+) to avoid the word count risk
  const bullets = Array.from(
    { length: 30 },
    (_, i) => `Implemented feature ${i} using modern tools and best practices resulting in measurable improvements.`,
  ).join('\n');
  const text = [
    'Jane Doe',
    'jane@example.com',
    '(555) 123-4567',
    'Experience',
    bullets,
    'Education',
    'Skills',
    'Python, Django, REST APIs',
  ].join('\n');
  const result = checkResumeFormatting(text);
  assert.ok(result.risks.length === 0, `unexpected risks: ${result.risks.join(', ')}`);
  assert.ok(result.score >= 78);
  assert.ok(result.wordCount >= 300);
}

function testWordCount() {
  const short = checkResumeFormatting('hello world');
  assert.equal(short.wordCount, 2);
  assert.ok(short.risks.some((r) => r.includes('short')));

  // 300–499 words → should fire "adding more detail" tip
  const words300 = Array.from({ length: 296 }, (_, i) => `word${i}`).join(' ');
  const medium = checkResumeFormatting(`Experience\nskills\neducation\njane@test.com\n${words300}`);
  assert.ok(medium.wordCount >= 300 && medium.wordCount < 500);
  assert.ok(medium.tips.some((t) => t.includes('word') || t.includes('Word')));
}

function testMissingContactAndSections() {
  const result = checkResumeFormatting('short resume text only');
  assert.ok(result.risks.length >= 2);
  assert.ok(result.score < 90);
}

function testFormattingDoesNotChangeOverall() {
  const categories: AllCategoryScores = {
    skills: { score: 80, matched: [], missing: [], keywordMatches: [] },
    experience: { score: 70, matched: [], missing: [], keywordMatches: [] },
    titleAlignment: { score: 90, matched: [], missing: [], keywordMatches: [] },
    measurableImpact: { score: 50, quantifiedBullets: 1, totalBullets: 2, tips: [] },
    keywords: { required: [], preferred: [] },
  };
  const before = synthesizeOverallScore(categories).overallScore;
  checkResumeFormatting('bad');
  checkResumeFormatting('good experience education skills jane@test.com 555-123-4567');
  const after = synthesizeOverallScore(categories).overallScore;
  assert.equal(before, after);
}

function main() {
  testGoodResumeLowRisk();
  testWordCount();
  testMissingContactAndSections();
  testFormattingDoesNotChangeOverall();
  console.log('format-check.test.ts passed');
}

main();
