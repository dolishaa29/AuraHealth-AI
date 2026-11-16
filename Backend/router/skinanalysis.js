const express = require("express");
const { analyzeSkin, startSession } = require("../service/skinanalysis");
const userAuth = require("../middleware/user");
const { skinAnalysisLimiter } = require("../middleware/rateLimit");
const router = express.Router();

router.post("/skin-analysis/session", userAuth, startSession);
router.post("/skin-analysis", userAuth, skinAnalysisLimiter, analyzeSkin);

module.exports = router;
