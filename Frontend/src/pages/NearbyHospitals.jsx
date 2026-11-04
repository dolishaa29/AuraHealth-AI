import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Loader2, Navigation, Route, MapPin, Clock } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const makeDotIcon = (color, size = 16) =>
  L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const USER_ICON = makeDotIcon("#4f46e5");
const INTERNAL_ICON = makeDotIcon("#059669");
const EXTERNAL_ICON = makeDotIcon("#ea580c");
const SELECTED_ICON = makeDotIcon("#dc2626", 22);

// Opens Google Maps straight into directions with both ends filled in; dir_action=navigate starts
// turn-by-turn on phones (desktop shows the route preview with distance/ETA).
const googleMapsUrl = (from, place) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${place.lat},${place.lng}&travelmode=driving&dir_action=navigate`;

// Browsers only allow window.open during a click, but results arrive seconds later — so open the
// tab on click and point it at Google Maps once the nearest hospital is known.
const openPendingMapsTab = () => {
  const tab = window.open("", "_blank");
  if (!tab) return null;
  tab.opener = null;
  tab.document.title = "Finding nearest hospital…";
  tab.document.body.innerHTML =
    '<p style="font-family:system-ui,sans-serif;color:#475569;padding:24px">Finding the nearest hospital and opening directions…</p>';
  return tab;
};

const distanceOf = (p) => p.roadDistanceKm ?? p.distanceKm;

const formatDistance = (p) => {
  if (p.roadDistanceKm != null) return `${p.roadDistanceKm} km by road${p.durationMin ? ` · ${p.durationMin} min` : ""}`;
  return p.distanceKm != null ? `~${p.distanceKm.toFixed(1)} km away` : "";
};

const toPlaces = (results) => {
  if (!results) return [];
  const doctors = (results.internal || [])
    .filter((d) => d.location?.coordinates?.length === 2)
    .map((d) => ({
      id: `doc-${d._id}`,
      kind: "doctor",
      name: d.hospitalName || `Dr. ${d.name}`,
      subtitle: [`Dr. ${d.name}`, d.specialization].filter(Boolean).join(" · "),
      lat: d.location.coordinates[1],
      lng: d.location.coordinates[0],
      distanceKm: d.distanceMeters != null ? d.distanceMeters / 1000 : null,
      roadDistanceKm: d.roadDistanceKm,
      durationMin: d.durationMin,
    }));
  const hospitals = (results.external || []).map((h, i) => ({
    id: `ext-${i}`,
    kind: "hospital",
    name: h.name,
    subtitle: h.address,
    lat: h.lat,
    lng: h.lon,
    distanceKm: h.distanceKm,
    roadDistanceKm: h.roadDistanceKm,
    durationMin: h.durationMin,
  }));
  return [...doctors, ...hospitals].sort((a, b) => (distanceOf(a) ?? Infinity) - (distanceOf(b) ?? Infinity));
};

// Keeps the map framed on the active route, or on the selected place while its route loads.
const MapFocus = ({ position, selected, path }) => {
  const map = useMap();
  useEffect(() => {
    if (path?.length) {
      map.fitBounds(L.latLngBounds(path), { padding: [40, 40] });
    } else if (selected) {
      map.fitBounds(L.latLngBounds([[position.lat, position.lng], [selected.lat, selected.lng]]), { padding: [60, 60] });
    }
  }, [map, position, selected, path]);
  return null;
};

const NearbyHospitals = () => {
  const [position, setPosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [issue, setIssue] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const routeRequest = useRef(0);

  const places = useMemo(() => toPlaces(results), [results]);
  const selected = places.find((p) => p.id === selectedId) || null;

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Location access denied. Enable it to find hospitals near you."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const showRoute = async (place, from = position) => {
    if (!place || !from) return;
    const requestId = ++routeRequest.current;
    setSelectedId(place.id);
    setRoute(null);
    setRouteError("");
    setRouteLoading(true);
    try {
      const res = await axios.get(`${API}/route`, {
        params: { fromLat: from.lat, fromLng: from.lng, toLat: place.lat, toLng: place.lng },
      });
      if (requestId !== routeRequest.current) return;
      if (res.data.success) setRoute(res.data);
    } catch {
      if (requestId !== routeRequest.current) return;
      setRouteError("Couldn't draw the route here — you can still open it in Google Maps.");
    } finally {
      if (requestId === routeRequest.current) setRouteLoading(false);
    }
  };

  const search = async (coords, mapsTab = null) => {
    const point = coords || position;
    if (!point || loading) {
      mapsTab?.close();
      return;
    }
    setLoading(true);
    setSearchError("");
    setSelectedId(null);
    setRoute(null);
    try {
      const res = await axios.get(`${API}/nearby-hospitals`, {
        params: { lat: point.lat, lng: point.lng, issue: issue.trim() || undefined, radiusKm: 15 },
      });
      if (res.data.success) {
        setResults(res.data);
        // Suggest the nearest one straight away and draw the way there.
        const nearest = toPlaces(res.data)[0];
        if (nearest) showRoute(nearest, point);
        if (mapsTab && nearest) mapsTab.location.href = googleMapsUrl(point, nearest);
        else mapsTab?.close();
      } else {
        mapsTab?.close();
      }
    } catch {
      mapsTab?.close();
      setSearchError("Couldn't fetch nearby hospitals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Directions to the selected place (the nearest one by default). Without results yet, search first
  // and send a click-opened tab there once the nearest hospital is known.
  const navigate = () => {
    if (!position) return;
    if (selected) {
      window.open(googleMapsUrl(position, selected), "_blank", "noopener,noreferrer");
    } else {
      search(null, openPendingMapsTab());
    }
  };

  useEffect(() => {
    if (position) search(position);
  }, [position]);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-6 py-10 md:px-10">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-indigo-500 tracking-[0.2em] uppercase mb-1">Emergency & Care</p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          Nearby <span className="text-indigo-600">Hospitals</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Find the closest hospital, see the shortest way there, and open it in Google Maps</p>
      </div>

      <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 flex gap-2">
        <input
          type="text"
          placeholder="What's the issue? (optional, e.g. chest pain)"
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
        />
        <button
          onClick={() => search()}
          disabled={!position || loading}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-indigo-700 transition-all shrink-0 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
        <button
          onClick={navigate}
          disabled={!position || loading}
          title={selected ? `Directions to ${selected.name}` : "Find the nearest hospital and open directions"}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-emerald-700 transition-all shrink-0 flex items-center gap-1.5"
        >
          <Navigation size={14} />
          Navigate
        </button>
      </div>

      {locationError && <p className="text-sm text-red-500 font-medium mb-4">{locationError}</p>}
      {searchError && <p className="text-sm text-red-500 font-medium mb-4">{searchError}</p>}
      {results?.externalUnavailable && (
        <p className="text-sm text-amber-600 font-medium mb-4">
          Hospital map data is temporarily unavailable — showing AuraHealth doctors only. Try searching again in a minute.
        </p>
      )}
      {results?.inferredSpecialization && (
        <p className="text-xs text-slate-500 mb-4">
          Suggested specialization: <span className="font-bold text-indigo-600">{results.inferredSpecialization}</span>
        </p>
      )}

      {!position && !locationError && (
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
          <Loader2 size={16} className="animate-spin" /> Getting your location…
        </div>
      )}

      {position && selected && (
        <div className="mb-4 bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-indigo-500 tracking-[0.2em] uppercase mb-0.5">Shortest route</p>
            <p className="font-bold text-slate-900 truncate">{selected.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              {routeLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Finding the shortest way…
                </>
              ) : route ? (
                <>
                  <Route size={12} /> {route.distanceKm} km <Clock size={12} className="ml-1" /> ~{route.durationMin} min by car
                </>
              ) : (
                routeError || formatDistance(selected)
              )}
            </p>
          </div>
          <a
            href={googleMapsUrl(position, selected)}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shrink-0 flex items-center justify-center gap-1.5"
          >
            <Navigation size={14} /> Open in Google Maps
          </a>
        </div>
      )}

      {position && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: "480px" }}>
            <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFocus position={position} selected={selected} path={route?.path} />

              {route?.path && <Polyline positions={route.path} pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.8 }} />}

              <Marker position={[position.lat, position.lng]} icon={USER_ICON}>
                <Popup>You are here</Popup>
              </Marker>

              {places.map((place) => (
                <Marker
                  key={place.id}
                  position={[place.lat, place.lng]}
                  icon={place.id === selectedId ? SELECTED_ICON : place.kind === "doctor" ? INTERNAL_ICON : EXTERNAL_ICON}
                  eventHandlers={{ click: () => showRoute(place) }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold">{place.name}</p>
                      {place.subtitle && <p className="text-slate-500">{place.subtitle}</p>}
                      <p className="text-slate-400">{formatDistance(place)}</p>
                      <a
                        href={googleMapsUrl(position, place)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 font-bold flex items-center gap-1 mt-1"
                      >
                        <Navigation size={11} /> Open in Google Maps
                      </a>
                      {place.kind === "doctor" && (
                        <a href="/SlotBooking" className="text-emerald-600 font-bold block">
                          Book Appointment &rarr;
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 lg:h-[480px] flex flex-col">
            <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-3 px-1">
              Suggested near you {places.length > 0 && `(${places.length})`}
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm px-1">
                  <Loader2 size={14} className="animate-spin" /> Searching nearby…
                </div>
              )}
              {!loading && results && places.length === 0 && (
                <p className="text-sm text-slate-400 px-1">No hospitals found within 15 km.</p>
              )}
              {!loading &&
                places.map((place, i) => (
                  <div
                    key={place.id}
                    className={`rounded-2xl border p-3 transition-all ${
                      place.id === selectedId ? "border-indigo-300 bg-indigo-50/60" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={16}
                        className={`mt-0.5 shrink-0 ${place.kind === "doctor" ? "text-emerald-600" : "text-orange-600"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-slate-900">{place.name}</p>
                          {i === 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase">
                              Nearest
                            </span>
                          )}
                        </div>
                        {place.subtitle && <p className="text-xs text-slate-500 truncate">{place.subtitle}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{formatDistance(place)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={() => showRoute(place)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-1"
                      >
                        <Route size={12} /> Show route
                      </button>
                      <a
                        href={googleMapsUrl(position, place)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
                      >
                        <Navigation size={12} /> Google Maps
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> AuraHealth doctors
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> Other hospitals
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Selected
        </span>
      </div>
    </div>
  );
};

export default NearbyHospitals;
