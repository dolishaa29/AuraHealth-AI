const mongoose = require("mongoose");

const cancelledAppointment = new mongoose.Schema({
  userid: { type: String, required: true, index: true },
  doctorid: { type: String, required: true, index: true },
  name: String,
  email: String,
  doctormail: String,
  date: String,
  time: String,
  cancelledAt: { type: Date, required: true },
  refundedCredits: { type: Number, required: true, min: 0 },
});

module.exports = mongoose.model("cancelledAppointment", cancelledAppointment);
