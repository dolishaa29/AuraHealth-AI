let rec4=require("../model/Appointment/appointrequest");
let rec5=require("../model/Appointment/appointment");
let rec=require("../model/doctor");
const Report = require("../model/report");
const { connection, isValidObjectId } = require("mongoose");
const Payment = require("../model/payment");
const { DOCTOR_FEE_PAISE } = require("../config/consultationPricing");
const DoseLog = require("../model/doseLog");
const { addDays, isValidDate, isValidTime, localDateTime } = require("../helper/reminderhelper");
const { CREDIT_COSTS } = require("../helper/credithelper");

exports.appointrequest = (req, res) => res.status(410).json({
  success: false, msg: "Choose a time on Book a slot to schedule a consultation.",
});

exports.viewappointment=async(req,res)=>
{
    const admin = req.admin;
    if (!admin) {
        return res.status(403).json({success: false,msg:'Access denied. Admin privileges required.'});
    }

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);

    if (!page || !limit) {
        let appointments=await rec4.find();
        return res.status(200).json({success: true,msg:'appointment requests fetched successfully',appointments});
    }

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
        rec4.find().skip(skip).limit(limit),
        rec4.countDocuments(),
    ]);
    return res.status(200).json({
        success: true,
        msg: 'appointment requests fetched successfully',
        appointments,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}

exports.appointmentstatus=async(req,res)=>
{
    const { id, status } = req.body || {};
    if(!isValidObjectId(id) || status !== "rejected")
    {
        return res.status(400).json({success: false,msg:'Invalid status'});
    }
    let appointment=await rec4.findOneAndUpdate({_id:id,status:"pending"},{status:status});
    if(appointment)
    {
        return res.status(200).json({success: true,msg:'appointment status updated successfully'});
    }
    else
    {
        return res.status(404).json({success: false,msg:'appointment not found'});
    }
}

exports.approveappointment = async (req, res) => {
  const { id, date, time } = req.body || {};
  if (!isValidObjectId(id) || !isValidDate(date) || !isValidTime(time)
    || Date.parse(`${date}T${time}:00+05:30`) <= Date.now()) {
    return res.status(400).json({ success: false, msg: "Choose a pending request and a future date and time." });
  }
  try {
    const approved = await connection.transaction(async (session) => {
      const request = await rec4.findOneAndUpdate({ _id: id, status: "pending" }, { $set: { status: "approved" } }, { session });
      if (!request) return false;
      const { userid, name, email, doctorid, doctormail, description } = request;
      const appointment = new rec5({ userid, name, email, doctorid, doctormail, description, date, time });
      await appointment.save({ session });
      return true;
    });
    if (!approved) return res.status(409).json({ success: false, msg: "This request is no longer pending." });
    return res.status(201).json({ success: true, msg: "Appointment approved." });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, msg: "This slot is no longer available." });
    throw err;
  }
};

function generateTimeSlots(bookedTimes) {
  const allTimes = [
    "01:22","09:00","09:30","10:00","10:30","11:00","11:30",
    "12:00","12:30","13:00","13:30","14:00","14:30",
    "15:00","15:30","16:00","16:30"
  ];
  const slots = [];
  for (let i = 0; i < allTimes.length; i++) {
    slots.push({ time: allTimes[i], available: !bookedTimes.includes(allTimes[i]) });
  }
  return slots;
}

exports.getAvailableSlots = async (req, res) => {
  const user = req.user;
  const { doctorid, date } = req.query;

  if (!doctorid || !date) {
    return res.status(400).json({ success: false, msg: 'doctorid and date are required' });
  }

  const doctor = await rec.findOne({ _id: doctorid });
  if (!doctor) {
    return res.status(404).json({ success: false, msg: 'Doctor not found' });
  }

  const userAppointmentOnDate = await rec5.findOne({ userid: user._id.toString(), date });
  if (userAppointmentOnDate) {
    return res.status(200).json({
      success: true,
      slots: [],
      bookingCost: CREDIT_COSTS.slotBooking,
      hasAppointmentToday: true,
      msg: 'You already have an appointment on this date'
    });
  }

  const booked = await rec5.find({ doctorid, date });
  const bookedTimes = booked.map(a => a.time);
  const slots = generateTimeSlots(bookedTimes);

  return res.status(200).json({ success: true, slots, bookingCost: CREDIT_COSTS.slotBooking, hasAppointmentToday: false });
};

