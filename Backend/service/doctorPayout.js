const mongoose = require("mongoose");
const Doctor = require("../model/doctor");
const Appointment = require("../model/Appointment/appointment");
const Withdrawal = require("../model/doctorWithdrawal");
const Payment = require("../model/payment");
const { BOOKING_CREDITS, DOCTOR_FEE_PAISE, usablePayment } = require("../config/consultationPricing");
const { localDateTime } = require("../helper/reminderhelper");
const notifyAdmin = require("../helper/adminNotification");

const HOLD_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PAISE = 100000000;
const earningsFields = { date: 1, time: 1, doctorid: 1, doctormail: 1, payoutFeePaise: 1, payoutCompletedAt: 1, payoutHeld: 1 };
const fundedAppointment = { payoutFeePaise: { $gt: 0 }, payoutFundingPayment: { $type: "objectId" } };
const completedAppointment = { payoutCompletedAt: { $type: "date" } };
const withdrawalFields = "doctor amountPaise status reference note createdAt reviewedAt";
const withdrawalTransitions = new Map([
  ["processing", "requested"],
  ["paid", "processing"],
  ["rejected", { $in: ["requested", "processing"] }],
]);
const validAmount = (amount, min) => Number.isSafeInteger(amount) && amount >= min && amount <= MAX_PAISE;
const fail = (status, msg) => ({ status, msg });
const reply = (res, value) => value.msg ? res.status(value.status).json({ msg: value.msg }) : res.json(value);
const fundingLookup = [
  { $lookup: {
    from: Payment.collection.name, localField: "payoutFundingPayment", foreignField: "_id",
    pipeline: [{ $match: usablePayment },
      { $project: { maxDoctorFeePaise: 1 } }],
    as: "funding",
  } },
  { $unwind: "$funding" },
  { $match: { $expr: { $gte: ["$funding.maxDoctorFeePaise", "$payoutFeePaise"] } } },
];

function fundedVisits(match, sort, limit) {
  return Appointment.aggregate([
    { $match: { ...match, ...fundedAppointment } },
    { $sort: sort },
    ...fundingLookup,
    { $limit: limit },
    { $project: earningsFields },
  ]);
}

async function balances(doctorId, session = null) {
  const cutoff = new Date(Date.now() - HOLD_MS);
  const [earnings = {}] = await Appointment.aggregate([
    { $match: { doctorid: String(doctorId), ...completedAppointment, ...fundedAppointment } },
    ...fundingLookup,
    { $group: {
      _id: null,
      cleared: { $sum: { $cond: [{ $and: [{ $ne: ["$payoutHeld", true] }, { $lte: ["$payoutCompletedAt", cutoff] }] }, "$payoutFeePaise", 0] } },
      total: { $sum: "$payoutFeePaise" },
    } },
  ]).session(session);
  const [withdrawals = {}] = await Withdrawal.aggregate([
    { $match: { doctor: doctorId, status: { $in: ["requested", "processing", "paid"] } } },
    { $group: {
      _id: null,
      reserved: { $sum: { $cond: [{ $ne: ["$status", "paid"] }, "$amountPaise", 0] } },
      paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amountPaise", 0] } },
    } },
  ]).session(session);
  const cleared = earnings.cleared ?? 0;
  const reserved = withdrawals.reserved ?? 0;
  const paid = withdrawals.paid ?? 0;
  return { cleared, pending: (earnings.total ?? 0) - cleared, available: Math.max(0, cleared - reserved - paid), reserved, paid };
}

function lockDoctor(doctorId, session) {
  return Doctor.updateOne({ _id: doctorId }, { $inc: { payoutRevision: 1 } }, { session });
}

exports.doctorPayoutAccess = (req, res, next) => {
  if (req.authRole !== "doctor") return res.status(401).json({ msg: "Sign in again as a doctor." });
  if (req.doctor.doctorstatus === "block") return res.status(403).json({ msg: "This doctor account is blocked." });
  res.set("Cache-Control", "no-store");
  next();
};

