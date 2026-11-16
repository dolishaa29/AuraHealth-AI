const nodemailer = require("nodemailer");
const Reminder = require("../model/reminder");
const DoseLog = require("../model/doseLog");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS_KEY,
  },
});

function isValidTime(time) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(time));
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return false;
  }
  const parsed = new Date(date + "T00:00:00Z");
  return !isNaN(parsed) && parsed.toISOString().slice(0, 10) === date;
}

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function addDays(date, days) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function localDateTime(timezone, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);

  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: get("year") + "-" + get("month") + "-" + get("day"),
    time: get("hour") + ":" + get("minute"),
  };
}

function runsOnDate(reminder, date) {
  if (date < reminder.startDate) {
    return false;
  }
  if (reminder.endDate && date > reminder.endDate) {
    return false;
  }
  return true;
}

async function claimEmail(reminder, date, time) {
  try {
    const result = await DoseLog.updateOne(
      { reminder: reminder._id, date: date, time: time, status: null, emailSent: { $ne: true } },
      { $set: { emailSent: true }, $setOnInsert: { user: reminder.user._id } },
      { upsert: true }
    );
    return result.modifiedCount === 1 || result.upsertedCount === 1;
  } catch (err) {
    if (err.code === 11000) {
      return false;
    }
    throw err;
  }
}

async function sendReminderEmail(reminder, time) {
  const user = reminder.user;
  const dose = reminder.dosage ? " (" + reminder.dosage + ")" : "";
  const notes = reminder.notes ? "\nNote: " + reminder.notes : "";
  const link = process.env.FRONTEND_URL ? "\n\nMark it as taken: " + process.env.FRONTEND_URL + "/reminders" : "";

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: user.email,
    subject: "Time for your " + reminder.medicine + " 💊",
    text: "Hi " + (user.name || "there") + ",\n\nIt's " + time + ". Time to take " + reminder.medicine + dose + "." + notes + link + "\n\nStay healthy,\nAuraHealth",
  });
}

async function sendDueReminderEmails() {
  const timezones = await Reminder.distinct("timezone", { active: true, emailAlert: true });
  const now = new Date();

  for (const timezone of timezones) {

    for (const at of [now, new Date(now.getTime() - 60 * 1000)]) {
      const { date, time } = localDateTime(timezone, at);

      const reminders = await Reminder.find({
        active: true,
        emailAlert: true,
        timezone: timezone,
        times: time,
      }).populate("user", "name email");

      for (const reminder of reminders) {
        if (!reminder.user || !reminder.user.email || !runsOnDate(reminder, date)) {
          continue;
        }

        const claimed = await claimEmail(reminder, date, time);
        if (!claimed) {
          continue;
        }

        try {
          await sendReminderEmail(reminder, time);
        } catch (err) {
          console.log("Reminder email failed:", err.message);

          await DoseLog.updateOne({ reminder: reminder._id, date: date, time: time }, { $set: { emailSent: false } });
        }
      }
    }
  }
}

function startReminderScheduler() {
  let running = false;

  const timer = setInterval(async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      await sendDueReminderEmails();
    } catch (err) {
      console.log("Reminder scheduler error:", err.message);
    } finally {
      running = false;
    }
  }, 60 * 1000);

  console.log("Reminder scheduler started");
  return () => clearInterval(timer);
}

module.exports = {
  isValidTime,
  isValidDate,
  isValidTimezone,
  addDays,
  localDateTime,
  runsOnDate,
  startReminderScheduler,
};
