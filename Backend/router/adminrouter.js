let express=require("express");
let auth=require("../middleware/admin")
let router=express.Router();
const { adminregister, adminlogin, adminprofile, adminlogout, adminDashboard} = require("../service/adminservice");
const { adminAnalytics } = require("../service/dashboardAnalytics");
router.post("/adminregister",adminregister);
router.post("/adminlogin",adminlogin);
router.get('/adminprofile',auth, adminprofile);
router.get("/adminlogout",auth,adminlogout);
router.get("/admindashboard",auth,adminDashboard);
router.get("/admin/analytics",auth,adminAnalytics);

module.exports=router;
