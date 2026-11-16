import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Plus, Trash2, Loader2, CheckCircle2, Phone, MessageCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const MAX_CONTACTS = 5;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });
const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";
const inputCls = "w-full h-11 px-4 rounded-full bg-[#F6F6FD] border-2 border-transparent text-sm font-medium text-[#1E1B4B] placeholder:text-[#9A99B5] focus:outline-none focus:border-indigo-300 focus:bg-white";
const AVATARS = ["bg-[#FFF0E6] text-[#9A3412]", "bg-[#E6F1FF] text-[#1E40AF]", "bg-[#E7F7EF] text-[#05603A]", "bg-[#EEEDFF] text-[#3730A3]", "bg-[#FFECEB] text-[#B42318]"];

const emptyContact = () => ({ name: "", phone: "", relation: "" });
const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const digits = (phone) => phone.replace(/\D/g, "");

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/emergency-contacts`, authConfig())
      .then((res) => {
        const list = res.data.contacts || [];
        setUserName(res.data.name || "");
        setContacts(list.length ? list.map((c) => ({ ...c, phone: `+${c.phone}`, relation: c.relation || "" })) : [emptyContact()]);
      })
      .catch(() => setError("Couldn't load your emergency contacts."))
      .finally(() => setLoading(false));
  }, []);

  const update = (i, field, value) => {
    setSaved(false);
    setContacts((list) => list.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };
  const remove = (i) => { setSaved(false); setContacts((list) => list.filter((_, idx) => idx !== i)); };

  const save = async () => {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const toSave = contacts.filter((c) => c.name.trim() || c.phone.trim());
      const res = await axios.put(`${API}/emergency-contacts`, { contacts: toSave }, authConfig());
      setContacts(res.data.contacts.map((c) => ({ ...c, phone: `+${c.phone}`, relation: c.relation || "" })));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save contacts. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const firstName = userName.split(" ")[0] || "I";

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Safety &amp; SOS</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">The people who'll hear from you first if something goes wrong.</p>
        </div>

        <section className="relative overflow-hidden rounded-[32px] bg-[#FFECEB] p-7 sm:p-8 flex flex-wrap items-center gap-8">
          <div aria-hidden="true" className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-[#FFDAD7]" />
          <div className="relative w-[150px] h-[150px] rounded-full bg-[#FFDAD7] flex items-center justify-center">
            <div className="w-[104px] h-[104px] rounded-full bg-[#F04438] text-white flex items-center justify-center text-2xl font-extrabold shadow-[0_16px_30px_rgba(240,68,56,0.35)]">SOS</div>
          </div>
          <div className="relative flex-[1_1_320px] text-[#7A271A]">
            <h2 className="text-[26px] font-extrabold tracking-tight">Hold for 2 seconds. That's it.</h2>
            <ol className="mt-4 flex flex-col gap-2.5">
              {["Press and hold the red button on any page", "WhatsApp opens with your live location", "Tap Send, or call 112 right from the panel"].map((step, i) => (
                <li key={step} className="flex gap-3 items-center text-[15px] font-semibold">
                  <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-white flex items-center justify-center text-[13px] font-extrabold">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {error && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}

        <div className="flex flex-wrap gap-5 items-start">

          <section className="flex-[999_1_460px] min-w-0 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Your circle · {contacts.filter((c) => c.name.trim()).length} of {MAX_CONTACTS}</h2>
              <div className="flex items-center gap-3">
                {saved && <span className="flex items-center gap-1 text-sm font-bold text-[#05603A]"><CheckCircle2 size={16} /> Saved</span>}
                <button onClick={save} disabled={saving || loading} className="h-11 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save changes
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
                {contacts.map((c, i) => (
                  <article key={c._id || i} className={`${CARD} p-5 flex flex-col gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg font-extrabold ${AVATARS[i % AVATARS.length]}`}>{initials(c.name)}</div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <input aria-label="Name" className={inputCls} placeholder="Name" value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
                      </div>
                      <button onClick={() => remove(i)} aria-label="Remove contact" className="w-10 h-10 shrink-0 rounded-full bg-[#F6F6FD] text-[#6B6A8A] hover:bg-[#FFECEB] hover:text-[#B42318] flex items-center justify-center"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input aria-label="Phone" type="tel" className={inputCls} placeholder="+91 98765 43210" value={c.phone} onChange={(e) => update(i, "phone", e.target.value)} />
                      <input aria-label="Relation" className={inputCls} placeholder="Mom, brother…" value={c.relation} onChange={(e) => update(i, "relation", e.target.value)} />
                    </div>
                    {c._id && digits(c.phone).length >= 10 && (
                      <div className="flex gap-2">
                        <a href={`https://wa.me/${digits(c.phone)}`} target="_blank" rel="noreferrer" className="flex-1 h-10 rounded-full bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center justify-center gap-1.5"><MessageCircle size={15} /> WhatsApp</a>
                        <a href={`tel:+${digits(c.phone)}`} className="flex-1 h-10 rounded-full bg-[#F6F6FD] text-[#3730A3] text-sm font-bold flex items-center justify-center gap-1.5"><Phone size={15} /> Call</a>
                      </div>
                    )}
                  </article>
                ))}
                {contacts.length < MAX_CONTACTS && (
                  <button onClick={() => { setSaved(false); setContacts((l) => [...l, emptyContact()]); }} className="min-h-[150px] rounded-[28px] border-2 border-dashed border-[#C4C1F5] bg-white text-indigo-600 flex flex-col items-center justify-center gap-2.5 hover:bg-[#F6F6FD]">
                    <span className="w-12 h-12 rounded-full bg-[#EEEDFF] flex items-center justify-center"><Plus size={22} strokeWidth={2.4} /></span>
                    <span className="text-[15px] font-extrabold">Add someone you trust</span>
                  </button>
                )}
              </div>
            )}
            <p className="text-[13px] text-[#6B6A8A]">Include the country code. Numbers without one are treated as Indian (+91).</p>
          </section>

          <section className={`${CARD} flex-[1_1_300px] min-w-0 p-6 flex flex-col gap-3.5`}>
            <h2 className="text-lg font-extrabold">What they'll receive</h2>
            <div className="self-start px-[18px] py-4 rounded-[22px_22px_22px_6px] bg-[#E7F7EF] text-[#054F31] text-sm leading-relaxed">
              <strong>SOS: {firstName} needs help urgently!</strong><br />
              Live location: a Google Maps link<br />
              The date and time<br />
              Please call or reach me as soon as possible.
            </div>
            <a href="tel:112" className="h-12 rounded-full bg-[#FFECEB] text-[#B42318] text-[15px] font-extrabold flex items-center justify-center gap-2"><Phone size={16} /> Call 112 (Emergency)</a>
          </section>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts;
