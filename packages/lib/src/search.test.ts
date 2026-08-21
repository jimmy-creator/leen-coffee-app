import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesQuery, normalizeQuery } from './search.ts';

test('alef and teh-marbuta variants collapse so Arabic search is forgiving', () => {
  assert.equal(normalizeQuery('قهوة'), normalizeQuery('قهوه'));
  assert.equal(normalizeQuery('أحمد'), normalizeQuery('احمد'));
  assert.ok(matchesQuery('محمصة كيفا', 'محمصه'));
});

test('diacritics and tatweel are ignored', () => {
  assert.ok(matchesQuery('خَوْلاني', 'خولاني'));
  assert.ok(matchesQuery('قـــهوة', 'قهوة'));
});

test('an empty query matches everything', () => {
  assert.ok(matchesQuery('anything', '   '));
});
