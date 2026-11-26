const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authmiddleware');
const { admin } = require('../middleware/adminmiddleware');

const {
  getDashboardOverview,
  getRevenueCollection,
  markPaymentCollected,
  updateOrderStatus
} = require('../controller/analysticscontroller');

router.use(protect, admin);

router.get('/dashboard', getDashboardOverview);
router.get('/revenue-collection', getRevenueCollection);
router.patch('/collect-payment/:id', markPaymentCollected);
router.patch('/order-status/:id', updateOrderStatus);

module.exports = router;
