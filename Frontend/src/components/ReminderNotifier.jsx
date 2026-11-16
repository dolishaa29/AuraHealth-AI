import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { Pill, Check, SkipForward, X } from "lucide-react";
import { todayStr, nowTimeStr, toMinutes, formatTime } from "../utils/time";

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });

const CHECK_EVERY_MS = 20 * 1000;
const RELOAD_EVERY_MS = 5 * 60 * 1000;
const DUE_WINDOW_MINUTES = 2;

const shownKey = () => `aura-reminders-shown-${todayStr()}`;
const readShown = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(shownKey()) || "[]"));
  } catch {
    return new Set();
  }
};
const saveShown = (set) => {
  try {
    localStorage.setItem(shownKey(), JSON.stringify([...set]));
  } catch {
    return;
  }
};

const ReminderNotifier = () => {
  const navigate = useNavigate();
  const [due, setDue] = useState([]);
  const dosesRef = useRef([]);
  const shownRef = useRef(readShown());

  const loadDoses = () => {
    axios
      .get(`${API}/reminders/today?date=${todayStr()}`, authConfig())
      .then((res) => {
        dosesRef.current = res.data.doses || [];

        setDue((list) => list.filter((d) => !dosesRef.current.find((x) => x.reminderId === d.reminderId && x.time === d.time && x.status)));
      })
      .catch(() => {});
  };

  const checkClock = () => {
    const now = toMinutes(nowTimeStr());
    for (const dose of dosesRef.current) {
      const key = `${todayStr()}|${dose.reminderId}|${dose.time}`;
      const minutesLate = now - toMinutes(dose.time);
      if (dose.status || shownRef.current.has(key) || minutesLate < 0 || minutesLate > DUE_WINDOW_MINUTES) {
        continue;
      }

      shownRef.current.add(key);
      saveShown(shownRef.current);
      setDue((list) => [...list, dose]);
      navigator.vibrate?.([200, 100, 200]);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(`Time for ${dose.medicine}`, {
            body: [dose.dosage, dose.notes].filter(Boolean).join(" · ") || `Scheduled at ${formatTime(dose.time)}`,
            tag: key,
          });
        } catch (err) {
          console.warn("Browser notification failed", err);
        }
      }
    }
  };

  useEffect(() => {
    loadDoses();
    const clockTimer = setInterval(checkClock, CHECK_EVERY_MS);
    const reloadTimer = setInterval(loadDoses, RELOAD_EVERY_MS);
    window.addEventListener("reminders-changed", loadDoses);
    return () => {
      clearInterval(clockTimer);
      clearInterval(reloadTimer);
      window.removeEventListener("reminders-changed", loadDoses);
    };
  }, []);

  const closeDose = (dose) => setDue((list) => list.filter((d) => d !== dose));

  const markDose = async (dose, status) => {
    closeDose(dose);
    try {
      await axios.post(`${API}/reminders/dose`, { reminderId: dose.reminderId, date: todayStr(), time: dose.time, status }, authConfig());
      window.dispatchEvent(new Event("reminders-changed"));
    } catch {
      setDue((list) => [...list, dose]);
    }
  };

  if (due.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 right-28 sm:right-auto z-40 flex flex-col gap-2 sm:w-80">
      {due.map((dose) => (
        <div key={dose.reminderId + dose.time} role="alert" className="bg-white border border-indigo-100 rounded-[20px] shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Pill size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900">Time for {dose.medicine}</p>
              <p className="text-xs text-slate-400">
                {formatTime(dose.time)}
                {dose.dosage && ` · ${dose.dosage}`}
                {dose.notes && ` · ${dose.notes}`}
              </p>
            </div>
            <button onClick={() => closeDose(dose)} className="p-1 rounded-lg text-slate-300 hover:text-slate-500" aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => markDose(dose, "taken")} className="flex-1 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-700">
              <Check size={13} /> Taken
            </button>
            <button onClick={() => markDose(dose, "skipped")} className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold flex items-center gap-1 hover:bg-slate-100">
              <SkipForward size={13} /> Skip
            </button>
            <button onClick={() => { closeDose(dose); navigate("/reminders"); }} className="px-3 py-2 rounded-xl text-indigo-600 text-xs font-bold hover:bg-indigo-50">
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReminderNotifier;
