import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Camera, Pill, Plus, Trash2, Pencil, Pause, Play, Check, Undo2, Mail, BellRing, Loader2, X } from "lucide-react";
import { todayStr, nowTimeStr, toMinutes, formatTime, formatDate, myTimezone } from "../utils/time";
import PhotoScan from "../components/PhotoScan";

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });
const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const inputCls = "w-full h-12 px-4 rounded-[18px] bg-[#F6F6FD] border-2 border-transparent text-sm font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white";
const PASTELS = ["bg-[#EEEDFF]", "bg-[#FFF0E6]", "bg-[#E6F1FF]", "bg-[#E7F7EF]"];

const emptyForm = () => ({ medicine: "", dosage: "", times: ["08:00"], startDate: todayStr(), endDate: "", notes: "", emailAlert: false });
const announceChange = () => window.dispatchEvent(new Event("reminders-changed"));
const partOfDay = (time) => (toMinutes(time) < 12 * 60 ? "Morning" : toMinutes(time) < 17 * 60 ? "Afternoon" : "Night");

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [today, setToday] = useState({ doses: [], adherence: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [medicineLabel, setMedicineLabel] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanDrafts, setScanDrafts] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [notifyPermission, setNotifyPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const loadAll = async () => {
    try {
      const [listRes, todayRes] = await Promise.all([
        axios.get(`${API}/reminders`, authConfig()),
        axios.get(`${API}/reminders/today?date=${todayStr()}`, authConfig()),
      ]);
      setReminders(listRes.data.reminders);
      setToday({ doses: todayRes.data.doses, adherence: todayRes.data.adherence });
      setError("");
    } catch {
      setError("Couldn't load your medicines. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    window.addEventListener("reminders-changed", loadAll);
    return () => window.removeEventListener("reminders-changed", loadAll);
  }, []);

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const markDose = async (dose, status) => {
    try {
      await axios.post(`${API}/reminders/dose`, { reminderId: dose.reminderId, date: todayStr(), time: dose.time, status }, authConfig());
      announceChange();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't update that dose.");
    }
  };

  const openNewForm = () => { setEditingId(null); setForm(emptyForm()); setFormError(""); setFormOpen(true); };
  const openEditForm = (r) => {
    setEditingId(r._id);
    setForm({ medicine: r.medicine, dosage: r.dosage || "", times: r.times, startDate: r.startDate, endDate: r.endDate || "", notes: r.notes || "", emailAlert: r.emailAlert });
    setFormError("");
    setFormOpen(true);
  };
  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateTime = (i, value) => setForm((f) => ({ ...f, times: f.times.map((t, idx) => (idx === i ? value : t)) }));

  const reviewDraft = (drafts) => {
    setScanDrafts(drafts);
    setFormError("");
    setFormOpen(drafts.length > 0);
    if (!drafts.length) {
      setPhotoUrl("");
      return;
    }
    setEditingId(null);
    const { medicine, dosage, instructions } = drafts[0];
    setForm({ ...emptyForm(), medicine, dosage, notes: instructions, times: [""] });
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setScanDrafts([]);
    setPhotoUrl("");
  };

  const scanPhoto = async (event) => {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (!photo) return;
    setScanError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024) {
      setScanError("Choose a JPEG, PNG, or WebP photo no larger than 5 MB.");
      return;
    }
    setScanning(true);
    try {
      const data = new FormData();
      data.append("photo", photo);
      const { data: { medicines } } = await axios.post(`${API}/reminders/scan`, data, authConfig());
      if (!medicines.length) {
        setScanError("No readable medicines found. Try a clearer photo or add them manually.");
        return;
      }
      setPhotoUrl(URL.createObjectURL(photo));
      reviewDraft(medicines);
    } catch (err) {
      setScanError(err.response?.data?.msg || "Couldn't scan the prescription. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const saveForm = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const body = { ...form, endDate: form.endDate || null, timezone: myTimezone() };
    try {
      if (editingId) await axios.put(`${API}/reminders/${editingId}`, body, authConfig());
      else await axios.post(`${API}/reminders`, body, authConfig());
      if (scanDrafts.length) reviewDraft(scanDrafts.slice(1));
      else setFormOpen(false);
      announceChange();
    } catch (err) {
      setFormError(err.response?.data?.msg || "Couldn't save the reminder.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r) => {
    await axios.put(`${API}/reminders/${r._id}`, { active: !r.active }, authConfig()).catch(() => setError("Couldn't update the reminder."));
    announceChange();
  };
  const deleteReminder = async (r) => {
    if (!window.confirm(`Delete the reminder for ${r.medicine}?`)) return;
    await axios.delete(`${API}/reminders/${r._id}`, authConfig()).catch(() => setError("Couldn't delete the reminder."));
    announceChange();
  };

  const nowMin = toMinutes(nowTimeStr());
  const taken = today.doses.filter((d) => d.status === "taken").length;
  const total = today.doses.length;
  const nextDue = today.doses.find((d) => !d.status);
  const ring = 2 * Math.PI * 52;
  const groups = ["Morning", "Afternoon", "Night"]
    .map((name) => ({ name, doses: today.doses.filter((d) => partOfDay(d.time) === name) }))
    .filter((g) => g.doses.length);

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_300px]">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Your medicines</h1>
            <p className="mt-1.5 text-[15px] text-[#6B6A8A]">We'll nudge you at the right time, every time.</p>
          </div>
          <label className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-white text-indigo-700 text-sm font-bold cursor-pointer focus-within:ring-2 focus-within:ring-indigo-400">
            {scanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            <span role="status">{scanning ? "Reading prescription…" : "Scan prescription"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={scanning || formOpen} onChange={scanPhoto} className="sr-only" />
          </label>
          <button onClick={openNewForm} disabled={scanning || formOpen} className="inline-flex items-center gap-2 h-12 px-[22px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-bold shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)] disabled:opacity-50">
            <Plus size={18} strokeWidth={2.4} /> Add medicine
          </button>
        </div>
        <section className={`${CARD} grid gap-2 p-5`}>
          <h2 className="text-lg font-extrabold">Medicine detector</h2>
          <p className="text-sm text-[#6B6A8A]">Scan the printed label on one box or blister pack and compare it with your reminders.</p>
          <PhotoScan path="/reminders/scan-label" label="Choose a package photo" onResult={setMedicineLabel} />
          {medicineLabel && (medicineLabel.medicine ? (
            <div className="grid gap-1 rounded-xl bg-indigo-50 p-3 text-sm" aria-live="polite">
              <p>Text read from package <strong>{medicineLabel.medicine}{medicineLabel.strength && ` · ${medicineLabel.strength}`}</strong></p>
              <p>Compare the name and strength with the original package. Reminder matches use the name only.</p>
              {medicineLabel.matches.length ? (
                <ul className="list-disc pl-5">
                  {medicineLabel.matches.map((match) => <li key={match._id}>{match.medicine}{match.dosage && ` · ${match.dosage}`} · {match.times.map(formatTime).join(", ")}</li>)}
                </ul>
              ) : <p>No active reminders with the same name.</p>}
            </div>
          ) : <p className="text-sm" role="status">No readable package label found. Try a clearer photo of one box or blister pack.</p>)}
        </section>
        {scanError && <p role="alert" className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{scanError}</p>}

        {notifyPermission === "default" && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 rounded-[22px] bg-[#EEEDFF] text-[#312E81]">
            <BellRing size={20} />
            <p className="flex-1 text-sm font-semibold">Turn on pop-up reminders so you never miss a dose.</p>
            <button onClick={async () => setNotifyPermission(await Notification.requestPermission())} className="h-10 px-5 rounded-full bg-indigo-600 text-white text-sm font-bold">Turn on</button>
          </div>
        )}
        {error && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[32px] bg-[#E7F7EF] p-7 flex flex-wrap items-center gap-7">
              <div aria-hidden="true" className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-[#D1F2E1]" />
              <div className="relative w-[132px] h-[132px]">
                <svg viewBox="0 0 120 120" width="132" height="132" role="img" aria-label={`${taken} of ${total} doses taken`} className="-rotate-90">
                  <circle cx="60" cy="60" r="52" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="12" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#12B76A" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${total ? (taken / total) * ring : 0} ${ring}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[30px] font-extrabold text-[#054F31]">{taken}/{total}</span>
                  <span className="text-xs font-bold text-[#05603A]">today</span>
                </div>
              </div>
              <div className="relative flex-[1_1_280px] text-[#05603A]">
                <h2 className="text-2xl font-extrabold text-[#054F31]">{total === 0 ? "Nothing scheduled today" : taken === total ? "All done for today!" : "Nice going"}</h2>
                <p className="mt-1.5 text-[15px]">
                  {nextDue ? `Next up: ${nextDue.medicine} at ${formatTime(nextDue.time)}.` : total ? "You've taken every dose. See you tomorrow." : "Add a medicine to start your plan."}
                </p>
                {today.adherence?.percent != null && (
                  <span className="inline-flex mt-3.5 px-3.5 py-1.5 rounded-full bg-white text-sm font-extrabold">{today.adherence.percent}% taken over the last 7 days</span>
                )}
              </div>
            </section>

            <div className="flex flex-wrap gap-5 items-start">
              <section className={`${CARD} flex-[999_1_460px] min-w-0 p-6 flex flex-col gap-[18px]`}>
                <h2 className="text-xl font-extrabold">Today's plan</h2>
                {groups.length === 0 && <p className="py-6 text-center text-sm text-[#6B6A8A]">No doses scheduled for today.</p>}
                {groups.map((g) => (
                  <div key={g.name} className="flex flex-col gap-2.5">
                    <p className={`text-sm font-extrabold ${g.name === "Night" ? "text-[#3730A3]" : "text-[#B45309]"}`}>{g.name}</p>
                    {g.doses.map((d) => {
                      const due = !d.status && toMinutes(d.time) <= nowMin;
                      return (
                        <div key={d.reminderId + d.time} className={`flex flex-wrap items-center gap-3.5 px-4 py-3.5 rounded-[20px] ${due ? "bg-[#FFF4E5]" : "bg-[#F6F6FD]"}`}>
                          {d.status === "taken" ? (
                            <span className="w-10 h-10 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center"><Check size={18} strokeWidth={3} /></span>
                          ) : (
                            <span className={`w-10 h-10 shrink-0 rounded-full bg-white border-2 ${due ? "border-dashed border-amber-500" : "border-[#E4E3F5]"}`} />
                          )}
                          <div className="flex-[1_1_160px] min-w-0">
                            <p className="text-[15px] font-bold truncate">{d.medicine}{d.dosage ? ` · ${d.dosage}` : ""}</p>
                            <p className={`text-[13px] ${due ? "font-semibold text-[#B45309]" : "text-[#6B6A8A]"}`}>
                              {formatTime(d.time)} · {d.status === "taken" ? "taken" : d.status === "skipped" ? "skipped" : due ? "it's time" : d.notes || "later"}
                            </p>
                          </div>
                          {d.status ? (
                            <button onClick={() => markDose(d, null)} className="h-9 px-3.5 rounded-full text-indigo-600 text-[13px] font-bold flex items-center gap-1 hover:bg-white"><Undo2 size={14} /> Undo</button>
                          ) : (
                            <>
                              <button onClick={() => markDose(d, "taken")} className="h-[42px] px-[18px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">I took it</button>
                              <button onClick={() => markDose(d, "skipped")} className="h-[42px] px-4 rounded-full bg-white text-[#4B4A6B] text-sm font-bold">Skip</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </section>

              <section className={`${CARD} flex-[1_1_300px] min-w-0 p-6 flex flex-col gap-2.5`}>
                <h2 className="mb-1 text-lg font-extrabold">Medicine cabinet</h2>
                {reminders.length === 0 && (
                  <div className="py-6 text-center"><Pill size={28} className="mx-auto mb-2 text-[#C9C8E0]" /><p className="text-sm text-[#6B6A8A]">No medicines yet.</p></div>
                )}
                {reminders.map((r, i) => (
                  <div key={r._id} className={`flex items-center gap-3 px-3.5 py-3 rounded-[20px] ${r.active ? PASTELS[i % PASTELS.length] : "bg-[#F6F6FD] opacity-75"}`}>
                    <span className="w-10 h-10 shrink-0 rounded-[14px] bg-white text-indigo-600 flex items-center justify-center">{r.active ? <Pill size={18} /> : <Pause size={18} />}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold truncate">{r.medicine}{r.dosage ? ` · ${r.dosage}` : ""}</p>
                      <p className="text-xs text-[#4B4A6B] truncate">
                        {r.active ? r.times.map(formatTime).join(", ") : "Paused"} · {r.endDate ? `until ${formatDate(r.endDate)}` : "ongoing"}
                        {r.emailAlert && <Mail size={11} className="inline ml-1" />}
                      </p>
                    </div>
                    <button onClick={() => toggleActive(r)} aria-label={r.active ? "Pause" : "Resume"} className="w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center">{r.active ? <Pause size={14} /> : <Play size={14} />}</button>
                    <button onClick={() => openEditForm(r)} disabled={scanning || formOpen} aria-label="Edit" className="w-9 h-9 rounded-full bg-white/70 hover:bg-white flex items-center justify-center"><Pencil size={14} /></button>
                    <button onClick={() => deleteReminder(r)} aria-label="Delete" className="w-9 h-9 rounded-full bg-white/70 hover:bg-white hover:text-[#B42318] flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                ))}
              </section>
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="medicine-form-title" className="fixed inset-0 z-50 bg-[#1E1B4B]/40 flex items-end sm:items-center justify-center p-4" onClick={closeForm}>
          <form onSubmit={saveForm} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-[32px] p-6 sm:p-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 id="medicine-form-title" className="text-xl font-extrabold">{scanDrafts.length ? "Review prescription" : editingId ? "Edit medicine" : "Add a medicine"}</h2>
              <button type="button" onClick={closeForm} disabled={saving} aria-label="Close" className="w-10 h-10 rounded-full bg-[#F6F6FD] flex items-center justify-center"><X size={18} /></button>
            </div>
            {scanDrafts.length > 0 && (
              <div className="rounded-[18px] bg-[#F6F6FD] p-4 text-sm text-[#4B4A6B]">
                <p>Check the extracted details against your photo, then choose reminder times and dates.</p>
                <p className="mt-2">Frequency read from photo <strong>{scanDrafts[0].frequency || "Unavailable"}</strong></p>
                <p>Duration read from photo <strong>{scanDrafts[0].duration || "Unavailable"}</strong></p>
                <details className="mt-2">
                  <summary className="cursor-pointer font-bold text-indigo-700">View prescription photo</summary>
                  <img src={photoUrl} alt="Your uploaded prescription" className="mt-2 w-full rounded-lg" />
                </details>
                <p className="mt-2" role="status">{scanDrafts.length} {scanDrafts.length === 1 ? "medicine" : "medicines"} left to review</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-bold">Medicine *<input className={inputCls} placeholder="e.g. Paracetamol" value={form.medicine} onChange={(e) => updateField("medicine", e.target.value)} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">Dosage<input className={inputCls} placeholder="1 tablet, 5 ml" value={form.dosage} onChange={(e) => updateField("dosage", e.target.value)} /></label>
            </div>
            <div className="flex flex-col gap-1.5 text-sm font-bold">
              Times *
              <div className="flex flex-wrap gap-2">
                {form.times.map((t, i) => (
                  <span key={i} className="flex items-center gap-1 px-1 rounded-full bg-[#EEEDFF]">
                    <input type="time" required value={t} onChange={(e) => updateTime(i, e.target.value)} aria-label={`Time ${i + 1}`} className="h-10 px-3 rounded-full bg-transparent text-sm font-bold text-[#312E81] focus:outline-none" />
                    {form.times.length > 1 && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, times: f.times.filter((_, idx) => idx !== i) }))} aria-label="Remove time" className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center"><X size={14} /></button>
                    )}
                  </span>
                ))}
                {form.times.length < 6 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, times: [...f.times, "20:00"] }))} className="h-10 px-4 rounded-full border-2 border-dashed border-[#C4C1F5] text-indigo-600 text-sm font-bold flex items-center gap-1"><Plus size={14} /> Add time</button>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-bold">Start date *<input type="date" required className={inputCls} value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} /></label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">End date<input type="date" className={inputCls} min={form.startDate} value={form.endDate} onChange={(e) => updateField("endDate", e.target.value)} /></label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-bold">Notes<input className={inputCls} placeholder="e.g. after food" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} /></label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-[18px] bg-[#F6F6FD] text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={form.emailAlert} onChange={(e) => updateField("emailAlert", e.target.checked)} className="w-5 h-5 accent-indigo-600" />
              <Mail size={16} /> Also email me at each dose time
            </label>
            {formError && <p className="px-4 py-2.5 rounded-[18px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{formError}</p>}
            <button type="submit" disabled={saving} className="h-[52px] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} {scanDrafts.length ? "Confirm and save reminder" : editingId ? "Save changes" : "Add medicine"}
            </button>
            {scanDrafts.length > 0 && (
              <button type="button" disabled={saving} onClick={() => reviewDraft(scanDrafts.slice(1))} className="text-sm font-bold text-indigo-700">
                Skip this medicine
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default Reminders;
