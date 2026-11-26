const express = require("express");
const { createdOrder, verifyPayment } = require("../controller/paymentcontroller");
const router = express.Router();

router.post("/order", createdOrder);
router.post("/verify", verifyPayment);

module.exports = router;