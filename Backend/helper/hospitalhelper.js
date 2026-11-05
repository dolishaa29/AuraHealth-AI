// All the "behind the scenes" work for hospitalservice.js lives here.
// hospitalservice.js only handles the request and the response.

const Doctor = require("../model/doctor");
const axios = require("axios");

// ------------------------------------------------------------------
// Settings
// ------------------------------------------------------------------

// Free OpenStreetMap servers that can list hospitals.
// We ask all of them at once and use whichever answers first.
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Free server that tells us road distance and driving time
const OSRM_URL = "https://router.project-osrm.org";

// OpenStreetMap asks every app to send its name
const OSM_HEADERS = { "User-Agent": "AuraHealth/1.0 (telemedicine platform)" };

// Remember hospital results for 10 minutes so we don't ask the servers again and again
const CACHE_TIME_MS = 10 * 60 * 1000;
const hospitalCache = new Map();

// ------------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------------

// Round a number to 1 decimal place. Example: 3.456 -> 3.5
function round1(num) {
  return Math.round(num * 10) / 10;
}

// Turn seconds into minutes (at least 1 minute)
function secondsToMinutes(seconds) {
  return Math.max(1, Math.round(seconds / 60));
}

// Straight-line distance in km between two points on Earth (Haversine formula)
function straightDistanceKm(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

// Make text safe to use inside a search pattern.
// Example: "ENT (ear)" -> "ENT \(ear\)" so the brackets are searched as normal text.
function makeSafeForSearch(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Road distance if we have it, otherwise straight-line distance
function bestDistance(roadKm, straightKm) {
  if (roadKm !== null && roadKm !== undefined) {
    return roadKm;
  }
  return straightKm;
}

// ------------------------------------------------------------------
// 1. Doctors registered on our own website
// ------------------------------------------------------------------

async function getOurDoctors(lat, lng, radiusKm, specialization) {
  const steps = [];

  // Find unblocked doctors near the user, closest first
  steps.push({
    $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] }, // MongoDB wants [lng, lat]
      distanceField: "distanceMeters",
      maxDistance: radiusKm * 1000,
      spherical: true,
      query: { doctorstatus: "unblock" },
    },
  });

  // If we know what kind of doctor is needed, only keep those
  if (specialization) {
    const pattern = new RegExp(makeSafeForSearch(specialization), "i"); // "i" = ignore upper/lower case
    steps.push({ $match: { specialization: pattern } });
  }

  // Only take 20 doctors, and only the fields we need
  steps.push({ $limit: 20 });
  steps.push({
    $project: {
      name: 1,
      specialization: 1,
      hospitalName: 1,
      HospitalAddress: 1,
      location: 1,
      distanceMeters: 1,
    },
  });

  return Doctor.aggregate(steps);
}

// ------------------------------------------------------------------
// 2. Hospitals from OpenStreetMap
// ------------------------------------------------------------------

// Main way: ask the Overpass servers
async function getHospitalsFromOverpass(lat, lng, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const around = `around:${radiusMeters},${lat},${lng}`;

  // Overpass has its own query language. This means:
  // "give me every hospital (point or building) within the radius, max 300 results"
  const query =
    `[out:json][timeout:10];` +
    `(node["amenity"="hospital"](${around});way["amenity"="hospital"](${around}););` +
    `out center 300;`;

  // Send the same question to every server. Promise.any gives us the first one that succeeds.
  const requests = [];
  for (const serverUrl of OVERPASS_SERVERS) {
    const request = axios.post(serverUrl, new URLSearchParams({ data: query }), {
      headers: OSM_HEADERS,
      timeout: 7000,
    });
    requests.push(request);
  }
  const response = await Promise.any(requests);

  const items = response.data.elements || [];
  const hospitals = [];

  for (const item of items) {
    const tags = item.tags || {};

    // A "node" is a single point. A "way" is a building shape, so we use its center point.
    let point;
    if (item.type === "node") {
      point = { lat: item.lat, lon: item.lon };
    } else {
      point = item.center;
    }

    // Skip hospitals without a location or a name
    if (!point || !tags.name) {
      continue;
    }

    // Build the address from the parts that exist
    const addressParts = [];
    if (tags["addr:housenumber"]) addressParts.push(tags["addr:housenumber"]);
    if (tags["addr:street"]) addressParts.push(tags["addr:street"]);
    if (tags["addr:city"]) addressParts.push(tags["addr:city"]);

    hospitals.push({
      name: tags.name,
      lat: point.lat,
      lon: point.lon,
      address: addressParts.length > 0 ? addressParts.join(", ") : null,
    });
  }

  return hospitals;
}

