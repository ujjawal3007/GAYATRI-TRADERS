const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { isValidRazorpaySignature } = require('../controller/paymentcontroller');

test('Razorpay signatures are verified against the order and payment identifiers', () => {
  const secret = 'test-secret';
  const orderId = 'order_test';
  const paymentId = 'payment_test';
  const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  assert.equal(isValidRazorpaySignature(orderId, paymentId, signature, secret), true);
  assert.equal(isValidRazorpaySignature(orderId, 'another_payment', signature, secret), false);
  assert.equal(isValidRazorpaySignature(orderId, paymentId, 'not-a-signature', secret), false);
});
