const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../model/user.model');

test('Google-authenticated users do not require a local password', async () => {
  const user = new User({
    name: 'Test Customer',
    email: 'customer@example.com',
    authProvider: 'google',
    googleId: 'google-subject',
    verified: true
  });
  await assert.doesNotReject(user.validate());
});

test('Password accounts require a password', async () => {
  const user = new User({
    name: 'Test Customer',
    email: 'customer@example.com',
    authProvider: 'password'
  });
  await assert.rejects(user.validate(), /password/);
});
