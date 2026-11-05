import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Plus, Trash2, Save, Loader2, ShieldAlert, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const MAX_CONTACTS = 5;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });

const inputClass =
  "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all";

const emptyContact = () => ({ name: "", phone: "", relation: "" });

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/emergency-contacts`, authConfig())
      .then((res) => {
        const list = res.data.contacts || [];
        setContacts(list.length ? list.map((c) => ({ ...c, phone: `+${c.phone}`, relation: c.relation || "" })) : [emptyContact()]);
      })
      .catch(() => setError("Couldn't load your emergency contacts."))
      .finally(() => setLoading(false));
  }, []);

  const update = (i, field, value) => {
    setSaved(false);
    setContacts((list) => list.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };

  const remove = (i) => {
    setSaved(false);
    setContacts((list) => list.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    setError("");
    setSaved(false);
    const toSave = contacts.filter((c) => c.name.trim() || c.phone.trim());
    setSaving(true);
    try {
      const res = await axios.put(`${API}/emergency-contacts`, { contacts: toSave }, authConfig());
      setContacts(res.data.contacts.map((c) => ({ ...c, phone: `+${c.phone}`, relation: c.relation || "" })));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save contacts. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-6 py-10 md:px-10">
      <div className="mb-6">
        <p className="text-[10px] font-bold text-red-500 tracking-[0.2em] uppercase mb-1">Safety</p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
          Emergency <span className="text-red-600">Contacts</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Hold the red SOS button for 2 seconds and these people get a WhatsApp message with your live location.
        </p>
      </div>

      <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_0.8fr_auto] items-center">
                  <input className={inputClass} placeholder="Name" value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
                  <input
                    className={inputClass}
                    placeholder="+91 98765 43210"
                    type="tel"
                    value={c.phone}
                    onChange={(e) => update(i, "phone", e.target.value)}
                  />
                  <input className={inputClass} placeholder="Relation (e.g. Mother)" value={c.relation} onChange={(e) => update(i, "relation", e.target.value)} />
                  <button onClick={() => remove(i)} className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 justify-self-end" aria-label="Remove contact">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button
                onClick={() => { setSaved(false); setContacts((list) => [...list, emptyContact()]); }}
                disabled={contacts.length >= MAX_CONTACTS}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 disabled:opacity-40 hover:bg-slate-200"
              >
                <Plus size={14} /> Add contact {contacts.length >= MAX_CONTACTS && `(max ${MAX_CONTACTS})`}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-40 hover:bg-indigo-700"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
              {saved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Saved
                </span>
              )}
            </div>
            {error && <p className="text-sm text-red-500 font-medium mt-3">{error}</p>}
          </>
        )}
      </div>

      <div className="max-w-2xl mt-4 flex gap-2 text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <ShieldAlert size={16} className="text-amber-600 shrink-0" />
        <p>
          Include the country code (numbers without one are treated as Indian, +91). WhatsApp opens with the message
          ready — you still need to tap Send. In a life-threatening emergency, call 112.
        </p>
      </div>
    </div>
  );
};

export default EmergencyContacts;
