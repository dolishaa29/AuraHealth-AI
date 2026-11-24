const mongoose = require("mongoose");

const medicineChange = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: "appointmentnew", required: true },
  action: { type: String, enum: ["start", "stop", "change"], required: true },
  medicine: { type: String, required: true, maxlength: 120 },
  dosage: { type: String, maxlength: 120, default: "" },
  directions: { type: String, required: true, maxlength: 500 },
  status: { type: String, enum: ["pending", "applied"], default: "pending" },
  reminder: { type: mongoose.Schema.Types.ObjectId, ref: "reminder" },
  appliedAt: Date,
}, { timestamps: true });

medicineChange.index({ appointment: 1, createdAt: -1 });

module.exports = mongoose.model("medicineChange", medicineChange);
