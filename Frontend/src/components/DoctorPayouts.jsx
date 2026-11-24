import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { formatDate, formatTime } from "../utils/time";

const API = import.meta.env.VITE_API_URL;
const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const money = (paise) => currency.format(paise / 100);
const formatInstant = (date) => new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const statuses = { requested: "Requested", processing: "Transfer in progress", paid: "Paid", rejected: "Rejected" };
const card = "grid gap-4 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(79,70,229,0.06)] sm:p-6";
const field = "min-w-0 rounded-xl border border-indigo-100 bg-[#F6F6FD] px-3 py-2 text-sm";
const button = "rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const secondary = "rounded-full bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50";
const auth = (role) => ({ headers: { Authorization: `Bearer ${Cookies.get(role === "admin" ? "emtoken" : "emstoken")}` }, withCredentials: true });

function parseAmount(value) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim())) return NaN;
  const [rupees, paise = ""] = value.trim().split(".");
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
}

function usePayouts(role) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const endpoint = `${API}/${role}/payouts`;
  const load = useCallback(async (signal) => {
    try {
      const response = await axios.get(endpoint, { ...auth(role), signal });
      setData(response.data);
    } catch (err) {
      if (!signal?.aborted) setError(err.response?.data?.msg || "Couldn't load payout information.");
    }
  }, [endpoint, role]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return { data, error, setError, load, endpoint };
}

function WithdrawalHistory({ items, showDoctor = false }) {
  if (!items.length) return <p className="text-sm text-[#6B6A8A]">No withdrawals yet.</p>;
  return <ul className="grid gap-2">
    {items.map((item) => <li key={item._id} className="rounded-xl bg-[#F6F6FD] p-3 text-sm">
      <p className="font-bold">{money(item.amountPaise)} · {statuses[item.status]}</p>
      <p className="text-[#6B6A8A]">{showDoctor && `${item.doctor?.email || "Doctor account unavailable"} · `}{formatInstant(item.createdAt)}</p>
      {item.reference && <p className="break-words">Transfer reference {item.reference}</p>}
      {item.note && <p className="break-words">{item.note}</p>}
    </li>)}
  </ul>;
}

export function DoctorEarnings() {
  const { data, error, setError, load, endpoint } = usePayouts("doctor");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const attempt = useRef(null);

  const request = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const amountPaise = parseAmount(amount);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > data.summary.available) {
      setError("Enter an amount within your available balance, using up to two decimal places.");
      return;
    }
    if (attempt.current?.amountPaise !== amountPaise) {
      if (!window.crypto?.randomUUID) {
        setError("Open AuraHealth over HTTPS or localhost to request a withdrawal.");
        return;
      }
      attempt.current = { amountPaise, requestKey: window.crypto.randomUUID() };
    }
    setBusy(true);
    try {
      await axios.post(endpoint, attempt.current, auth("doctor"));
      attempt.current = null;
      setAmount("");
      setNotice("Withdrawal requested. The amount is reserved for admin review.");
      await load();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't confirm the request. Retry the same amount to check safely.");
    } finally {
      setBusy(false);
    }
  };

  return <section className={card}>
    <h2 className="text-xl font-extrabold">Consultation earnings</h2>
    {error && <p role="alert" className="text-sm text-red-700">{error} {!data && <button type="button" className="font-bold underline" onClick={() => { setError(""); load(); }}>Retry</button>}</p>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {!data && !error && <p role="status" className="text-sm">Loading earnings…</p>}
    {data && <>
      <p className="text-sm text-[#6B6A8A]">The standard fee for new bookings is {money(data.fee)} per verified completed visit. Earnings clear after seven days unless held by an admin.</p>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["pending", "Pending or held"], ["available", "Available to withdraw"], ["reserved", "Reserved for withdrawal"], ["paid", "Paid out"]].map(([key, title]) =>
          <div key={key} className="rounded-2xl bg-[#F6F6FD] p-4"><dt className="text-sm text-[#6B6A8A]">{title}</dt><dd className="text-xl font-extrabold">{money(data.summary[key])}</dd></div>)}
      </dl>
      <form onSubmit={request} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">Withdrawal amount (INR)
          <input required inputMode="decimal" className={field} value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy || !data.summary.available} />
        </label>
        <button className={button} disabled={busy || !data.summary.available}>{busy ? "Submitting…" : "Request withdrawal"}</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="font-extrabold">Recent consultation earnings</h3>
          {!data.earnings.length && <p className="text-sm text-[#6B6A8A]">No verified consultation earnings yet.</p>}
          <ul className="grid max-h-72 gap-2 overflow-y-auto">
            {data.earnings.map((item) => <li key={item._id} className="rounded-xl bg-[#F6F6FD] p-3 text-sm">
              <strong>{money(item.payoutFeePaise)}</strong> · {formatDate(item.date)} · {formatTime(item.time)}
              <p className="text-[#6B6A8A]">{item.payoutHeld ? "On hold" : `Clears after ${formatInstant(new Date(new Date(item.payoutCompletedAt).getTime() + 7 * 86400000))}`}</p>
            </li>)}
          </ul>
        </div>
        <div className="grid content-start gap-2">
          <h3 className="font-extrabold">Withdrawal history</h3>
          <div className="max-h-72 overflow-y-auto"><WithdrawalHistory items={data.withdrawals} /></div>
        </div>
      </div>
    </>}
  </section>;
}

