const mongoose = require("mongoose");
const Appointment = require("../model/Appointment/appointment");
const MedicineChange = require("../model/Appointment/medicineChange");
const Reminder = require("../model/reminder");
const { checkReminderData } = require("./reminderservice");
const { localDateTime } = require("../helper/reminderhelper");

const actions = new Set(["start", "stop", "change"]);
const cleanText = (value) => typeof value === "string" ? value.trim() : "";
const medicineKey = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

function findAppointment(req) {
  const { appointmentId } = req.params;
  if (!mongoose.isObjectIdOrHexString(appointmentId)) return null;
  const participant = req.doctor ? { doctorid: String(req.doctor._id) } : { userid: String(req.user._id) };
  return Appointment.findOne({ _id: appointmentId, ...participant }).select("date time").lean();
}

exports.listMedicineChanges = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const appointment = await findAppointment(req);
  if (!appointment) return res.status(404).json({ msg: "Appointment not found." });
  const changes = await MedicineChange.find({ appointment: appointment._id }).sort({ createdAt: -1, _id: -1 }).lean();
  return res.json({ changes });
};

exports.publishMedicineChange = async (req, res) => {
  const appointment = await findAppointment(req);
  if (!appointment) return res.status(404).json({ msg: "Appointment not found." });
  const scheduledAt = new Date(`${appointment.date}T${appointment.time}`).getTime();
  if (!Number.isFinite(scheduledAt) || scheduledAt > Date.now()) {
    return res.status(400).json({ msg: "Medicine changes can be published once this visit has started." });
  }

  const { action } = req.body || {};
  const medicine = cleanText(req.body?.medicine);
  const dosage = action === "stop" ? "" : cleanText(req.body?.dosage);
  const directions = cleanText(req.body?.directions);
  if (!actions.has(action)) return res.status(400).json({ msg: "Choose start, stop, or change." });
  if (!medicine || medicine.length > 120) return res.status(400).json({ msg: "Enter a medicine name of up to 120 characters." });
  if (action !== "stop" && (!dosage || dosage.length > 120)) {
    return res.status(400).json({ msg: "Enter the new dose, up to 120 characters." });
  }
  if (!directions || directions.length > 500) {
    return res.status(400).json({ msg: "Enter directions of up to 500 characters." });
  }

  const change = await MedicineChange.create({ appointment: appointment._id, action, medicine, dosage, directions });
  return res.status(201).json({ change });
};

exports.applyMedicineChange = async (req, res) => {
  const appointment = await findAppointment(req);
  const { changeId } = req.params;
  if (!appointment || !mongoose.isObjectIdOrHexString(changeId)) {
    return res.status(404).json({ msg: "Medicine change not found." });
  }

  const user = req.user._id;
  const result = await mongoose.connection.transaction(async (session) => {
    const change = await MedicineChange.findOne({ _id: changeId, appointment: appointment._id }).session(session);
    if (!change) return { status: 404, msg: "Medicine change not found." };
    if (change.status === "applied") return { change };

    let reminder;
    if (change.action === "start") {
      const check = checkReminderData({
        medicine: change.medicine,
        dosage: change.dosage,
        notes: change.directions,
        times: req.body?.times,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        timezone: req.body?.timezone,
      });
      if (check.error) return { status: 400, msg: check.error };
      if (check.data.startDate < localDateTime(check.data.timezone).date) {
        return { status: 400, msg: "Choose today or a future start date." };
      }
      const reminders = await Reminder.find({ user }).select("medicine active endDate timezone").session(session).lean();
      if (reminders.length >= 20) return { status: 409, msg: "You can have up to 20 reminders." };
      const duplicate = reminders.some((item) => item.active && medicineKey(item.medicine) === medicineKey(change.medicine)
        && (!item.endDate || item.endDate >= localDateTime(check.data.timezone).date));
      if (duplicate) return { status: 409, msg: "You already have an active reminder for this medicine." };
      reminder = new Reminder({ ...check.data, user });
    } else {
      const { reminderId } = req.body || {};
      if (!mongoose.isObjectIdOrHexString(reminderId)) return { status: 400, msg: "Choose a reminder to update." };
      reminder = await Reminder.findOne({ _id: reminderId, user, active: true }).session(session);
      if (!reminder || medicineKey(reminder.medicine) !== medicineKey(change.medicine)) {
        return { status: 409, msg: "Choose an active reminder with the same medicine name." };
      }
      if (change.action === "stop") reminder.active = false;
      else {
        if (reminder.endDate && reminder.endDate < localDateTime(reminder.timezone).date) {
          return { status: 409, msg: "Choose a reminder whose course is still active." };
        }
        const check = checkReminderData({
          medicine: reminder.medicine,
          dosage: change.dosage,
          notes: change.directions,
          times: req.body.times,
          startDate: reminder.startDate,
          endDate: req.body.endDate,
          timezone: reminder.timezone,
          emailAlert: reminder.emailAlert,
        });
        if (check.error) return { status: 400, msg: check.error };
        if (check.data.endDate && check.data.endDate < localDateTime(check.data.timezone).date) {
          return { status: 400, msg: "Choose today or a future end date." };
        }
        Object.assign(reminder, check.data);
      }
    }

    await reminder.save({ session });
    change.status = "applied";
    change.reminder = reminder._id;
    change.appliedAt = new Date();
    await change.save({ session });
    return { change };
  });

  if (result.status) return res.status(result.status).json({ msg: result.msg });
  return res.json({ change: result.change });
};
