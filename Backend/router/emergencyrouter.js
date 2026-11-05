const express = require("express");
const auth = require("../middleware/user");
const { getEmergencyContacts, saveEmergencyContacts } = require("../service/emergencyservice");
const router = express.Router();

router.get("/emergency-contacts", auth, getEmergencyContacts);
router.put("/emergency-contacts", auth, saveEmergencyContacts);

module.exports = router;
