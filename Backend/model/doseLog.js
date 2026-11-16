let mongo = require("mongoose");

let doseLog = mongo.Schema({
   user: { type: mongo.Schema.Types.ObjectId, ref: "user", required: true },
   reminder: { type: mongo.Schema.Types.ObjectId, ref: "reminder", required: true },
   date: { type: String, required: true },
   time: { type: String, required: true },
   status: { type: String, enum: ["taken", "skipped", null], default: null },
   emailSent: { type: Boolean, default: false },
}, { timestamps: true });

doseLog.index({ reminder: 1, date: 1, time: 1 }, { unique: true });
doseLog.index({ user: 1, date: 1 });

module.exports = mongo.model("doseLog", doseLog);
