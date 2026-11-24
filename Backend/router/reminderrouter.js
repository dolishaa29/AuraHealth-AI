const express = require("express");
const auth = require("../middleware/user");
const multer = require("multer");
const { prescriptionLimiter } = require("../middleware/rateLimit");
const { scanPrescription } = require("../service/prescriptionscan");
const {
  getReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  getToday,
  logDose,
} = require("../service/reminderservice");
const router = express.Router();
const uploadPrescription = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
}).single("photo");

router.get("/reminders/today", auth, getToday);
router.post("/reminders/dose", auth, logDose);
router.post("/reminders/scan", auth, prescriptionLimiter, (req, res, next) => {
  uploadPrescription(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ msg: "Choose a photo no larger than 5 MB." });
    }
    if (err) return res.status(400).json({ msg: "Upload one prescription photo." });
    next();
  });
}, scanPrescription);

router.get("/reminders", auth, getReminders);
router.post("/reminders", auth, addReminder);
router.put("/reminders/:id", auth, updateReminder);
router.delete("/reminders/:id", auth, deleteReminder);

module.exports = router;
