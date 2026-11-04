const express = require("express");
const { nearbyHospitals, route } = require("../service/hospitalservice");
const { hospitalLimiter } = require("../middleware/rateLimit");
const router = express.Router();

router.get("/nearby-hospitals", hospitalLimiter, nearbyHospitals);
router.get("/route", hospitalLimiter, route);

module.exports = router;