exports.getDoctorPayout = async (req, res) => {
  const id = req.doctor._id;
  const [summary, earnings, withdrawals] = await Promise.all([
    balances(id),
    fundedVisits({ doctorid: String(id), ...completedAppointment }, { payoutCompletedAt: -1 }, 30),
    Withdrawal.find({ doctor: id }).select(withdrawalFields).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  return res.json({ summary, earnings, withdrawals, fee: DOCTOR_FEE_PAISE });
};

exports.requestWithdrawal = async (req, res) => {
  const { amountPaise, requestKey } = req.body || {};
  if (!validAmount(amountPaise, 1) || typeof requestKey !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestKey)) {
    return res.status(400).json({ msg: "Enter a valid amount and request identifier." });
  }
  const doctor = req.doctor._id;
  const result = await mongoose.connection.transaction(async (session) => {
    await lockDoctor(doctor, session);
    const existing = await Withdrawal.findOne({ doctor, requestKey }).select(withdrawalFields).session(session);
    if (existing) return existing.amountPaise === amountPaise ? { withdrawal: existing } : fail(409, "That request already has a different amount.");
    const summary = await balances(doctor, session);
    if (amountPaise > summary.available) return fail(409, "That amount exceeds your available earnings.");
    const withdrawal = new Withdrawal({ doctor, amountPaise, requestKey });
    await withdrawal.save({ session });
    return { withdrawal, created: true };
  });
  if (result.created) {
    await notifyAdmin("Doctor withdrawal awaiting review",
      `A doctor requested a withdrawal of ₹${(amountPaise / 100).toFixed(2)}. Request ID: ${result.withdrawal._id}.`, "/Admindashboard");
    return res.json({ withdrawal: result.withdrawal });
  }
  return reply(res, result);
};

exports.getAdminPayoutQueue = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const cutoff = localDateTime("Asia/Kolkata", new Date(Date.now() - 30 * 60 * 1000));
  const eligible = { $or: [{ date: { $lt: cutoff.date } }, { date: cutoff.date, time: { $lte: cutoff.time } }] };
  const [visits, completed, pending, reviewed] = await Promise.all([
    fundedVisits({ payoutCompletedAt: null, payoutDeclinedAt: null, ...eligible }, { date: 1, time: 1 }, 40),
    fundedVisits(completedAppointment, { payoutCompletedAt: -1 }, 30),
    Withdrawal.find({ status: { $in: ["requested", "processing"] } }).select(`${withdrawalFields} reviewedBy`).sort({ createdAt: 1 }).limit(40).populate("doctor", "name email").lean(),
    Withdrawal.find({ status: { $in: ["paid", "rejected"] } }).select(withdrawalFields).sort({ reviewedAt: -1 }).limit(30).populate("doctor", "name email").lean(),
  ]);
  return res.json({ visits, completed, pending: pending.map(({ reviewedBy, ...item }) => ({
    ...item, assignedToYou: String(reviewedBy) === String(req.admin._id),
  })), reviewed, fee: DOCTOR_FEE_PAISE });
};

