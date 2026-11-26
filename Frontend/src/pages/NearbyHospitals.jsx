import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
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

const googleMapsUrl = (from, place) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${place.lat},${place.lng}&travelmode=driving&dir_action=navigate`;

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

  const navigate = () => {
    if (!position) return;
    if (selected) {
      window.open(googleMapsUrl(position, selected), "_blank", "noopener,noreferrer");
    } else {
      search(null, openPendingMapsTab());
    }
  };

  const searchFromLocation = useEffectEvent((point) => search(point));

  useEffect(() => {
    if (position) searchFromLocation(position);
  }, [position]);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Hospitals near you</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Find the closest care, see the fastest way there and open it in Google Maps.</p>
        </div>

        <section className="relative overflow-hidden rounded-[32px] bg-[#E6F1FF] p-6 sm:p-7">
          <div aria-hidden="true" className="absolute -right-14 -top-16 w-56 h-56 rounded-full bg-[#D3E6FF]" />
          <h2 className="relative mb-4 text-xl sm:text-2xl font-extrabold tracking-tight text-[#1E3A8A]">What do you need help with?</h2>
          <div className="relative flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="issue">Issue</label>
            <input id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Optional, e.g. chest pain or fracture"
              className="flex-[1_1_260px] h-[52px] px-5 rounded-full bg-white text-[15px] font-medium placeholder:text-[#9A99B5] focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button onClick={() => search()} disabled={!position || loading} className="h-[52px] px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
            </button>
            <button onClick={navigate} disabled={!position || loading} title={selected ? `Directions to ${selected.name}` : "Directions to the nearest hospital"}
              className="h-[52px] px-6 rounded-full bg-[#12B76A] hover:bg-[#039855] text-white text-[15px] font-bold flex items-center gap-2 disabled:opacity-50">
              <Navigation size={16} /> Take me there
            </button>
          </div>
          {results?.inferredSpecialization && (
            <p className="relative mt-3 text-sm text-[#1E3A8A]">Suggested specialty: <span className="px-3 py-1 rounded-full bg-white font-bold">{results.inferredSpecialization}</span></p>
          )}
        </section>

        {locationError && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{locationError}</p>}
        {searchError && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{searchError}</p>}
        {results?.externalUnavailable && (
          <p className="px-5 py-3 rounded-[20px] bg-[#FFF4E5] text-[#B45309] text-sm font-semibold">Hospital map data is busy right now, so only AuraHealth doctors are shown. Try again in a minute.</p>
        )}
        {!position && !locationError && (
          <p className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Getting your location…</p>
        )}

        {position && selected && (
          <section className="rounded-[28px] bg-[#E7F7EF] p-5 flex flex-wrap items-center gap-4">
            <span className="w-12 h-12 shrink-0 rounded-full bg-white text-[#05603A] flex items-center justify-center"><Route size={20} /></span>
            <div className="flex-[1_1_220px] min-w-0">
              <p className="text-base font-extrabold text-[#054F31] truncate">{selected.name}</p>
              <p className="text-sm text-[#05603A] flex items-center gap-1.5">
                {routeLoading ? <><Loader2 size={13} className="animate-spin" /> Finding the fastest way…</>
                  : route ? <>{route.distanceKm} km · <Clock size={13} /> about {route.durationMin} min by car</>
                  : routeError || formatDistance(selected)}
              </p>
            </div>
            <a href={googleMapsUrl(position, selected)} target="_blank" rel="noreferrer" className="h-11 px-5 rounded-full bg-[#12B76A] hover:bg-[#039855] text-white text-sm font-bold flex items-center gap-2">
              <Navigation size={15} /> Open in Google Maps
            </a>
          </section>
        )}

        {position && (
          <div className="flex flex-wrap gap-5 items-start">
            <section className="flex-[999_1_480px] min-w-0 bg-white rounded-[32px] p-3 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
              <div className="rounded-[26px] overflow-hidden h-[480px]">
                <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapFocus position={position} selected={selected} path={route?.path} />
                  {route?.path && <Polyline positions={route.path} pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.8 }} />}
                  <Marker position={[position.lat, position.lng]} icon={USER_ICON}><Popup>You are here</Popup></Marker>
                  {places.map((place) => (
                    <Marker key={place.id} position={[place.lat, place.lng]}
                      icon={place.id === selectedId ? SELECTED_ICON : place.kind === "doctor" ? INTERNAL_ICON : EXTERNAL_ICON}
                      eventHandlers={{ click: () => showRoute(place) }}>
                      <Popup>
                        <div className="text-xs space-y-1">
                          <p className="font-bold">{place.name}</p>
                          {place.subtitle && <p className="text-slate-500">{place.subtitle}</p>}
                          <p className="text-slate-500">{formatDistance(place)}</p>
                          <a href={googleMapsUrl(position, place)} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold flex items-center gap-1 mt-1"><Navigation size={11} /> Open in Google Maps</a>
                          {place.kind === "doctor" && <a href="/SlotBooking" className="text-emerald-700 font-bold block">Book appointment &rarr;</a>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <div className="flex flex-wrap gap-4 px-3 pt-3 pb-1 text-xs font-semibold text-[#6B6A8A]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> You</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> AuraHealth doctors</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Other hospitals</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Selected</span>
              </div>
            </section>

            <section className="flex-[1_1_320px] min-w-0 bg-white rounded-[28px] p-5 shadow-[0_8px_30px_rgba(79,70,229,0.06)] lg:max-h-[560px] flex flex-col">
              <h2 className="mb-3 text-lg font-extrabold">Near you {places.length > 0 && <span className="text-[#6B6A8A] font-bold">· {places.length}</span>}</h2>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {loading && <p className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={14} className="animate-spin" /> Searching nearby…</p>}
                {!loading && results && places.length === 0 && <p className="text-sm text-[#6B6A8A]">No hospitals found within 15 km.</p>}
                {!loading && places.map((place, i) => (
                  <div key={place.id} className={`p-4 rounded-[22px] transition-shadow ${place.id === selectedId ? "bg-[#EEEDFF] shadow-[0_0_0_2px_#4F46E5]" : "bg-[#F6F6FD]"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center ${place.kind === "doctor" ? "text-emerald-600" : "text-orange-600"}`}><MapPin size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold">
                          {place.name}
                          {i === 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E7F7EF] text-[#05603A] text-[11px] font-extrabold align-middle">Nearest</span>}
                        </p>
                        {place.subtitle && <p className="text-xs text-[#6B6A8A] truncate">{place.subtitle}</p>}
                        <p className="text-xs font-semibold text-[#4B4A6B] mt-0.5">{formatDistance(place)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => showRoute(place)} className="flex-1 h-9 rounded-full bg-white text-indigo-700 text-xs font-bold flex items-center justify-center gap-1"><Route size={13} /> Route</button>
                      <a href={googleMapsUrl(position, place)} target="_blank" rel="noreferrer" className="flex-1 h-9 rounded-full bg-[#12B76A] text-white text-xs font-bold flex items-center justify-center gap-1"><Navigation size={13} /> Go</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyHospitals;
