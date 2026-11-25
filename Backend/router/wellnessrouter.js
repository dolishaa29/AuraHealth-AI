const express = require("express");
const multer = require("multer");
const auth = require("../middleware/user");
const { wellnessLimiter } = require("../middleware/rateLimit");
const {
  planMeals,
  scanMeal,
  scanMedicineLabel,
} = require("../service/wellnessMeals");
const {
  listSymptoms,
  addSymptom,
  deleteSymptom,
} = require("../service/wellnessSymptoms");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
}).single("photo");

function photoUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ msg: "Choose a photo under 5 MB." });
    }
    if (err) {
      return res.status(400).json({ msg: "Choose one photo to upload." });
    }
    next();
  });
}

router.post("/wellness/meal-plan", auth, wellnessLimiter, planMeals);
router.post("/wellness/meal-scan", auth, wellnessLimiter, photoUpload, scanMeal);
router.post("/reminders/scan-label", auth, wellnessLimiter, photoUpload, scanMedicineLabel);
router.get("/wellness/symptoms", auth, listSymptoms);
router.post("/wellness/symptoms", auth, addSymptom);
router.delete("/wellness/symptoms/:id", auth, deleteSymptom);
module.exports = router;