// Backup way: search "hospital" on Nominatim inside a square around the user
async function searchNominatimInSquare(lat, lng, squareKm) {
  // 1 degree of latitude is about 111 km.
  // 1 degree of longitude gets smaller as you move away from the equator.
  const latChange = squareKm / 111;
  const lngChange = squareKm / (111 * Math.cos((lat * Math.PI) / 180));

  const left = lng - lngChange;
  const right = lng + lngChange;
  const top = lat + latChange;
  const bottom = lat - latChange;

  const response = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: {
      q: "hospital",
      format: "json",
      limit: 40,
      bounded: 1, // only results inside the square
      viewbox: `${left},${top},${right},${bottom}`,
    },
    headers: OSM_HEADERS,
    timeout: 8000,
  });

  const places = response.data || [];
  const hospitals = [];

  for (const place of places) {
    const isHospital = place.class === "amenity" && (place.type === "hospital" || place.type === "clinic");
    if (!isHospital || !place.name) {
      continue;
    }

    // display_name looks like "City Hospital, MG Road, Indore, Madhya Pradesh, India".
    // Skip the first part (the name) and keep the next 3 parts as the address.
    const address = place.display_name.split(", ").slice(1, 4).join(", ");

    hospitals.push({
      name: place.name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon),
      address: address || null,
    });
  }

  return hospitals;
}

async function getHospitalsFromNominatim(lat, lng, radiusKm) {
  // Nominatim only returns 40 results. In a big city a big square fills up with far-away
  // hospitals, so we search a small 5 km square first, then the full radius.
  const squareSizes = [];
  squareSizes.push(Math.min(5, radiusKm));
  if (radiusKm > 5) {
    squareSizes.push(radiusKm);
  }

  const alreadyAdded = new Set();
  const hospitals = [];

  for (const size of squareSizes) {
    const results = await searchNominatimInSquare(lat, lng, size);

    for (const hospital of results) {
      // Both searches can return the same hospital, so skip duplicates
      const id = hospital.name + "|" + hospital.lat.toFixed(4) + "|" + hospital.lon.toFixed(4);
      if (alreadyAdded.has(id)) {
        continue;
      }
      alreadyAdded.add(id);
      hospitals.push(hospital);
    }
  }

  return hospitals;
}

// Returns the 15 closest hospitals, or null if both OpenStreetMap services failed
async function getOutsideHospitals(lat, lng, radiusKm) {
  // Users within about 1 km of each other share the same saved result
  const cacheKey = lat.toFixed(2) + "," + lng.toFixed(2) + "," + radiusKm;
  const saved = hospitalCache.get(cacheKey);
  if (saved && saved.expires > Date.now()) {
    return copyList(saved.hospitals);
  }

  let hospitals;
  try {
    hospitals = await getHospitalsFromOverpass(lat, lng, radiusKm);
  } catch (err) {
    console.log("Overpass API error, trying Nominatim instead:", err.message);
    try {
      hospitals = await getHospitalsFromNominatim(lat, lng, radiusKm);
    } catch (backupErr) {
      console.log("Nominatim error too:", backupErr.message);
      return null;
    }
  }

  // Add the straight-line distance to each hospital
  for (const hospital of hospitals) {
    hospital.distanceKm = round1(straightDistanceKm(lat, lng, hospital.lat, hospital.lon));
  }

  // Keep only hospitals inside the radius, closest first, max 15
  hospitals = hospitals.filter((hospital) => hospital.distanceKm <= radiusKm);
  hospitals.sort((a, b) => a.distanceKm - b.distanceKm);
  hospitals = hospitals.slice(0, 15);

  // Save the result (and empty the cache if it gets too big)
  if (hospitalCache.size > 500) {
    hospitalCache.clear();
  }
  hospitalCache.set(cacheKey, { hospitals: hospitals, expires: Date.now() + CACHE_TIME_MS });

  return copyList(hospitals);
}

