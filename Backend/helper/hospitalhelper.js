const Doctor = require("../model/doctor");
const axios = require("axios");

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const OSRM_URL = "https://router.project-osrm.org";

const OSM_HEADERS = { "User-Agent": "AuraHealth/1.0 (telemedicine platform)" };

const CACHE_TIME_MS = 10 * 60 * 1000;
const hospitalCache = new Map();

function round1(num) {
  return Math.round(num * 10) / 10;
}

function secondsToMinutes(seconds) {
  return Math.max(1, Math.round(seconds / 60));
}

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

function makeSafeForSearch(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bestDistance(roadKm, straightKm) {
  if (roadKm !== null && roadKm !== undefined) {
    return roadKm;
  }
  return straightKm;
}

async function getOurDoctors(lat, lng, radiusKm, specialization) {
  const steps = [];

  steps.push({
    $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] },
      distanceField: "distanceMeters",
      maxDistance: radiusKm * 1000,
      spherical: true,
      query: { doctorstatus: "unblock" },
    },
  });

  if (specialization) {
    const pattern = new RegExp(makeSafeForSearch(specialization), "i");
    steps.push({ $match: { specialization: pattern } });
  }

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

async function getHospitalsFromOverpass(lat, lng, radiusKm) {
  const radiusMeters = radiusKm * 1000;
  const around = `around:${radiusMeters},${lat},${lng}`;

  const query =
    `[out:json][timeout:10];` +
    `(node["amenity"="hospital"](${around});way["amenity"="hospital"](${around}););` +
    `out center 300;`;

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

    let point;
    if (item.type === "node") {
      point = { lat: item.lat, lon: item.lon };
    } else {
      point = item.center;
    }

    if (!point || !tags.name) {
      continue;
    }

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

async function searchNominatimInSquare(lat, lng, squareKm) {

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
      bounded: 1,
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

async function getOutsideHospitals(lat, lng, radiusKm) {

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

  for (const hospital of hospitals) {
    hospital.distanceKm = round1(straightDistanceKm(lat, lng, hospital.lat, hospital.lon));
  }

  hospitals = hospitals.filter((hospital) => hospital.distanceKm <= radiusKm);
  hospitals.sort((a, b) => a.distanceKm - b.distanceKm);
  hospitals = hospitals.slice(0, 15);

  if (hospitalCache.size > 500) {
    hospitalCache.clear();
  }
  hospitalCache.set(cacheKey, { hospitals: hospitals, expires: Date.now() + CACHE_TIME_MS });

  return copyList(hospitals);
}

function copyList(list) {
  const copies = [];
  for (const item of list) {
    copies.push({ ...item });
  }
  return copies;
}

async function addRoadDistances(userLat, userLng, hospitals, doctors) {

  const places = [];
  for (const hospital of hospitals) {
    places.push({ lat: hospital.lat, lng: hospital.lon, target: hospital });
  }
  for (const doctor of doctors) {
    const coords = doctor.location && doctor.location.coordinates;
    if (coords && coords.length === 2) {
      places.push({ lat: coords[1], lng: coords[0], target: doctor });
    }
  }

  if (places.length === 0) {
    return;
  }

  const points = [userLng + "," + userLat];
  for (const place of places) {
    points.push(place.lng + "," + place.lat);
  }

  try {
    const response = await axios.get(`${OSRM_URL}/table/v1/driving/${points.join(";")}`, {
      params: { sources: 0, annotations: "distance,duration" },
      headers: OSM_HEADERS,
      timeout: 8000,
    });
    const data = response.data;

    if (data.code !== "Ok" || !data.distances || !data.durations) {
      return;
    }

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

    console.log("OSRM table error:", err.message);
  }
}

function sortHospitals(hospitals) {
  hospitals.sort((a, b) => bestDistance(a.roadDistanceKm, a.distanceKm) - bestDistance(b.roadDistanceKm, b.distanceKm));
}

function sortDoctors(doctors) {
  doctors.sort(
    (a, b) => bestDistance(a.roadDistanceKm, a.distanceMeters / 1000) - bestDistance(b.roadDistanceKm, b.distanceMeters / 1000)
  );
}

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

  let shortest = data.routes[0];
  for (const route of data.routes) {
    if (route.distance < shortest.distance) {
      shortest = route;
    }
  }

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
