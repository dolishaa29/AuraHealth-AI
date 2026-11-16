const express = require("express");
const auth = require("../middleware/user");
const {
  getReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  getToday,
  logDose,
} = require("../service/reminderservice");
const router = express.Router();

router.get("/reminders/today", auth, getToday);
router.post("/reminders/dose", auth, logDose);

router.get("/reminders", auth, getReminders);
router.post("/reminders", auth, addReminder);
router.put("/reminders/:id", auth, updateReminder);
router.delete("/reminders/:id", auth, deleteReminder);

module.exports = router;
