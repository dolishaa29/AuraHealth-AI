const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Payment = require("../model/payment");
const CreditTransaction = require("../model/creditTransaction");
const {
  CREDIT_COSTS,
  CREDIT_PACKS,
  findPack,
  getBalance,
  addCredits,
} = require("../helper/credithelper");

let razorpay = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

function sameSignature(expected, received) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(received || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isValidPaymentSignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  return sameSignature(expected, signature);
}

async function markPaidAndAddCredits(orderId, paymentId) {
  const session = await mongoose.startSession();
  let balance = null;

  try {
    await session.withTransaction(async () => {
      balance = null;

      const payment = await Payment.findOneAndUpdate(
        { orderId: orderId, status: { $ne: "paid" } },
        { $set: { status: "paid", paymentId: paymentId } },
        { returnDocument: "after", session: session }
      );

      if (!payment) {
        return;
      }

      const pack = findPack(payment.packId);
      const packName = pack ? pack.name : payment.packId;
      balance = await addCredits(payment.user, payment.credits, "Bought " + packName + " pack", orderId, session);
    });
  } finally {
    await session.endSession();
  }

  return balance;
}

exports.getWallet = async (req, res) => {
  const user = req.user;

  try {
    const balance = await getBalance(user._id);
    const transactions = await CreditTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.status(200).json({
      success: true,
      balance: balance,
      costs: CREDIT_COSTS,
      packs: CREDIT_PACKS,
      transactions: transactions,
      paymentsEnabled: getRazorpay() !== null,
    });
  } catch (err) {
    console.log("Loading wallet failed:", err.message);
    return res.status(500).json({ success: false, msg: "Couldn't load your credits. Please try again." });
  }
};

exports.createOrder = async (req, res) => {
  const user = req.user;
  const pack = findPack(req.body.packId);

  if (!pack) {
    return res.status(400).json({ success: false, msg: "Please choose a valid credit pack" });
  }

  const rzp = getRazorpay();
  if (!rzp) {
    return res.status(503).json({ success: false, msg: "Payments are not set up yet. Please try again later." });
  }

  try {
    const order = await rzp.orders.create({
      amount: pack.price * 100,
      currency: "INR",
      receipt: "credits_" + Date.now(),
      notes: { userId: String(user._id), packId: pack.id },
    });

    await Payment.create({
      user: user._id,
      orderId: order.id,
      packId: pack.id,
      credits: pack.credits,
      amount: order.amount,
    });

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      pack: pack,
      user: { name: user.name, email: user.email, contact: user.contact ? String(user.contact) : "" },
    });
  } catch (err) {
    console.log("Creating Razorpay order failed:", err.error || err.message);
    return res.status(502).json({ success: false, msg: "Couldn't start the payment. Please try again." });
  }
};

exports.verifyPayment = async (req, res) => {
  const user = req.user;
  const orderId = req.body.razorpay_order_id;
  const paymentId = req.body.razorpay_payment_id;
  const signature = req.body.razorpay_signature;

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ success: false, msg: "Payment details are missing" });
  }

  if (!getRazorpay()) {
    return res.status(503).json({ success: false, msg: "Payments are not set up yet." });
  }

  const payment = await Payment.findOne({ orderId: orderId, user: user._id });
  if (!payment) {
    return res.status(404).json({ success: false, msg: "Order not found" });
  }

  if (!isValidPaymentSignature(orderId, paymentId, signature)) {
    return res.status(400).json({ success: false, msg: "Payment could not be verified" });
  }

  try {
    await markPaidAndAddCredits(orderId, paymentId);
    const balance = await getBalance(user._id);
    return res.status(200).json({
      success: true,
      msg: payment.credits + " credits added to your wallet",
      balance: balance,
    });
  } catch (err) {
    console.log("Adding purchased credits failed:", err.message);
    return res.status(500).json({
      success: false,
      msg: "Payment received but credits weren't added yet. They will be added automatically in a few minutes.",
    });
  }
};

exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false });
  }

  const expected = crypto.createHmac("sha256", secret).update(req.rawBody || "").digest("hex");
  if (!sameSignature(expected, req.headers["x-razorpay-signature"])) {
    return res.status(400).json({ success: false });
  }

  const event = req.body.event;
  const paymentEntity = req.body.payload?.payment?.entity;

  try {
    if ((event === "payment.captured" || event === "order.paid") && paymentEntity) {
      await markPaidAndAddCredits(paymentEntity.order_id, paymentEntity.id);
    }

    if (event === "payment.failed" && paymentEntity) {
      await Payment.updateOne(
        { orderId: paymentEntity.order_id, status: "created" },
        { $set: { status: "failed", paymentId: paymentEntity.id } }
      );
    }
  } catch (err) {

    console.log("Razorpay webhook failed:", err.message);
    return res.status(500).json({ success: false });
  }

  return res.status(200).json({ success: true });
};
