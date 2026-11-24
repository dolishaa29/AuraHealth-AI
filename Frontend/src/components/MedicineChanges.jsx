import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { formatTime, myTimezone, todayStr } from "../utils/time";

const API = import.meta.env.VITE_API_URL;
const field = "w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm";
const button = "rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const emptyInstruction = { action: "start", medicine: "", dosage: "", directions: "" };
const titles = { start: "Start", stop: "Stop", change: "Change" };
const medicineKey = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

export default function MedicineChanges({ appointment, doctor = false, canPublish = false }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-800">
        {open ? "Hide medicine changes" : "Medicine changes"}
      </button>
      {open && <MedicineChangeLog appointment={appointment} doctor={doctor} canPublish={canPublish} />}
    </div>
  );
}

function MedicineChangeLog({ appointment, doctor, canPublish }) {
  const url = `${API}/appointment/${appointment._id}/medicine-changes`;
  const token = Cookies.get(doctor ? "emstoken" : "token");
  const [changes, setChanges] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [instruction, setInstruction] = useState(emptyInstruction);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const config = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true, signal: controller.signal };
    Promise.all([
      axios.get(doctor ? `${url}/doctor` : url, config),
      doctor ? null : axios.get(`${API}/reminders`, config),
    ]).then(([log, medicines]) => {
      if (controller.signal.aborted) return;
      setChanges(log.data.changes);
      setReminders(medicines?.data.reminders ?? []);
    }).catch(() => {
      if (!controller.signal.aborted) setError("Couldn't load medicine changes. Close this panel and try again.");
    });
    return () => controller.abort();
  }, [doctor, token, url]);

  const publish = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await axios.post(url, instruction, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      setChanges((items) => [data.change, ...items]);
      setInstruction(emptyInstruction);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't publish the medicine change.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` }, withCredentials: true };
      const { data } = await axios.put(`${url}/${review.id}/apply`, { ...review, timezone: myTimezone() }, config);
      setChanges((items) => items.map((item) => item._id === data.change._id ? data.change : item));
      setReview(null);
      window.dispatchEvent(new Event("reminders-changed"));
      const list = await axios.get(`${API}/reminders`, config);
      setReminders(list.data.reminders);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't refresh the schedule. Reopen this panel to check the current status.");
    } finally {
      setBusy(false);
    }
  };

  const updateInstruction = (event) => setInstruction({ ...instruction, [event.target.name]: event.target.value });
  const updateReview = (values) => setReview((current) => ({ ...current, ...values }));

  return (
    <section aria-label="Medicine change log" className="mt-3 grid gap-3 rounded-2xl bg-white p-4 text-sm text-[#312E81]">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!changes && !error && <p role="status">Loading medicine changes…</p>}
      {changes?.length === 0 && <p>No medicine changes have been published for this visit.</p>}
      {changes?.map((change) => {
        const matches = reminders.filter((item) => item.active && medicineKey(item.medicine) === medicineKey(change.medicine));
        const selected = matches.find((item) => item._id === review?.reminderId);
        const needsSchedule = change.action !== "stop";
        return (
          <article key={change._id} className="grid gap-2 rounded-xl bg-[#F6F6FD] p-3">
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-extrabold">{titles[change.action]} {change.medicine}{change.dosage && ` · ${change.dosage}`}</h3>
              <span>{change.status === "applied" ? "Reminder updated" : "Awaiting patient confirmation"}</span>
            </div>
            <p className="whitespace-pre-wrap break-words">{change.directions}</p>
            {!doctor && change.status === "pending" && review?.id !== change._id && (
              <button type="button" disabled={busy} className="justify-self-start font-bold text-indigo-700" onClick={() => {
                setError("");
                setReview({ id: change._id, reminderId: "", times: [""], startDate: todayStr(), endDate: "" });
              }}>Review reminder update</button>
            )}
            {review?.id === change._id && (
              <form onSubmit={apply} className="grid gap-3 border-t border-indigo-100 pt-3">
                {change.action !== "start" && (
                  <label className="grid gap-1">Reminder to {change.action === "stop" ? "pause" : "update"}
                    <select required className={field} value={review.reminderId} onChange={(event) => {
                      const item = matches.find((match) => match._id === event.target.value);
                      updateReview({ reminderId: event.target.value, times: item?.times ?? [""], endDate: item?.endDate ?? "" });
                    }}>
                      <option value="">{matches.length ? "Select a matching reminder" : "No active matching reminders"}</option>
                      {matches.map((item) => <option key={item._id} value={item._id}>{item.medicine} · {item.dosage || "No dose set"} · {item.times.map(formatTime).join(", ")}</option>)}
                    </select>
                  </label>
                )}
                {needsSchedule && (change.action === "start" || selected) && (
                  <>
                    <div className="flex flex-wrap items-end gap-2">
                      {review.times.map((time, index) => (
                        <div key={index}>
                          <label className="grid gap-1">Time {index + 1}
                            <input required type="time" className={field} value={time} onChange={(event) =>
                              updateReview({ times: review.times.map((value, i) => i === index ? event.target.value : value) })} />
                          </label>
                          {review.times.length > 1 && <button type="button" className="mt-1 text-indigo-700" onClick={() =>
                            updateReview({ times: review.times.filter((_, i) => i !== index) })}>Remove time {index + 1}</button>}
                        </div>
                      ))}
                      {review.times.length < 6 && <button type="button" className="font-bold text-indigo-700" onClick={() =>
                        updateReview({ times: [...review.times, ""] })}>Add time</button>}
                    </div>
                    {change.action === "start" && <label className="grid gap-1">Start date
                      <input required type="date" min={todayStr()} className={field} value={review.startDate} onChange={(event) => updateReview({ startDate: event.target.value })} />
                    </label>}
                    <label className="grid gap-1">End date (optional)
                      <input type="date" min={change.action === "start" ? review.startDate : todayStr()} className={field}
                        value={review.endDate} onChange={(event) => updateReview({ endDate: event.target.value })} />
                    </label>
                  </>
                )}
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className={button} disabled={busy || (change.action !== "start" && !selected)}>
                    {busy ? "Saving…" : { start: "Confirm and add reminder", stop: "Confirm and pause reminder", change: "Confirm and update reminder" }[change.action]}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setReview(null)}>Cancel</button>
                </div>
              </form>
            )}
          </article>
        );
      })}
      {doctor && canPublish && changes && (
        <form onSubmit={publish} className="grid gap-3">
          <h3 className="font-extrabold">Publish a medicine change</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">Action
              <select name="action" className={field} value={instruction.action} onChange={updateInstruction}>
                {Object.entries(titles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
              </select>
            </label>
            <label className="grid gap-1">Medicine name
              <input required maxLength={120} name="medicine" className={field} value={instruction.medicine} onChange={updateInstruction} />
            </label>
          </div>
          {instruction.action !== "stop" && <label className="grid gap-1">New dose
            <input required maxLength={120} name="dosage" className={field} value={instruction.dosage} onChange={updateInstruction} />
          </label>}
          <label className="grid gap-1">Directions for the patient
            <textarea required maxLength={500} name="directions" className={field} value={instruction.directions} onChange={updateInstruction} />
          </label>
          <button type="submit" className={`${button} justify-self-start`} disabled={busy}>{busy ? "Publishing…" : "Publish to patient"}</button>
        </form>
      )}
      {doctor && !canPublish && changes && <p>You can publish medicine changes once the appointment starts.</p>}
    </section>
  );
}
