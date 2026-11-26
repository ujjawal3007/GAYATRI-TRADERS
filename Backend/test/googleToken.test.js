const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyGoogleToken } = require('../utilis/googleToken');

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

test('Google ID tokens require a trusted signature, audience, and verified email', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = 'test-key';
  jwk.alg = 'RS256';
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'max-age=3600' }
  });

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://accounts.google.com',
    aud: 'test-client-id',
    exp: now + 300,
    iat: now,
    email_verified: true,
    email: 'CUSTOMER@example.com',
    name: 'Test Customer',
    sub: 'google-subject'
  };
  const header = encode({ alg: 'RS256', kid: jwk.kid });
  const payload = encode(claims);
  const signed = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signed), privateKey).toString('base64url');
  const credential = `${signed}.${signature}`;

  try {
    const identity = await verifyGoogleToken(credential, 'test-client-id');
    assert.equal(identity.email, 'customer@example.com');
    assert.equal(identity.googleId, 'google-subject');
    await assert.rejects(verifyGoogleToken(credential, 'wrong-client-id'), /claims are invalid/);
  } finally {
    global.fetch = originalFetch;
  }
});
