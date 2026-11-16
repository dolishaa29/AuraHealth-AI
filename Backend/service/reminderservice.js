const mongoose = require("mongoose");
const Reminder = require("../model/reminder");
const DoseLog = require("../model/doseLog");
const {
  isValidTime,
  isValidDate,
  isValidTimezone,
  addDays,
  localDateTime,
  runsOnDate,
} = require("../helper/reminderhelper");

const MAX_REMINDERS = 20;
const MAX_TIMES_PER_DAY = 6;

function readReminderBody(body) {
  const medicine = String(body.medicine || "").trim();
  const dosage = String(body.dosage || "").trim();
  const notes = String(body.notes || "").trim();
  const startDate = String(body.startDate || "");
  const endDate = body.endDate ? String(body.endDate) : null;
  const timezone = body.timezone ? String(body.timezone) : "Asia/Kolkata";

  if (medicine === "") {
    return { error: "Please enter the medicine name" };
  }

  if (!Array.isArray(body.times) || body.times.length === 0) {
    return { error: "Add at least one time" };
  }

  const times = [...new Set(body.times.map(String))].sort();

  if (times.length > MAX_TIMES_PER_DAY) {
    return { error: "You can add up to " + MAX_TIMES_PER_DAY + " times a day" };
  }

  for (const time of times) {
    if (!isValidTime(time)) {
      return { error: "Invalid time: " + time };
    }
  }

  if (!isValidDate(startDate)) {
    return { error: "Please choose a valid start date" };
  }

  if (endDate !== null && (!isValidDate(endDate) || endDate < startDate)) {
    return { error: "End date must be on or after the start date" };
  }

  if (!isValidTimezone(timezone)) {
    return { error: "Invalid time zone" };
  }

  return {
    data: {
      medicine: medicine,
      dosage: dosage === "" ? null : dosage,
      notes: notes === "" ? null : notes,
      times: times,
      startDate: startDate,
      endDate: endDate,
      timezone: timezone,
      emailAlert: Boolean(body.emailAlert),
    },
  };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.getReminders = async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id }).sort({ active: -1, createdAt: -1 });
  return res.status(200).json({ success: true, reminders: reminders });
};

exports.addReminder = async (req, res) => {
  const user = req.user;

  const { error, data } = readReminderBody(req.body);
  if (error) {
    return res.status(400).json({ success: false, msg: error });
  }

  const count = await Reminder.countDocuments({ user: user._id });
  if (count >= MAX_REMINDERS) {
    return res.status(400).json({ success: false, msg: "You can have up to " + MAX_REMINDERS + " reminders" });
  }

  const reminder = await Reminder.create({ ...data, user: user._id });
  return res.status(201).json({ success: true, msg: "Reminder added", reminder: reminder });
};

exports.updateReminder = async (req, res) => {
  const user = req.user;
  const id = req.params.id;

  if (!isValidId(id)) {
    return res.status(404).json({ success: false, msg: "Reminder not found" });
  }

  const reminder = await Reminder.findOne({ _id: id, user: user._id });
  if (!reminder) {
    return res.status(404).json({ success: false, msg: "Reminder not found" });
  }

  const onlyToggle = Object.keys(req.body).length === 1 && typeof req.body.active === "boolean";

  if (onlyToggle) {
    reminder.active = req.body.active;
  } else {
    const { error, data } = readReminderBody(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error });
    }
    Object.assign(reminder, data);
    if (typeof req.body.active === "boolean") {
      reminder.active = req.body.active;
    }
  }

  await reminder.save();
  return res.status(200).json({ success: true, msg: "Reminder updated", reminder: reminder });
};

exports.deleteReminder = async (req, res) => {
  const user = req.user;
  const id = req.params.id;

  if (!isValidId(id)) {
    return res.status(404).json({ success: false, msg: "Reminder not found" });
  }

  const result = await Reminder.deleteOne({ _id: id, user: user._id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, msg: "Reminder not found" });
  }

  await DoseLog.deleteMany({ reminder: id });
  return res.status(200).json({ success: true, msg: "Reminder deleted" });
};

exports.getToday = async (req, res) => {
  const user = req.user;
  const date = isValidDate(req.query.date) ? req.query.date : localDateTime("Asia/Kolkata").date;

  const reminders = await Reminder.find({ user: user._id, active: true });
  const logs = await DoseLog.find({ user: user._id, date: date });

  const statusOf = {};
  for (const log of logs) {
    statusOf[log.reminder + "|" + log.time] = log.status;
  }

  const doses = [];
  for (const reminder of reminders) {
    if (!runsOnDate(reminder, date)) {
      continue;
    }
    for (const time of reminder.times) {
      doses.push({
        reminderId: reminder._id,
        medicine: reminder.medicine,
        dosage: reminder.dosage,
        notes: reminder.notes,
        time: time,
        status: statusOf[reminder._id + "|" + time] || null,
      });
    }
  }
  doses.sort((a, b) => a.time.localeCompare(b.time));

  const weekStart = addDays(date, -7);
  const yesterday = addDays(date, -1);
  let scheduled = 0;
  for (const reminder of reminders) {
    for (let day = weekStart; day <= yesterday; day = addDays(day, 1)) {
      if (runsOnDate(reminder, day)) {
        scheduled = scheduled + reminder.times.length;
      }
    }
  }
  const taken = await DoseLog.countDocuments({
    user: user._id,
    reminder: { $in: reminders.map((r) => r._id) },
    date: { $gte: weekStart, $lte: yesterday },
    status: "taken",
  });

  return res.status(200).json({
    success: true,
    date: date,
    doses: doses,
    adherence: {
      scheduled: scheduled,
      taken: Math.min(taken, scheduled),
      percent: scheduled === 0 ? null : Math.min(100, Math.round((taken / scheduled) * 100)),
    },
  });
};

exports.logDose = async (req, res) => {
  const user = req.user;
  const { reminderId, date, time } = req.body;
  const status = req.body.status === undefined ? null : req.body.status;

  if (!isValidId(reminderId) || !isValidDate(date) || !isValidTime(time)) {
    return res.status(400).json({ success: false, msg: "Invalid dose details" });
  }

  if (!["taken", "skipped", null].includes(status)) {
    return res.status(400).json({ success: false, msg: "Status must be taken or skipped" });
  }

  const reminder = await Reminder.findOne({ _id: reminderId, user: user._id });
  if (!reminder || !reminder.times.includes(time) || !runsOnDate(reminder, date)) {
    return res.status(404).json({ success: false, msg: "This dose isn't part of your schedule" });
  }

  await DoseLog.updateOne(
    { reminder: reminder._id, date: date, time: time },
    { $set: { status: status }, $setOnInsert: { user: user._id } },
    { upsert: true }
  );

  return res.status(200).json({ success: true, msg: status ? "Marked as " + status : "Dose reset" });
};
