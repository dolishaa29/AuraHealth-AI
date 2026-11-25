const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    requestKey: { type: String, required: true },
    status: {
      type: String,
      enum: ["requested", "processing", "paid", "rejected"],
      default: "requested",
    },
    reference: { type: String, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 250 },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "admin" },
  },
  { timestamps: true }
);

schema.index({ doctor: 1, requestKey: 1 }, { unique: true });
schema.index({ status: 1, createdAt: -1 });
schema.index(
  { reference: 1 },
  { unique: true, partialFilterExpression: { reference: { $type: "string" } } }
);

module.exports = mongoose.model("doctorWithdrawal", schema);
