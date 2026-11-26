const Razorpay = require('razorpay');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Order = require('../model/order.model');
const { CheckoutValidationError, validateCheckout } = require('../utilis/validateCheckout');

function isValidRazorpaySignature(orderId, paymentId, signature, keySecret) {
  if (
    typeof orderId !== 'string' ||
    typeof paymentId !== 'string' ||
    typeof signature !== 'string' ||
    !/^[a-f\d]{64}$/i.test(signature)
  ) {
    return false;
  }
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

const createdOrder = async (req, res) => {
  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret } = process.env;
  if (!keyId || !keySecret) {
    return res.status(503).json({ success: false, message: 'Online payment is not configured.' });
  }

  try {
    const checkout = validateCheckout({ ...req.body, paymentMethod: 'ONLINE' });
    const receipt = crypto.randomBytes(12).toString('hex');
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const paymentOrder = await razorpay.orders.create({
      amount: checkout.totalAmount * 100,
      currency: 'INR',
      receipt
    });

    const order = await Order.create({
      customerEmail: checkout.customerEmail,
      items: checkout.items,
      totalAmount: checkout.totalAmount,
      address: checkout.address,
      paymentMethod: 'ONLINE',
      paymentStatus: 'pending',
      status: 'pending',
      razorpayOrderId: paymentOrder.id
    });

    return res.status(201).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: paymentOrder.id,
      keyId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency
    });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Could not create online payment order:', error.message);
    return res.status(502).json({ success: false, message: 'Could not start online payment.' });
  }
};

const verifyPayment = async (req, res) => {
  const {
    orderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature
  } = req.body;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(503).json({ success: false, message: 'Online payment verification is not configured.' });
  }
  if (
    typeof orderId !== 'string' ||
    typeof razorpayOrderId !== 'string' ||
    typeof razorpayPaymentId !== 'string' ||
    typeof razorpaySignature !== 'string'
  ) {
    return res.status(400).json({ success: false, message: 'Payment verification details are invalid.' });
  }

  if (!isValidRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret)) {
    return res.status(400).json({ success: false, message: 'Payment signature verification failed.' });
  }

  try {
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: 'Order reference is invalid.' });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentMethod !== 'ONLINE' || order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Payment does not match this order.' });
    }
    if (order.paymentStatus === 'paid') {
      if (order.paymentId === razorpayPaymentId) {
        return res.status(200).json({ success: true, orderId: order._id });
      }
      return res.status(409).json({ success: false, message: 'This order has already been paid.' });
    }

    order.paymentStatus = 'paid';
    order.paymentId = razorpayPaymentId;
    await order.save();
    return res.status(200).json({ success: true, orderId: order._id });
  } catch (error) {
    console.error('Could not verify online payment:', error.message);
    return res.status(500).json({ success: false, message: 'Could not confirm payment.' });
  }
};

module.exports = { createdOrder, verifyPayment, isValidRazorpaySignature };
