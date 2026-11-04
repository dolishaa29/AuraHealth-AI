const Doctor = require("../model/doctor");
const axios = require("axios");
const { inferSpecialization } = require("./triageservice");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getInternalDoctors(lat, lng, radiusKm, specialization) {
  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: { doctorstatus: "unblock" },
      },
    },
  ];

  if (specialization) {
    pipeline.push({ $match: { specialization: new RegExp(escapeRegex(specialization), "i") } });
  }

  pipeline.push(
    { $limit: 20 },
    { $project: { name: 1, specialization: 1, hospitalName: 1, HospitalAddress: 1, location: 1, distanceMeters: 1 } }
  );

  return Doctor.aggregate(pipeline);
}

// Public Overpass instances are frequently overloaded, so query several and take the first answer.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OSRM_URL = "https://router.project-osrm.org";
// OSM services reject requests without an identifying User-Agent (overpass-api.de answers 406).
const OSM_HEADERS = { "User-Agent": "AuraHealth/1.0 (telemedicine platform)" };
const EXTERNAL_CACHE_TTL_MS = 10 * 60 * 1000;
const externalCache = new Map();

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

async function getOverpassHospitals(lat, lng, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const query = `[out:json][timeout:10];(node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});way["amenity"="hospital"](around:${radiusMeters},${lat},${lng}););out center 40;`;

  const response = await Promise.any(
    OVERPASS_ENDPOINTS.map((url) =>
      axios.post(url, new URLSearchParams({ data: query }), { headers: OSM_HEADERS, timeout: 7000 })
    )
  );

  return (response.data.elements || [])
    .map((el) => {
      const tags = el.tags || {};
      const point = el.type === "node" ? { lat: el.lat, lon: el.lon } : el.center;
      if (!point || !tags.name) return null;
      const addressParts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean);
      return { name: tags.name, lat: point.lat, lon: point.lon, address: addressParts.join(", ") || null };
    })
    .filter(Boolean);
}

// Fallback when every Overpass instance is down: Nominatim keyword search bounded to the search area.
async function getNominatimHospitals(lat, lng, radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const response = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: "hospital",
      format: "json",
      limit: 40,
      bounded: 1,
      viewbox: `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`,
    },
    headers: OSM_HEADERS,
    timeout: 8000,
  });

  return (response.data || [])
    .filter((p) => p.class === "amenity" && ["hospital", "clinic"].includes(p.type) && p.name)
    .map((p) => ({
      name: p.name,
      lat: parseFloat(p.lat),
      lon: parseFloat(p.lon),
      address: p.display_name.split(", ").slice(1, 4).join(", ") || null,
    }));
}

async function getExternalHospitals(lat, lng, radiusKm) {
  // ~1km grid so nearby users share cache entries.
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${radiusKm}`;
  const cached = externalCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.hospitals;

  let hospitals;
  try {
    hospitals = await getOverpassHospitals(lat, lng, radiusKm);
  } catch (err) {
    const reasons = err.errors ? err.errors.map((e) => e.response?.status || e.code || e.message).join(", ") : err.message;
    console.log("Overpass API error, falling back to Nominatim:", reasons);
    try {
      hospitals = await getNominatimHospitals(lat, lng, radiusKm);
    } catch (fallbackErr) {
      console.log("Nominatim fallback error:", fallbackErr.message);
      return null;
    }
  }

  hospitals = hospitals
    .map((h) => ({ ...h, distanceKm: +haversineKm(lat, lng, h.lat, h.lon).toFixed(1) }))
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 15);

  if (externalCache.size > 500) externalCache.clear();
  externalCache.set(cacheKey, { hospitals, expires: Date.now() + EXTERNAL_CACHE_TTL_MS });
  return hospitals;
}

// One OSRM table call gives real road distance/time from the user to every place, so "nearest" means
// shortest drive rather than shortest straight line. Leaves places untouched if OSRM is unreachable.
async function addRoadDistances(lat, lng, places) {
  if (!places.length) return;
  const coords = [[lng, lat], ...places.map((p) => [p.lng, p.lat])].map((c) => c.join(",")).join(";");
  try {
    const { data } = await axios.get(`${OSRM_URL}/table/v1/driving/${coords}`, {
      params: { sources: 0, annotations: "distance,duration" },
      headers: OSM_HEADERS,
      timeout: 8000,
    });
    if (data.code !== "Ok") return;
    places.forEach((p, i) => {
      const distance = data.distances?.[0]?.[i + 1];
      const duration = data.durations?.[0]?.[i + 1];
      if (distance != null) p.target.roadDistanceKm = +(distance / 1000).toFixed(1);
      if (duration != null) p.target.durationMin = Math.max(1, Math.round(duration / 60));
    });
  } catch (err) {
    console.log("OSRM table error:", err.message);
  }
}

const byRoadThenStraight = (straightKm) => (a, b) =>
  (a.roadDistanceKm ?? straightKm(a)) - (b.roadDistanceKm ?? straightKm(b));

exports.nearbyHospitals = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radiusKm = Math.min(parseFloat(req.query.radiusKm) || 10, 50);
  const issue = req.query.issue;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ success: false, message: "lat and lng are required" });
  }

  let inferredSpecialization = null;
  if (issue) {
    try {
      const triageResult = await inferSpecialization(issue);
      inferredSpecialization = triageResult.specialization;
    } catch (err) {
      console.log("Triage lookup failed for hospital search:", err.message);
    }
  }

  const [internal, external] = await Promise.all([
    getInternalDoctors(lat, lng, radiusKm, inferredSpecialization),
    getExternalHospitals(lat, lng, radiusKm),
  ]);
  // Copy so per-user road distances never leak into the shared cache.
  const externalList = (external || []).map((h) => ({ ...h }));

  await addRoadDistances(lat, lng, [
    ...externalList.map((h) => ({ lat: h.lat, lng: h.lon, target: h })),
    ...internal
      .filter((d) => d.location?.coordinates?.length === 2)
      .map((d) => ({ lat: d.location.coordinates[1], lng: d.location.coordinates[0], target: d })),
  ]);

  externalList.sort(byRoadThenStraight((h) => h.distanceKm));
  internal.sort(byRoadThenStraight((d) => d.distanceMeters / 1000));

  res.status(200).json({
    success: true,
    inferredSpecialization,
    internal,
    external: externalList,
    externalUnavailable: external === null,
  });
};

exports.route = async (req, res) => {
  const [fromLat, fromLng, toLat, toLng] = ["fromLat", "fromLng", "toLat", "toLng"].map((k) => parseFloat(req.query[k]));
  if ([fromLat, fromLng, toLat, toLng].some(Number.isNaN)) {
    return res.status(400).json({ success: false, message: "fromLat, fromLng, toLat and toLng are required" });
  }

  try {
    const { data } = await axios.get(`${OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`, {
      params: { overview: "full", geometries: "geojson", alternatives: true },
      headers: OSM_HEADERS,
      timeout: 10000,
    });
    if (data.code !== "Ok" || !data.routes?.length) {
      return res.status(404).json({ success: false, message: "No route found" });
    }
    const shortest = data.routes.reduce((best, r) => (r.distance < best.distance ? r : best));
    return res.status(200).json({
      success: true,
      distanceKm: +(shortest.distance / 1000).toFixed(1),
      durationMin: Math.max(1, Math.round(shortest.duration / 60)),
      // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
      path: shortest.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    });
  } catch (err) {
    console.log("OSRM route error:", err.message);
    return res.status(502).json({ success: false, message: "Routing service unavailable" });
  }
};
