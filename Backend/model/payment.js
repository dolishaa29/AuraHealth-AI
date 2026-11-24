let mongo = require("mongoose");

let payment = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true },
   orderId: { type: String, required: true, unique: true },
   paymentId: { type: String, default: null },
   packId: { type: String, required: true },
   credits: { type: Number, required: true },
   amount: { type: Number, required: true },
   status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
   consultationBundle: { type: Boolean, default: false },
   liveFunding: { type: Boolean, default: false },
   aiCredits: { type: Number, default: 0 },
   bookingCreditsRemaining: { type: Number, default: 0, min: 0 },
   maxDoctorFeePaise: { type: Number, default: 0, min: 0 },
   fundingBlocked: { type: Boolean, default: false },
}, { timestamps: true });

payment.index({ user: 1, createdAt: -1 });
payment.index({ paymentId: 1 });
payment.index({ user: 1, status: 1, liveFunding: 1, bookingCreditsRemaining: 1 });

module.exports = mongo.model("payment", payment);
