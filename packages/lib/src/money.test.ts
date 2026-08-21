import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcCommissionMinor, calcVatMinor, toMajorUnits, toMinorUnits } from './money.ts';

test('major/minor round-trips without float drift', () => {
  assert.equal(toMinorUnits(78.5), 7850);
  assert.equal(toMinorUnits(0.1 + 0.2), 30);
  assert.equal(toMajorUnits(7850), 78.5);
});

test('VAT is 15% of the goods+delivery base, rounded to a whole halala', () => {
  // 78.00 goods + 15.00 delivery = 93.00 -> 13.95
  assert.equal(calcVatMinor(9300), 1395);
  // Rounds rather than truncates: 33.33 * .15 = 4.9995 -> 5.00
  assert.equal(calcVatMinor(3333), 500);
});

test('commission rounds to the nearest halala', () => {
  assert.equal(calcCommissionMinor(10000, 12.5), 1250);
  assert.equal(calcCommissionMinor(3333, 12.5), 417);
});
