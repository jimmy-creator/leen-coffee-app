import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAddressShort, isSaudiMobile, toE164 } from './address.ts';

test('short label keeps district and city', () => {
  assert.equal(
    formatAddressShort({ street: 'Al Urubah Rd', district: 'Al Olaya', city: 'Riyadh' }),
    'Al Olaya, Riyadh',
  );
});

test('every accepted Saudi mobile spelling normalizes to one E.164 value', () => {
  for (const input of ['0552148890', '552148890', '+966552148890', '966 55 214 8890']) {
    assert.equal(toE164(input), '+966552148890', input);
    assert.ok(isSaudiMobile(input), input);
  }
});

test('landlines and short numbers are rejected', () => {
  assert.equal(toE164('0112148890'), null);
  assert.equal(isSaudiMobile('05521488'), false);
});
