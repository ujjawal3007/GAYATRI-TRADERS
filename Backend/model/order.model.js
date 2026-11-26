const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String, trim: true },
      weight: { type: Number, min: 1 },
      quantity: { type: Number, required: true, min: 1 },
      ratePerKg: { type: Number, min: 0 },
      price: { type: Number, required: true, min: 0 },
      totalPrice: { type: Number, min: 0 }
    }
  ],
  customerEmail: { type: String, lowercase: true, trim: true },
  totalAmount: { type: Number, required: true },
  address: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'ONLINE'],
    default: 'COD'
  },
  paymentId: {
    type: String,
    default: null
  },
  razorpayOrderId: { type: String, index: true, sparse: true },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
