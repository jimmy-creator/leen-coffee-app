import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  daysSinceRoast,
  isWithinFreshnessWindow,
  lineTotalMinor,
  variantPriceMinor,
} from './coffee.ts';

test('bag size scales sub-linearly from the 250 g reference price', () => {
  assert.equal(variantPriceMinor(7800, 250), 7800);
  assert.equal(variantPriceMinor(7800, 500), 14430);
  assert.equal(variantPriceMinor(7800, 1000), 26520);
});

test('line total multiplies the variant price, not the base price', () => {
  assert.equal(lineTotalMinor(7800, 500, 2), 28860);
});

test('freshness window closes after 21 days and rejects future roasts', () => {
  const now = new Date('2026-08-21T00:00:00Z');
  assert.equal(daysSinceRoast('2026-08-18T00:00:00Z', now), 3);
  assert.equal(isWithinFreshnessWindow('2026-08-18T00:00:00Z', now), true);
  assert.equal(isWithinFreshnessWindow('2026-07-25T00:00:00Z', now), false);
  assert.equal(isWithinFreshnessWindow('2026-09-01T00:00:00Z', now), false);
});