// Give back copies, so later changes (like adding road distance) don't change the saved cache
function copyList(list) {
  const copies = [];
  for (const item of list) {
    copies.push({ ...item });
  }
  return copies;
}

// ------------------------------------------------------------------
// 3. Road distance and driving time
// ------------------------------------------------------------------

// Adds roadDistanceKm and durationMin to every hospital and doctor (if the server answers)
async function addRoadDistances(userLat, userLng, hospitals, doctors) {
  // Make one list of every place, so we only need one request
  const places = [];
  for (const hospital of hospitals) {
    places.push({ lat: hospital.lat, lng: hospital.lon, target: hospital });
  }
  for (const doctor of doctors) {
    const coords = doctor.location && doctor.location.coordinates;
    if (coords && coords.length === 2) {
      places.push({ lat: coords[1], lng: coords[0], target: doctor }); // stored as [lng, lat]
    }
  }

  if (places.length === 0) {
    return;
  }

  // OSRM wants all points as "lng,lat;lng,lat;..." with the user first
  const points = [userLng + "," + userLat];
  for (const place of places) {
    points.push(place.lng + "," + place.lat);
  }

  try {
    const response = await axios.get(`${OSRM_URL}/table/v1/driving/${points.join(";")}`, {
      params: { sources: 0, annotations: "distance,duration" }, // sources: 0 = from the user only
      headers: OSM_HEADERS,
      timeout: 8000,
    });
    const data = response.data;

    if (data.code !== "Ok" || !data.distances || !data.durations) {
      return;
    }

    // Row 0 = distances from the user. Column 0 is the user, so place number i is column i + 1.
    const distances = data.distances[0];
    const durations = data.durations[0];

    for (let i = 0; i < places.length; i++) {
      const meters = distances[i + 1];
      const seconds = durations[i + 1];

      if (meters !== null && meters !== undefined) {
        places[i].target.roadDistanceKm = round1(meters / 1000);
      }
      if (seconds !== null && seconds !== undefined) {
        places[i].target.durationMin = secondsToMinutes(seconds);
      }
    }
  } catch (err) {
    // Not a big problem: we just show straight-line distance instead
    console.log("OSRM table error:", err.message);
  }
}

// Sort closest first (by road if we know it, otherwise straight line)
function sortHospitals(hospitals) {
  hospitals.sort((a, b) => bestDistance(a.roadDistanceKm, a.distanceKm) - bestDistance(b.roadDistanceKm, b.distanceKm));
}

function sortDoctors(doctors) {
  doctors.sort(
    (a, b) => bestDistance(a.roadDistanceKm, a.distanceMeters / 1000) - bestDistance(b.roadDistanceKm, b.distanceMeters / 1000)
  );
}

// ------------------------------------------------------------------
// 4. Driving route between two points
// ------------------------------------------------------------------

// Returns { distanceKm, durationMin, path } or null if there is no route.
// Throws an error if the routing server is down.
async function getShortestRoute(fromLat, fromLng, toLat, toLng) {
  const url = `${OSRM_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
  const response = await axios.get(url, {
    params: { overview: "full", geometries: "geojson", alternatives: true },
    headers: OSM_HEADERS,
    timeout: 10000,
  });
  const data = response.data;

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    return null;
  }

  // OSRM may give a few different routes. Pick the shortest one.
  let shortest = data.routes[0];
  for (const route of data.routes) {
    if (route.distance < shortest.distance) {
      shortest = route;
    }
  }

  // OSRM gives points as [lng, lat], but the map wants [lat, lng]
  const path = [];
  for (const point of shortest.geometry.coordinates) {
    path.push([point[1], point[0]]);
  }

  return {
    distanceKm: round1(shortest.distance / 1000),
    durationMin: secondsToMinutes(shortest.duration),
    path: path,
  };
}

module.exports = {
  getOurDoctors,
  getOutsideHospitals,
  addRoadDistances,
  sortHospitals,
  sortDoctors,
  getShortestRoute,
};
