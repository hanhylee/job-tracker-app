import assert from 'node:assert/strict';
import { isQuantifiedBullet, analyzeMeasurableImpact } from '../src/lib/impact';

function testQuantifiedBullet() {
  assert.ok(isQuantifiedBullet('Increased revenue by 20% year over year'));
  assert.ok(isQuantifiedBullet('Managed team of 8 engineers'));
  assert.ok(!isQuantifiedBullet('Responsible for building web applications'));
}

function testAnalyzeImpact() {
  const result = analyzeMeasurableImpact(`EXPERIENCE
- Grew active users 40%
- Wrote documentation`);
  assert.equal(result.quantifiedBullets, 1);
  assert.equal(result.totalBullets, 2);
  assert.equal(result.score, 50);
}

function main() {
  testQuantifiedBullet();
  testAnalyzeImpact();
  console.log('impact.test.ts passed');
}

main();
