let mongo = require("mongoose");

let reminder = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true },
   medicine: { type: String, required: true, trim: true },
   dosage: { type: String, default: null, trim: true },
   times: { type: [String], required: true },
   startDate: { type: String, required: true },
   endDate: { type: String, default: null },
   notes: { type: String, default: null, trim: true },
   emailAlert: { type: Boolean, default: false },
   timezone: { type: String, default: "Asia/Kolkata" },
   active: { type: Boolean, default: true },
}, { timestamps: true });

reminder.index({ user: 1 });

reminder.index({ active: 1, emailAlert: 1, timezone: 1, times: 1 });

module.exports = mongo.model("reminder", reminder);
