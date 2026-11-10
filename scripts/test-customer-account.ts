import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeReturnPath } from '../lib/customer-account/config';
import { pkceChallenge, sealJson, unsealJson } from '../lib/customer-account/session-crypto';
import { idTokenNonceMatches } from '../lib/customer-account/tokens';

const secret = 'x'.repeat(40);

test('sealed cookies round-trip and reject tampering, wrong secret or wrong purpose', () => {
  const sealed = sealJson({ accessToken: 'abc', expiresAt: 1 }, secret, 'session');
  assert.deepEqual(unsealJson(sealed, secret, 'session'), { accessToken: 'abc', expiresAt: 1 });
  assert.equal(unsealJson(sealed, 'y'.repeat(40), 'session'), null);
  assert.equal(unsealJson(sealed, secret, 'oauth'), null);
  const parts = sealed.split('.');
  parts[2] = `${parts[2].slice(0, -2)}AA`;
  assert.equal(unsealJson(parts.join('.'), secret, 'session'), null);
  assert.equal(unsealJson(undefined, secret, 'session'), null);
});

test('return paths must be same-site relative paths', () => {
  assert.equal(safeReturnPath('/cart'), '/cart');
  assert.equal(safeReturnPath('//evil.example'), '/account');
  assert.equal(safeReturnPath('https://evil.example'), '/account');
  assert.equal(safeReturnPath('/\\evil.example'), '/account');
  assert.equal(safeReturnPath(null), '/account');
});

test('PKCE challenge is the base64url SHA-256 of the verifier (RFC 7636 example)', () => {
  assert.equal(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('id_token nonce must match the one sent at sign-in', () => {
  const token = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;
  assert.equal(idTokenNonceMatches(token({ nonce: 'n1' }), 'n1'), true);
  assert.equal(idTokenNonceMatches(token({ nonce: 'n2' }), 'n1'), false);
  assert.equal(idTokenNonceMatches(null, 'n1'), false);
  assert.equal(idTokenNonceMatches('garbage', 'n1'), false);
});