exports.bookSlot = async (req, res) => {
  const user = req.user;
  const { doctorid, date, time, description } = req.body || {};

  if (!isValidObjectId(doctorid) || !isValidDate(date) || !isValidTime(time)
    || typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ success: false, msg: 'Choose a doctor, date and time, and enter a reason for the visit.' });
  }
  if (Date.parse(`${date}T${time}:00+05:30`) <= Date.now()
    || !generateTimeSlots([]).some((slot) => slot.time === time)) {
    return res.status(400).json({ success: false, msg: 'Choose a future appointment slot.' });
  }

  const doctor = await rec.findOne({ _id: doctorid });
  if (!doctor) {
    return res.status(404).json({ success: false, msg: 'Doctor not found' });
  }
  if (doctor.doctorstatus === "block") {
    return res.status(403).json({ success: false, msg: "This doctor is unavailable for booking." });
  }

  const cost = CREDIT_COSTS.slotBooking;
  try {
    const result = await connection.transaction(async (session) => {
      const existing = await rec5.exists({ userid: String(user._id), date }).session(session);
      if (existing) return { status: 409, msg: "You already have an appointment on this date." };
      const taken = await rec5.exists({ doctorid, date, time }).session(session);
      if (taken) return { status: 409, msg: "This slot was just taken. Please choose another." };
      const backing = await Payment.findOneAndUpdate({
        user: user._id, status: "paid", liveFunding: true, fundingBlocked: { $ne: true },
        bookingCreditsRemaining: { $gte: cost }, maxDoctorFeePaise: { $gte: DOCTOR_FEE_PAISE },
      }, { $inc: { bookingCreditsRemaining: -cost } }, { sort: { createdAt: 1, _id: 1 }, session });
      if (!backing) return { status: 402, msg: `Booking requires ${cost} consultation credits from a verified live purchase.` };
      const appointment = new rec5({
        userid: String(user._id), name: user.name, email: user.email,
        doctorid, doctormail: doctor.email, description: description.trim(), date, time,
        payoutFeePaise: DOCTOR_FEE_PAISE, payoutFundingPayment: backing._id,
      });
      await appointment.save({ session });
      return { status: 201, msg: "Appointment booked successfully!" };
    });
    return res.status(result.status).json({ success: result.status === 201, msg: result.msg });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, msg: "The slot or date is no longer available. No consultation credits were used." });
    }
    throw err;
  }
};

exports.updateBriefingSharing = async (req, res) => {
  const { appointmentId } = req.params;
  const { shareBriefingRecords } = req.body || {};
  if (!isValidObjectId(appointmentId) || typeof shareBriefingRecords !== "boolean") {
    return res.status(400).json({ msg: "Invalid sharing request." });
  }

  const result = await rec5.updateOne(
    { _id: appointmentId, userid: String(req.user._id) },
    { $set: { shareBriefingRecords } }
  );
  if (!result.matchedCount) return res.status(404).json({ msg: "Appointment not found." });
  return res.json({ shareBriefingRecords });
};

exports.getBriefing = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { appointmentId } = req.params;
  if (!isValidObjectId(appointmentId)) {
    return res.status(404).json({ msg: "Appointment not found." });
  }

  const appointment = await rec5.findOne({ _id: appointmentId, doctorid: String(req.doctor._id) })
    .select("description userid shareBriefingRecords").lean();
  if (!appointment) return res.status(404).json({ msg: "Appointment not found." });

  const briefing = {
    reason: appointment.description || "",
    recordsShared: appointment.shareBriefingRecords === true,
    reports: [],
    adherence: null,
  };
  if (!briefing.recordsShared || !isValidObjectId(appointment.userid)) return res.json(briefing);

  const today = localDateTime("Asia/Kolkata").date;
  const startDate = addDays(today, -7);
  const endDate = addDays(today, -1);
  const [reports, doses] = await Promise.all([
    Report.find({ user: appointment.userid })
      .select("title summary fileUrl createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    DoseLog.find({
      user: appointment.userid,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ["taken", "skipped"] },
    }).select("status -_id").lean(),
  ]);

  const taken = doses.filter((dose) => dose.status === "taken").length;
  briefing.reports = reports;
  briefing.adherence = { startDate, endDate, taken, skipped: doses.length - taken };
  return res.json(briefing);
};