exports.reviewVisit = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};
  if (!mongoose.isObjectIdOrHexString(id) || !["complete", "no-show", "hold", "release"].includes(action)) {
    return res.status(400).json({ msg: "Choose a valid visit and action." });
  }
  const appointment = await Appointment.findOne({ _id: id, ...fundedAppointment })
    .select({ ...earningsFields, payoutFundingPayment: 1 }).lean();
  if (!appointment || !mongoose.isObjectIdOrHexString(appointment.doctorid)) return res.status(404).json({ msg: "Funded visit not found." });
  const now = new Date();
  const scheduled = Date.parse(`${appointment.date}T${appointment.time}:00+05:30`);
  if (!Number.isFinite(scheduled) || now.getTime() < scheduled + 30 * 60 * 1000) {
    return res.status(409).json({ msg: "Review this visit after the scheduled slot ends." });
  }
  try {
    const result = await mongoose.connection.transaction(async (session) => {
      await lockDoctor(appointment.doctorid, session);
      const funding = {
        ...usablePayment,
        _id: appointment.payoutFundingPayment,
        maxDoctorFeePaise: { $gte: appointment.payoutFeePaise },
      };
      if (action === "complete" && !await Payment.exists(funding).session(session)) {
        return fail(409, "This visit no longer has valid payment backing.");
      }
      const initialReview = action === "complete" || action === "no-show";
      const condition = { _id: id, payoutDeclinedAt: null, payoutCompletedAt: initialReview ? null : { $type: "date" } };
      const updates = {
        complete: { payoutCompletedAt: now, payoutHeld: false },
        "no-show": { payoutDeclinedAt: now },
        hold: { payoutHeld: true },
        release: { payoutHeld: false },
      };
      const update = { ...updates[action], payoutReviewedBy: req.admin._id };
      const visit = await Appointment.findOneAndUpdate(condition, { $set: update }, { new: true, session }).select(earningsFields);
      if (!visit) return fail(409, "The visit has already been reviewed or is awaiting completion.");
      if (action === "no-show") {
        await Payment.updateOne(funding, { $inc: { bookingCreditsRemaining: BOOKING_CREDITS } }, { session });
      }
      if (action === "hold") {
        const summary = await balances(new mongoose.Types.ObjectId(appointment.doctorid), session);
        if (summary.cleared < summary.paid + summary.reserved) {
          throw Object.assign(new Error("This hold would affect earnings already reserved or paid."), { code: "PAYOUT_HOLD_CONFLICT" });
        }
      }
      return { visit };
    });
    return reply(res, result);
  } catch (err) {
    if (err.code === "PAYOUT_HOLD_CONFLICT") return res.status(409).json({ msg: err.message });
    throw err;
  }
};

exports.reviewWithdrawal = async (req, res) => {
  const { id } = req.params;
  const { status, reference, note } = req.body || {};
  const allowedStatus = withdrawalTransitions.get(status);
  if (!mongoose.isObjectIdOrHexString(id) || !allowedStatus
    || (status === "paid" && (typeof reference !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{2,99}$/.test(reference.trim())))
    || (status === "rejected" && (typeof note !== "string" || !note.trim() || note.length > 250))) {
    return res.status(400).json({ msg: "Enter a valid payment reference or a rejection reason." });
  }
  const item = await Withdrawal.findById(id).select("doctor").lean();
  if (!item) return res.status(404).json({ msg: "Withdrawal not found." });

  try {
    const result = await mongoose.connection.transaction(async (session) => {
      await lockDoctor(item.doctor, session);
      const withdrawal = await Withdrawal.findOne({ _id: id, status: allowedStatus }).session(session);
      if (!withdrawal) return fail(409, "This withdrawal has already been reviewed.");
      if (withdrawal.status === "processing" && String(withdrawal.reviewedBy) !== String(req.admin._id)) {
        return fail(409, "This transfer is assigned to another admin.");
      }
      if (status !== "rejected") {
        const summary = await balances(item.doctor, session);
        if (summary.cleared - summary.paid < summary.reserved) {
          return fail(409, "Cleared earnings no longer cover reserved withdrawals. Review the holds before recording payment.");
        }
      }
      if (status === "paid") withdrawal.reference = reference.trim().toUpperCase();
      if (status === "rejected") withdrawal.note = note.trim();
      withdrawal.status = status;
      withdrawal.reviewedAt = new Date();
      withdrawal.reviewedBy = req.admin._id;
      await withdrawal.save({ session });
      return { withdrawal };
    });
    return reply(res, result);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ msg: "That payment reference is already recorded." });
    throw err;
  }
};
