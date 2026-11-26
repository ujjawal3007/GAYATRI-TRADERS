const test = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../model/order.model');
const { validateCheckout } = require('../utilis/validateCheckout');

const checkout = {
  customer: {
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '+91 98879 09288',
    street: '12 Rice Market Road',
    city: 'Tijara',
    postalCode: '301411'
  },
  items: [{ name: '1121 Basmati Rice', weight: 5, quantity: 2, price: 1 }],
  totalAmount: 1
};

test('checkout prices are calculated from the server catalog', () => {
  const result = validateCheckout(checkout);
  assert.equal(result.totalAmount, 1600);
  assert.equal(result.items[0].price, 800);
  assert.equal(result.items[0].totalPrice, 1600);
  assert.equal(result.customerEmail, 'customer@example.com');
  assert.equal(result.address.phone, '919887909288');
});

test('checkout rejects unlisted products and unsupported payment methods', () => {
  assert.throws(() => validateCheckout({
    ...checkout,
    items: [{ name: 'Unknown Rice', weight: 5, quantity: 1 }]
  }), /unlisted rice variety/);
  assert.throws(() => validateCheckout({ ...checkout, paymentMethod: 'BANK_TRANSFER' }), /Choose COD or online payment/);
});

test('orders can be persisted for guest COD checkout', async () => {
  const orderData = validateCheckout(checkout);
  const order = new Order({
    ...orderData,
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    status: 'pending'
  });
  await assert.doesNotReject(order.validate());
  assert.equal(order.user, null);
});
