const express = require("express");
const router = express.Router();
const { registerUser, verifyEmail, resendVerification, loginUser, googleLogin, getUsers } = require("../controller/authcontroller.js");
const { protect } = require("../middleware/authmiddleware.js");
const {admin} = require('../middleware/adminmiddleware.js');

router.post("/register", registerUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.get("/Users", protect, admin, getUsers);

module.exports = router;
