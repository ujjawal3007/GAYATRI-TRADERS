const Order = require('../model/order.model');
const Product = require('../model/product.model');

// 1. Complete Dashboard Overview + Low Stock Alert
exports.getDashboardOverview = async (req, res) => {
  try {
    const overallStats = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalCollectedRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] }
          },
          pendingRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] }
          },
          totalOrders: { $sum: 1 },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    const monthlyTrend = await Order.aggregate([
      { $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const lowStockProducts = await Product.find({ stock: { $lt: 20 } }).select('name stock price');

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('address customerEmail items totalAmount paymentMethod paymentStatus status createdAt');

    const stats = overallStats[0] || {
      totalCollectedRevenue: 0,
      pendingRevenue: 0,
      totalOrders: 0,
      deliveredOrders: 0
    };

    res.status(200).json({
      success: true,
      stats,
      monthlyTrend,
      lowStockProducts,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Dashboard error', error: error.message });
  }
};

// 2. Revenue Collection Report
exports.getRevenueCollection = async (req, res) => {
  try {
    const { paymentStatus, startDate, endDate } = req.query;
    const query = { status: { $ne: 'cancelled' } };

    if (paymentStatus && !['paid', 'pending', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Choose a valid payment status.' });
    }
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (Boolean(startDate) !== Boolean(endDate)) {
      return res.status(400).json({ success: false, message: 'Provide both start and end dates.' });
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return res.status(400).json({ success: false, message: 'Choose a valid date range.' });
      }
      query.createdAt = {
        $gte: start,
        $lte: new Date(end.setHours(23, 59, 59, 999))
      };
    }

    const transactions = await Order.find(query)
      .sort({ createdAt: -1 })
      .select('address customerEmail items totalAmount paymentMethod paymentStatus status createdAt')
      .limit(500);

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Revenue error', error: error.message });
  }
};

// 3. Collect COD Payment (Mark Paid)
exports.markPaymentCollected = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order nahi mila' });
    if (order.paymentMethod !== 'COD') {
      return res.status(400).json({ success: false, message: 'Only COD orders can be collected here.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be collected.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(409).json({ success: false, message: 'This order is already paid.' });
    }
    order.paymentStatus = 'paid';
    order.paymentId = `COD_PAID_${Date.now()}`;
    await order.save();
    res.status(200).json({ success: true, message: 'COD Payment Collected!', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update error', error: error.message });
  }
};

// 4. Update Order Delivery Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Choose a valid order status.' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order nahi mila' });
    res.status(200).json({ success: true, message: `Order status updated to ${status}`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Status update error', error: error.message });
  }
};
