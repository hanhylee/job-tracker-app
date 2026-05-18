import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseResumeFromText } from '../src/lib/resume-parse';

function testFlatResumeBullets() {
  const text = readFileSync('test/fixtures/sample-resume.txt', 'utf8');
  const parsed = parseResumeFromText(text);
  assert.ok(parsed.bullets.length >= 2, `expected >=2 bullets, got ${parsed.bullets.length}`);
  assert.ok(parsed.skills.some((s) => s.toLowerCase().includes('react')));
  assert.ok(parsed.jobTitles.length >= 1);
}

function testGoldenFlatText() {
  const f = JSON.parse(
    readFileSync('test/fixtures/golden-strong-match.json', 'utf8'),
  );
  const parsed = parseResumeFromText(f.resumeText);
  assert.ok(parsed.bullets.length >= 2);
  assert.equal(parsed.totalYearsExperience, 6);
  assert.ok(parsed.jobTitles.some((t) => t.includes('Senior Software Engineer')));
}

function testEducationSection() {
  const text = `EDUCATION
B.S. Computer Science — coursework in C, C++, multithreading`;
  const parsed = parseResumeFromText(text);
  assert.ok(parsed.education.length >= 1);
  assert.ok(
    parsed.education.some((e) => e.toLowerCase().includes('multithreading')),
  );
}

function main() {
  testFlatResumeBullets();
  testGoldenFlatText();
  testEducationSection();
  console.log('resume-parse.test.ts passed');
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
