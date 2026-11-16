const express = require("express");
const auth = require("../middleware/user");
const { getWallet, createOrder, verifyPayment, razorpayWebhook } = require("../service/creditservice");
const router = express.Router();

router.get("/credits", auth, getWallet);
router.post("/credits/order", auth, createOrder);
router.post("/credits/verify", auth, verifyPayment);

router.post("/razorpay/webhook", razorpayWebhook);

module.exports = router;
