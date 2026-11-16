let mongo = require("mongoose");

let creditTransaction = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true },
   type: { type: String, enum: ["credit", "debit"], required: true },
   amount: { type: Number, required: true, min: 1 },
   reason: { type: String, required: true },
   balanceAfter: { type: Number, required: true },
   orderId: { type: String, default: null },
}, { timestamps: true });

creditTransaction.index({ user: 1, createdAt: -1 });

module.exports = mongo.model("creditTransaction", creditTransaction);
