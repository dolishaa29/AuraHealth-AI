const { inferSpecialization } = require("./triageservice");
const {
  getOurDoctors,
  getOutsideHospitals,
  addRoadDistances,
  sortHospitals,
  sortDoctors,
  getShortestRoute,
} = require("../helper/hospitalhelper");

exports.nearbyHospitals = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const issue = req.query.issue;

  let radiusKm = parseFloat(req.query.radiusKm) || 10;
  if (radiusKm > 50) {
    radiusKm = 50;
  }

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ success: false, message: "lat and lng are required" });
  }

  let specialization = null;
  if (issue) {
    try {
      const triage = await inferSpecialization(issue);
      specialization = triage.specialization;
    } catch (err) {
      console.log("Triage lookup failed for hospital search:", err.message);
    }
  }

  const [doctors, outsideHospitals] = await Promise.all([
    getOurDoctors(lat, lng, radiusKm, specialization),
    getOutsideHospitals(lat, lng, radiusKm),
  ]);
  const hospitals = outsideHospitals || []; 

  await addRoadDistances(lat, lng, hospitals, doctors);
  sortHospitals(hospitals);
  sortDoctors(doctors);

  res.status(200).json({
    success: true,
    inferredSpecialization: specialization,
    internal: doctors,
    external: hospitals,
    externalUnavailable: outsideHospitals === null,
  });
};



exports.route = async (req, res) => {
  const fromLat = parseFloat(req.query.fromLat);
  const fromLng = parseFloat(req.query.fromLng);
  const toLat = parseFloat(req.query.toLat);
  const toLng = parseFloat(req.query.toLng);

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    return res.status(400).json({ success: false, message: "fromLat, fromLng, toLat and toLng are required" });
  }

  try {
    const route = await getShortestRoute(fromLat, fromLng, toLat, toLng);

    if (route === null) {
      return res.status(404).json({ success: false, message: "No route found" });
    }

    return res.status(200).json({
      success: true,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      path: route.path,
    });
  } catch (err) {
    console.log("OSRM route error:", err.message);
    return res.status(502).json({ success: false, message: "Routing service unavailable" });
  }
};
