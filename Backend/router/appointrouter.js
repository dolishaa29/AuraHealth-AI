let express=require("express");
let auth=require("../middleware/admin");
let auths=require("../middleware/user");
let authd=require("../middleware/doctor");
const { appointrequest, viewappointment, appointmentstatus, approveappointment, getAvailableSlots, bookSlot, cancelAppointment, getBriefing, updateBriefingSharing } = require("../service/appointment");
let router=express.Router();
const { listMedicineChanges, publishMedicineChange, applyMedicineChange } = require("../service/medicinechanges");


router.post("/appointrequest",auths ,appointrequest);
router.get("/viewappointment",auth, viewappointment);

router.put("/appointmentstatus",auth,appointmentstatus);
router.post("/approveappointment",auth,approveappointment);
router.get("/available-slots", auths, getAvailableSlots);
router.post("/book-slot", auths, bookSlot);
router.put("/appointment/:appointmentId/cancel", authd, cancelAppointment);
router.get("/appointment/:appointmentId/briefing", authd, getBriefing);
router.put("/appointment/:appointmentId/briefing-sharing", auths, updateBriefingSharing);
router.get("/appointment/:appointmentId/medicine-changes/doctor", authd, listMedicineChanges);
router.get("/appointment/:appointmentId/medicine-changes", auths, listMedicineChanges);
router.post("/appointment/:appointmentId/medicine-changes", authd, publishMedicineChange);
router.put("/appointment/:appointmentId/medicine-changes/:changeId/apply", auths, applyMedicineChange);
module.exports=router;
