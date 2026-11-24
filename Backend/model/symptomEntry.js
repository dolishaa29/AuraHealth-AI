const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  symptom: { type: String, required: true, trim: true, maxlength: 120 },
  severity: { type: Number, required: true, min: 1, max: 5 },
  notes: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

schema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model("symptomEntry", schema);
