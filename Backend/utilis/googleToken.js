const crypto = require('node:crypto');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cachedKeys = new Map();
let cacheExpiresAt = 0;

async function loadGoogleKeys() {
  let response;
  try {
    response = await fetch(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new Error('Google public keys are temporarily unavailable.');
  }
  if (!response.ok) throw new Error('Google public keys are temporarily unavailable.');

  const result = await response.json();
  if (!Array.isArray(result.keys)) throw new Error('Google public keys response is invalid.');
  cachedKeys = new Map(result.keys.map((key) => [key.kid, key]));
  const maxAge = response.headers.get('cache-control')?.match(/max-age=(\d+)/i);
  cacheExpiresAt = Date.now() + (maxAge ? Number(maxAge[1]) * 1000 : 60 * 60 * 1000);
}

async function getGooglePublicKey(keyId) {
  if (Date.now() >= cacheExpiresAt || cachedKeys.size === 0) {
    await loadGoogleKeys();
  }
  const key = cachedKeys.get(keyId);
  if (!key) throw new Error('Google token signing key was not found.');
  return crypto.createPublicKey({ key, format: 'jwk' });
}

async function verifyGoogleToken(token, clientId) {
  if (typeof token !== 'string' || typeof clientId !== 'string' || !clientId) {
    throw new Error('Google sign-in is not configured.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Google credential is invalid.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('Google credential algorithm is invalid.');
  }

  const publicKey = await getGooglePublicKey(header.kid);
  const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], 'base64url');
  if (!crypto.verify('RSA-SHA256', signingInput, publicKey, signature)) {
    throw new Error('Google credential signature is invalid.');
  }

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
    !audiences.includes(clientId) ||
    !Number.isInteger(claims.exp) ||
    claims.exp <= now ||
    !Number.isInteger(claims.iat) ||
    claims.iat > now + 60 ||
    claims.email_verified !== true ||
    typeof claims.email !== 'string' ||
    typeof claims.sub !== 'string' ||
    claims.sub.length === 0
  ) {
    throw new Error('Google credential claims are invalid.');
  }

  return {
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : claims.email,
    googleId: claims.sub
  };
}

module.exports = { verifyGoogleToken };
