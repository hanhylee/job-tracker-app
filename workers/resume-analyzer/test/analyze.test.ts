import assert from 'node:assert/strict';
import { normalizeText, sha256Hex } from '../src/lib/hash';

async function testHashStable() {
  const a = await sha256Hex('hello');
  const b = await sha256Hex('hello');
  assert.equal(a, b);
  assert.equal(a.length, 64);
}

function testNormalize() {
  assert.equal(normalizeText('  foo   bar  '), 'foo bar');
}

async function main() {
  await testHashStable();
  testNormalize();
  console.log('analyze.test.ts passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
