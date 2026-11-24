let doctormodel = require("../model/doctor");
const jwt = require("jsonwebtoken");

async function auth(req, res, next) {
  try {
    const token = req.cookies.emstoken || req.headers.authorization?.split(" ")[1];

    if (token != undefined && token != "") {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      if (data.role && data.role !== "doctor") return res.status(403).json({ msg: "Doctor access required." });

      let doctor = await doctormodel.findOne({ email: data.token });

      if (!doctor) return res.status(403).json({ msg: "Doctor not found" });
      else {
        req.doctor = doctor;
        req.authRole = data.role;
        next();
      }
    } else {
      return res.status(401).json({ msg: "Please login first" });
    }
  } catch (err) {

    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Your session has expired. Please log in again.", expired: true });
    }
    console.log(err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
}

module.exports = auth;
