let express=require("express");
let auth=require("../middleware/admin")
let router=express.Router();
const { adminregister, adminlogin, adminprofile, adminlogout, adminDashboard} = require("../service/adminservice");
const { adminAnalytics } = require("../service/dashboardAnalytics");
const { getAdminPayoutQueue, reviewVisit, reviewWithdrawal } = require("../service/doctorPayout");
router.post("/adminregister",adminregister);
router.post("/adminlogin",adminlogin);
router.get('/adminprofile',auth, adminprofile);
router.get("/adminlogout",auth,adminlogout);
router.get("/admindashboard",auth,adminDashboard);
router.get("/admin/analytics",auth,adminAnalytics);
router.get("/admin/payouts",auth,getAdminPayoutQueue);
router.put("/admin/payouts/visits/:id",auth,reviewVisit);
router.put("/admin/payouts/withdrawals/:id",auth,reviewWithdrawal);

module.exports=router;