export function AdminPayouts() {
  const { data, error, setError, load, endpoint } = usePayouts("admin");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState(null);

  const save = async (path, body, message) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await axios.put(`${endpoint}/${path}`, body, auth("admin"));
      setNotice(message);
      setReview(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't save the change. Refresh before retrying a transfer update.");
    } finally {
      setBusy(false);
    }
  };

  const visitRow = (item, completed = false) => <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F6F6FD] p-3 text-sm">
    <div>
      <p className="break-all font-bold">{item.doctormail || "Doctor"} · {money(item.payoutFeePaise)}</p>
      <p>{formatDate(item.date)} · {formatTime(item.time)}{item.payoutHeld ? " · On hold" : ""}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button className={secondary} disabled={busy} type="button" onClick={() => {
      const action = completed ? (item.payoutHeld ? "release" : "hold") : "complete";
      if (action === "complete" && !window.confirm("Confirm you verified this consultation took place?")) return;
      save(`visits/${item._id}`, { action }, action === "complete" ? "Visit confirmed. The seven-day hold has started." : "Updated the visit hold.");
      }}>{completed ? (item.payoutHeld ? "Release hold" : "Place on hold") : "Confirm completion"}</button>
      {!completed && <button className={secondary} disabled={busy} type="button" onClick={() => {
        if (window.confirm("Confirm this consultation did not take place?")) {
          save(`visits/${item._id}`, { action: "no-show" }, "Visit closed without earnings.");
        }
      }}>Did not occur</button>}
    </div>
  </li>;

  return <section className={card}>
    <h2 className="text-xl font-extrabold">Doctor payouts</h2>
    {data && <p className="text-sm text-[#6B6A8A]">Every doctor earns {money(data.fee)} per verified completed visit for new bookings.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" className="font-bold underline" onClick={() => { setError(""); load(); }}>Refresh queue</button></p>}
    {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
    {!data && !error && <p role="status" className="text-sm">Loading payout queue…</p>}
    {data && <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="font-extrabold">Funded visits awaiting confirmation</h3>
          {!data.visits.length && <p className="text-sm text-[#6B6A8A]">No funded visits to review.</p>}
          <ul className="grid max-h-72 gap-2 overflow-y-auto">{data.visits.map((item) => visitRow(item))}</ul>
        </div>
        <div className="grid content-start gap-2">
          <h3 className="font-extrabold">Recently confirmed visits</h3>
          {!data.completed.length && <p className="text-sm text-[#6B6A8A]">No confirmed visits yet.</p>}
          <ul className="grid max-h-72 gap-2 overflow-y-auto">{data.completed.map((item) => visitRow(item, true))}</ul>
        </div>
      </div>
      <h3 className="font-extrabold">Withdrawal queue</h3>
      <p className="text-sm text-[#6B6A8A]">Claim a request before transferring funds. Verify payment settlement and the doctor’s payout destination, then record the confirmed transfer reference here.</p>
      {!data.pending.length && <p className="text-sm text-[#6B6A8A]">No withdrawals awaiting payment.</p>}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">
        {data.pending.map((item) => <li key={item._id} className="grid gap-2 rounded-xl bg-[#F6F6FD] p-3 text-sm">
          <p className="break-all font-bold">{money(item.amountPaise)} · {item.doctor?.email || "Doctor account unavailable"}</p>
          <p>{statuses[item.status]} · {formatInstant(item.createdAt)}</p>
          <div className="flex flex-wrap gap-2">
            {item.status === "requested" && <button type="button" className={secondary} disabled={busy} onClick={() =>
              save(`withdrawals/${item._id}`, { status: "processing" }, "Request claimed. Verify the destination before transferring.")}>Claim transfer</button>}
            {item.assignedToYou && <button type="button" className={secondary} disabled={busy} onClick={() => setReview({ id: item._id, status: "paid", value: "" })}>Record confirmed payment</button>}
            {(item.status === "requested" || item.assignedToYou) && <button type="button" className={secondary} disabled={busy} onClick={() => setReview({ id: item._id, status: "rejected", value: "" })}>Reject</button>}
          </div>
          {review?.id === item._id && <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            if (review.status === "paid" && !window.confirm("Confirm the external transfer has succeeded?")) return;
            if (review.status === "rejected" && item.status === "processing" && !window.confirm("Confirm that no funds were transferred before releasing this reservation?")) return;
            const key = review.status === "paid" ? "reference" : "note";
            save(`withdrawals/${item._id}`, { status: review.status, [key]: review.value }, "Withdrawal status updated.");
          }}>
            <label className="grid gap-1 font-semibold">{review.status === "paid" ? "Transfer reference" : "Reason shown to doctor"}
              <input required maxLength={review.status === "paid" ? 100 : 250} className={field} value={review.value}
                onChange={(event) => setReview({ ...review, value: event.target.value })} />
            </label>
            <button className={button} disabled={busy}>Save</button>
            <button type="button" disabled={busy} onClick={() => setReview(null)}>Cancel</button>
          </form>}
        </li>)}
      </ul>
      <details className="grid gap-2">
        <summary className="cursor-pointer font-extrabold">Recent reviewed withdrawals</summary>
        <div className="mt-2 max-h-72 overflow-y-auto"><WithdrawalHistory items={data.reviewed} showDoctor /></div>
      </details>
    </>}
  </section>;
}
