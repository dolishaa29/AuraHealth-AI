const Appointment = require("../model/Appointment/appointment");
const Rating = require("../model/doctorRating");
const Payment = require("../model/payment");
const CreditTransaction = require("../model/creditTransaction");
const { addDays, localDateTime } = require("../helper/reminderhelper");

const timezone = "Asia/Kolkata";
const allowedRanges = new Set(["7", "30", "90"]);

function readRange(res, days = "30") {
  res.set("Cache-Control", "no-store");
  if (!allowedRanges.has(days)) {
    res.status(400).json({ msg: "Choose 7, 30, or 90 days." });
    return null;
  }
  const end = localDateTime(timezone).date;
  const start = addDays(end, 1 - Number(days));
  return {
    start,
    end,
    days: Number(days),
    dates: { $gte: start, $lte: end },
    timestamps: { $gte: new Date(`${start}T00:00:00+05:30`), $lt: new Date(`${addDays(end, 1)}T00:00:00+05:30`) },
  };
}

const dayOf = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone } });
const total = (rows, key) => rows.reduce((sum, row) => sum + (row[key] || 0), 0);

function dailyRows(range, bookingRows, otherRows, otherDefaults) {
  const bookings = new Map(bookingRows.map(({ _id, bookings }) => [_id, bookings]));
  const other = new Map(otherRows.map(({ _id, ...values }) => [_id, values]));
  return Array.from({ length: range.days }, (_, i) => {
    const date = addDays(range.start, i);
    return { date, bookings: bookings.get(date) ?? 0, ...otherDefaults, ...other.get(date) };
  });
}

exports.doctorAnalytics = async (req, res) => {
  if (req.authRole !== "doctor") return res.status(401).json({ msg: "Sign in again as a doctor to view analytics." });
  if (req.doctor.doctorstatus === "block") return res.status(403).json({ msg: "This doctor account is blocked." });
  const range = readRange(res, req.query.days);
  if (!range) return;
  const doctorId = String(req.doctor._id);
  const [bookingData, ratingRows, nextWeek] = await Promise.all([
    Appointment.aggregate([
      { $match: { doctorid: doctorId, date: range.dates } },
      { $facet: {
        daily: [{ $group: { _id: "$date", bookings: { $sum: 1 } } }],
        patients: [
          { $match: { userid: { $type: "string", $ne: "" } } },
          { $group: { _id: "$userid", bookings: { $sum: 1 } } },
          { $group: { _id: null, unique: { $sum: 1 }, repeat: { $sum: { $cond: [{ $gt: ["$bookings", 1] }, 1, 0] } } } },
        ],
      } },
    ]),
    Rating.aggregate([
      { $match: { doctorId, date: range.timestamps, rating: { $type: "number", $gte: 1, $lte: 5 } } },
      { $group: { _id: dayOf("$date"), reviews: { $sum: 1 }, stars: { $sum: "$rating" } } },
      { $project: { reviews: 1, stars: 1, rating: { $divide: ["$stars", "$reviews"] } } },
    ]),
    Appointment.countDocuments({ doctorid: doctorId, date: { $gt: range.end, $lte: addDays(range.end, 7) } }),
  ]);
  const bookings = bookingData[0]?.daily ?? [];
  const patients = bookingData[0]?.patients[0];
  const reviews = total(ratingRows, "reviews");
  const trend = dailyRows(range, bookings, ratingRows.map(({ _id, reviews, rating }) => ({ _id, reviews, rating })), { reviews: 0, rating: null });
  return res.json({
    start: range.start, end: range.end, trend,
    summary: {
      bookings: total(bookings, "bookings"), patients: patients?.unique ?? 0,
      repeatPatients: patients?.repeat ?? 0, nextWeek, reviews, rating: reviews ? total(ratingRows, "stars") / reviews : null,
    },
  });
};

exports.adminAnalytics = async (req, res) => {
  const range = readRange(res, req.query.days);
  if (!range) return;
  const [bookings, payments, creditUsage, nextWeek] = await Promise.all([
    Appointment.aggregate([
      { $match: { date: range.dates } },
      { $group: { _id: "$date", bookings: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: "paid", updatedAt: range.timestamps } },
      { $group: { _id: dayOf("$updatedAt"), paidOrders: { $sum: 1 }, amount: { $sum: "$amount" }, creditsPurchased: { $sum: "$credits" } } },
    ]),
    CreditTransaction.aggregate([
      { $match: { type: "debit", createdAt: range.timestamps } },
      { $group: { _id: null, creditsDebited: { $sum: "$amount" } } },
    ]),
    Appointment.countDocuments({ date: { $gt: range.end, $lte: addDays(range.end, 7) } }),
  ]);
  const trend = dailyRows(range, bookings, payments, { paidOrders: 0, amount: 0, creditsPurchased: 0 });
  return res.json({
    start: range.start, end: range.end, trend,
    summary: {
      bookings: total(bookings, "bookings"), nextWeek, paidOrders: total(payments, "paidOrders"),
      amount: total(payments, "amount"), creditsPurchased: total(payments, "creditsPurchased"), creditsDebited: creditUsage[0]?.creditsDebited ?? 0,
    },
  });
};
