const mongoose = require("mongoose");
const SymptomEntry = require("../model/symptomEntry");

function validateEntry(body) {
  const { symptom, severity, notes = "" } = body || {};

  const valid =
    typeof symptom === "string" &&
    symptom.trim() &&
    symptom.length <= 120 &&
    Number.isInteger(severity) &&
    severity >= 1 &&
    severity <= 5 &&
    typeof notes === "string" &&
    notes.length <= 1000;

  if (!valid) {
    return null;
  }

  return {
    symptom: symptom.trim(),
    severity,
    notes: notes.trim(),
  };
}

function publicEntry(entry) {
  return {
    _id: entry._id,
    symptom: entry.symptom,
    severity: entry.severity,
    notes: entry.notes,
    createdAt: entry.createdAt,
  };
}

exports.listSymptoms = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const entries = await SymptomEntry.find({ user: req.user._id })
    .select("symptom severity notes createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .limit(50)
    .lean();
  return res.json({ entries });
};

exports.addSymptom = async (req, res) => {
  const input = validateEntry(req.body);

  if (!input) {
    return res.status(400).json({
      msg: "Enter a symptom, choose a severity from 1 to 5, and keep notes within 1,000 characters.",
    });
  }

  const entry = await SymptomEntry.create({
    user: req.user._id,
    ...input,
  });
  return res.status(201).json({ entry: publicEntry(entry) });
};

exports.deleteSymptom = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ msg: "Journal entry not found." });
  }

  const result = await SymptomEntry.deleteOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!result.deletedCount) {
    return res.status(404).json({ msg: "Journal entry not found." });
  }
  return res.sendStatus(204);
};
