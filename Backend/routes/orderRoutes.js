const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authmiddleware');
const { admin } = require('../middleware/adminmiddleware');
const { createOrder, myOrders, getOrders, updateOrderStatus } = require('../controller/ordercontroller');

router.post('/', createOrder);
router.get('/myorders', protect, myOrders);
router.get('/', protect, admin, getOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
