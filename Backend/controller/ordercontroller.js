const Order = require('../model/order.model');
const sendEmail = require('../utilis/sendEmail');
const { CheckoutValidationError, validateCheckout } = require('../utilis/validateCheckout');

const ORDER_STATUSES = new Set(['pending', 'shipped', 'delivered', 'cancelled']);

const createOrder = async (req, res) => {
  let checkout;
  try {
    checkout = validateCheckout({ ...req.body, paymentMethod: 'COD' });
    const order = await Order.create({
      customerEmail: checkout.customerEmail,
      items: checkout.items,
      totalAmount: checkout.totalAmount,
      address: checkout.address,
      paymentMethod: 'COD',
      paymentStatus: 'pending',
      status: 'pending'
    });

    try {
      await sendEmail(
        checkout.customerEmail,
        'Order Confirmed - Gayatri Traders',
        `Your order ${order._id} is confirmed. Total: ₹${order.totalAmount}. We will contact you about delivery.`
      );
    } catch (emailError) {
      console.error('Order confirmation email failed:', emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Order received. The team will confirm delivery details.',
      orderId: order._id,
      totalAmount: order.totalAmount
    });
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Could not create COD order:', error);
    return res.status(500).json({ success: false, message: 'Could not save your order.' });
  }
};

const myOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 })
      .limit(100);
    return res.json(orders);
  } catch (error) {
    console.error('Could not fetch user orders:', error);
    return res.status(500).json({ message: 'Could not fetch orders.' });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 })
      .limit(500);
    return res.json(orders);
  } catch (error) {
    console.error('Could not fetch orders:', error);
    return res.status(500).json({ message: 'Could not fetch orders.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.has(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid order status.' });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Could not update order status:', error);
    return res.status(500).json({ success: false, message: 'Could not update order status.' });
  }
};

module.exports = { createOrder, myOrders, getOrders, updateOrderStatus };
