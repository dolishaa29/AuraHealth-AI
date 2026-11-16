let mongo = require("mongoose");

let payment = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true },
   orderId: { type: String, required: true, unique: true },
   paymentId: { type: String, default: null },
   packId: { type: String, required: true },
   credits: { type: Number, required: true },
   amount: { type: Number, required: true },
   status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
}, { timestamps: true });

payment.index({ user: 1, createdAt: -1 });

module.exports = mongo.model("payment", payment);
