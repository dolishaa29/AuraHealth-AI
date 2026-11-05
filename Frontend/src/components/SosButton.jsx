import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Siren, X, Phone, MessageCircle, Loader2, MapPin, Users } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const HOLD_MS = 2000;

const buildMessage = (name, position) => {
  const time = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const location = position
    ? `📍 Live location: https://maps.google.com/?q=${position.lat},${position.lng}`
    : "📍 Location unavailable";
  return [
    `🚨 SOS — ${name || "I"} need${name ? "s" : ""} help urgently!`,
    location,
    `🕒 ${time}`,
    "Please call or reach me as soon as possible.",
    "— Sent via AuraHealth",
  ].join("\n");
};

const waAll = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
const waTo = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

const readPosition = (onDone) => {
  if (!navigator.geolocation) return onDone(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => onDone({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => onDone(null),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
};

// Hold-to-trigger: releasing the button is a real user gesture, so WhatsApp can open immediately
// without the browser blocking it as a popup — and a quick accidental tap does nothing.
const SosButton = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", contacts: [] });
  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const armed = useRef(false);
  const holdTimer = useRef(null);
  const positionRef = useRef(null);

  const updatePosition = (p) => {
    positionRef.current = p;
    setPosition(p);
    setLocating(false);
  };

  useEffect(() => {
    axios
      .get(`${API}/emergency-contacts`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
        withCredentials: true,
      })
      .then((res) => res.data.success && setProfile({ name: res.data.name, contacts: res.data.contacts }))
      .catch(() => {});

    // Warm up the location only if the user already allowed it, so the page never prompts on load.
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => status.state === "granted" && readPosition(updatePosition))
      .catch(() => {});
  }, []);

  const startHold = (e) => {
    e.preventDefault();
    armed.current = false;
    setHint(false);
    setHolding(true);
    if (!positionRef.current) {
      setLocating(true);
      readPosition(updatePosition);
    }
    holdTimer.current = setTimeout(() => {
      armed.current = true;
      navigator.vibrate?.(200);
    }, HOLD_MS);
  };

  const trigger = (openWhatsApp) => {
    setPanelOpen(true);
    if (openWhatsApp && profile.contacts.length && positionRef.current) {
      window.open(waAll(buildMessage(profile.name, positionRef.current)), "_blank", "noopener,noreferrer");
    }
  };

  const endHold = (released) => {
    clearTimeout(holdTimer.current);
    setHolding(false);
    if (armed.current) {
      armed.current = false;
      trigger(released);
    } else if (released) {
      setHint(true);
      setTimeout(() => setHint(false), 2500);
    }
  };

  const message = buildMessage(profile.name, position);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {hint && (
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg">
            Hold for 2 seconds to send SOS
          </span>
        )}
        <button
          onPointerDown={startHold}
          onPointerUp={() => endHold(true)}
          onPointerLeave={() => holding && endHold(false)}
          onPointerCancel={() => endHold(false)}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !e.repeat && (e.preventDefault(), trigger(false))}
          aria-label="Emergency SOS — hold for 2 seconds"
          className="relative w-16 h-16 rounded-full bg-red-600 text-white shadow-xl shadow-red-200 flex items-center justify-center select-none touch-none overflow-hidden active:scale-95 transition-transform"
        >
          <span
            className="absolute inset-0 bg-red-800 origin-bottom"
            style={{
              transform: `scaleY(${holding ? 1 : 0})`,
              transition: holding ? `transform ${HOLD_MS}ms linear` : "transform 150ms ease-out",
            }}
          />
          <span className="relative flex flex-col items-center leading-none">
            <Siren size={22} />
            <span className="text-[10px] font-black tracking-wider mt-0.5">SOS</span>
          </span>
        </button>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-4" onClick={() => setPanelOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 text-white px-5 py-4 flex items-center gap-3">
              <Siren size={22} />
              <div className="flex-1">
                <p className="font-black tracking-tight">Emergency SOS</p>
                <p className="text-xs text-red-100 flex items-center gap-1">
                  {locating ? (
                    <><Loader2 size={11} className="animate-spin" /> Getting your location…</>
                  ) : position ? (
                    <><MapPin size={11} /> Live location attached</>
                  ) : (
                    "Location unavailable — allow location access for a map link"
                  )}
                </p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1.5 rounded-lg hover:bg-red-700" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <a
                href="tel:112"
                className="w-full py-3 rounded-2xl bg-red-50 text-red-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100"
              >
                <Phone size={16} /> Call 112 (Emergency)
              </a>

              {profile.contacts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500 mb-3">You haven't added any emergency contacts yet.</p>
                  <button
                    onClick={() => { setPanelOpen(false); navigate("/emergency-contacts"); }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider"
                  >
                    Add contacts
                  </button>
                </div>
              ) : (
                <>
                  <a
                    href={waAll(message)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700"
                  >
                    <Users size={16} /> Send to all on WhatsApp
                  </a>
                  <p className="text-[11px] text-slate-400 text-center -mt-1">WhatsApp opens with the message ready — pick your contacts and tap Send.</p>

                  <div className="pt-2 space-y-2">
                    {profile.contacts.map((c) => (
                      <div key={c._id || c.phone} className="flex items-center gap-2 rounded-2xl border border-slate-100 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.relation ? `${c.relation} · ` : ""}+{c.phone}</p>
                        </div>
                        <a href={`tel:+${c.phone}`} className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100" aria-label={`Call ${c.name}`}>
                          <Phone size={15} />
                        </a>
                        <a
                          href={waTo(c.phone, message)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SosButton;
