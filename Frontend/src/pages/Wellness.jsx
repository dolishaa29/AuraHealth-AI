import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import PhotoScan from "../components/PhotoScan";
import VoiceInput, { VoiceLanguage } from "../components/VoiceInput";

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });
const card = "grid content-start gap-4 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(79,70,229,0.06)] sm:p-6";
const field = "w-full rounded-xl border border-indigo-100 bg-[#F6F6FD] px-3 py-2 text-sm";
const button = "justify-self-start rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";

function MealTools() {
  const [diet, setDiet] = useState("vegetarian");
  const [preferences, setPreferences] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [mealScan, setMealScan] = useState(null);
  const [plan, setPlan] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async (event) => {
    event.preventDefault();
    setError("");
    setPlan([]);
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/wellness/meal-plan`, { diet, preferences, exclusions }, { ...authConfig(), timeout: 60000 });
      setPlan(data.meals);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't generate a meal plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid content-start gap-4">
      <section className={card}>
        <h2 className="text-xl font-extrabold">Scan a meal</h2>
        <p className="text-sm text-[#6B6A8A]">See which foods are visible in your photo. Check the results before using them as meal preferences.</p>
        <PhotoScan path="/wellness/meal-scan" label="Choose a meal photo" onResult={setMealScan} />
        {mealScan && (mealScan.foods.length ? (
          <div className="grid gap-2">
            <p className="text-sm">{mealScan.foods.join(", ")}</p>
            <button type="button" disabled={busy} className="justify-self-start text-sm font-bold text-indigo-700"
              onClick={() => setPreferences(mealScan.foods.join(", ").slice(0, 300))}>Use as meal preferences</button>
          </div>
        ) : <p className="text-sm">No foods recognized. Try a clearer photo.</p>)}
      </section>
      <form className={card} onSubmit={generate}>
        <h2 className="text-xl font-extrabold">One-day meal planner</h2>
        <label className="grid gap-1 text-sm font-semibold">Diet
          <select value={diet} onChange={(e) => setDiet(e.target.value)} className={field}>
            <option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="mixed">Mixed</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Foods you like
          <input className={field} maxLength={300} value={preferences} onChange={(e) => setPreferences(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Ingredients to leave out
          <input className={field} maxLength={300} value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
        </label>
        <button className={button} disabled={busy}>{busy ? "Planning meals…" : "Generate meal ideas"}</button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {plan.length > 0 && <div className="grid gap-2" aria-live="polite">
          {plan.map((meal) => <div key={meal.name} className="rounded-xl bg-indigo-50 p-3 text-sm">
            <h3 className="font-bold capitalize">{meal.name}</h3><p>{meal.idea}</p>
          </div>)}
          <p className="text-xs text-[#6B6A8A]">Check ingredients yourself if you have allergies or a prescribed diet.</p>
        </div>}
      </form>
    </div>
  );
}

function SymptomJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API}/wellness/symptoms`, { ...authConfig(), signal: controller.signal })
      .then(({ data }) => setEntries(data.entries))
      .catch(() => { if (!controller.signal.aborted) setError("Couldn't load your journal."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/wellness/symptoms`, { symptom, severity: Number(severity), notes }, authConfig());
      setEntries((items) => [data.entry, ...items].slice(0, 50));
      setSymptom("");
      setSeverity("");
      setNotes("");
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save the entry.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this journal entry?")) return;
    setError("");
    setBusy(true);
    try {
      await axios.delete(`${API}/wellness/symptoms/${id}`, authConfig());
      setEntries((items) => items.filter((item) => item._id !== id));
    } catch {
      setError("Couldn't delete the entry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-xl font-extrabold">Symptom journal</h2>
      <form onSubmit={save} className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">Symptom
          <input className={field} required maxLength={120} value={symptom} onChange={(e) => setSymptom(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Severity
          <select className={field} required value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Choose severity</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}{n === 1 ? " · Mild" : n === 5 ? " · Severe" : ""}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Notes
          <textarea className={field} rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <VoiceLanguage value={language} onChange={setLanguage} disabled={busy} />
          <VoiceInput key={language} language={language} disabled={busy}
            onTranscript={(value) => setNotes((current) => [current, value].filter(Boolean).join(" ").slice(0, 1000))} />
        </div>
        <button className={button} disabled={busy || loading || !symptom.trim()}>{busy ? "Working…" : "Save entry"}</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid gap-2">
        <h3 className="font-bold">Recent entries</h3>
        {loading && <p role="status" className="text-sm">Loading journal…</p>}
        {!loading && !entries.length && !error && <p className="text-sm text-[#6B6A8A]">No journal entries yet.</p>}
        {entries.map((entry) => <article key={entry._id} className="grid gap-1 rounded-xl bg-indigo-50 p-3 text-sm">
          <h4 className="break-words font-bold">{entry.symptom} · {entry.severity}/5</h4>
          <time dateTime={entry.createdAt} className="text-xs text-[#6B6A8A]">{new Date(entry.createdAt).toLocaleString()}</time>
          {entry.notes && <p className="whitespace-pre-wrap break-words">{entry.notes}</p>}
          <button type="button" disabled={busy} onClick={() => remove(entry._id)} className="justify-self-start font-semibold text-red-700">Delete entry</button>
        </article>)}
      </div>
    </section>
  );
}

export default function Wellness() {
  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <h1 className="mb-5 text-[28px] font-extrabold tracking-tight sm:text-[32px]">Meals and symptoms</h1>
      <div className="grid items-start gap-4 pb-24 xl:grid-cols-2"><MealTools /><SymptomJournal /></div>
    </div>
  );
}
