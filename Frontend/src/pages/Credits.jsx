import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Loader2, CheckCircle2, Plus, Minus } from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const authConfig = () => ({ headers: { Authorization: `Bearer ${Cookies.get("token")}` }, withCredentials: true });
const CARD = "bg-white rounded-[28px] shadow-[0_8px_30px_rgba(79,70,229,0.06)]";

const COST_LABELS = {
  slotBooking: "Book a doctor slot",
  reportAnalysis: "Explain a report",
  liveSession: "Skin scan, 10 min",
  aiChat: "AuraBot message",
};

const PACK_STYLES = [
  { card: "bg-[#E7F7EF]", name: "text-[#05603A]", big: "text-[#054F31]", btn: "bg-white text-[#054F31] hover:bg-[#F6FFFA]" },
  { card: "bg-[#EEEDFF] shadow-[0_0_0_2px_#4F46E5]", name: "text-[#3730A3]", big: "text-[#312E81]", btn: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]" },
  { card: "bg-[#FFF0E6]", name: "text-[#9A3412]", big: "text-[#7C2D12]", btn: "bg-white text-[#7C2D12] hover:bg-[#FFF8F3]" },
];

const announceCreditsChange = () => window.dispatchEvent(new Event("credits-changed"));

let razorpayScript = null;
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScript) {
    razorpayScript = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => { razorpayScript = null; resolve(false); };
      document.body.appendChild(script);
    });
  }
  return razorpayScript;
};

const Credits = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingPack, setBuyingPack] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWallet = async () => {
    try {
      const res = await axios.get(`${API}/credits`, authConfig());
      setWallet(res.data);
    } catch {
      setError("Couldn't load your credits. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWallet(); }, []);

  const buy = async (pack) => {
    setError("");
    setSuccess("");
    setBuyingPack(pack.id);

    if (!(await loadRazorpay())) {
      setError("Couldn't load the payment window. Check your internet and try again.");
      setBuyingPack(null);
      return;
    }

    let order;
    try {
      order = (await axios.post(`${API}/credits/order`, { packId: pack.id }, authConfig())).data;
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't start the payment.");
      setBuyingPack(null);
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "AuraHealth",
      description: `${pack.credits} consultation credits (${pack.name} pack)`,
      prefill: order.user,
      theme: { color: "#4F46E5" },
      handler: async (response) => {
        try {
          const res = await axios.post(`${API}/credits/verify`, response, authConfig());
          setSuccess(res.data.msg);
          announceCreditsChange();
          loadWallet();
        } catch (err) {
          setError(err.response?.data?.msg || "We couldn't confirm the payment. If money was taken, credits will be added automatically.");
        } finally {
          setBuyingPack(null);
        }
      },
      modal: { ondismiss: () => setBuyingPack(null) },
    });
    checkout.on("payment.failed", (response) => setError(response.error?.description || "Payment failed. Please try again."));
    checkout.open();
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center gap-2 text-[#6B6A8A] text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>;
  }

  const balance = wallet?.balance ?? 0;
  const bookingCredits = wallet?.bookingCredits ?? 0;
  const costs = wallet?.costs || {};

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Credits</h1>
          <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Manage your AI credits and paid consultation credits.</p>
        </div>

        {error && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}
        {success && <p className="px-5 py-3 rounded-[20px] bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16} /> {success}</p>}

        {wallet && (
          <>

            <section className="relative overflow-hidden rounded-[32px] bg-indigo-600 text-white p-7 sm:p-8 flex flex-wrap items-center gap-7">
              <div aria-hidden="true" className="absolute -right-14 -top-20 w-64 h-64 rounded-full bg-indigo-500" />
              <div aria-hidden="true" className="absolute right-40 -bottom-28 w-52 h-52 rounded-full bg-indigo-700" />
              <div className="relative flex-[1_1_260px]">
                <p className="text-[15px] font-bold text-indigo-100">You have</p>
                <p className="my-1 text-6xl font-extrabold tracking-[-0.04em] leading-none">{balance} <span className="text-[22px] font-bold">AI credits</span></p>
                <p className="text-[15px] text-indigo-100">{bookingCredits} paid consultation credits available.</p>
              </div>
              <div className="relative grid grid-cols-3 gap-2.5">
                {[
                  [costs.slotBooking ? Math.floor(bookingCredits / costs.slotBooking) : 0, "bookings"],
                  [Math.floor(balance / (costs.reportAnalysis || 10)), "reports"],
                  [Math.floor(balance / (costs.liveSession || 5)), "skin scans"],
                ].map(([n, label]) => (
                  <div key={label} className="px-4 py-3.5 rounded-[22px] bg-white text-[#312E81] text-center">
                    <p className="text-[22px] font-extrabold">{n}</p>
                    <p className="text-xs font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3.5 text-xl font-extrabold">Top up</h2>
              {!wallet.paymentsEnabled && (
                <p className="mb-3.5 px-5 py-3 rounded-[20px] bg-[#FFF4E5] text-[#B45309] text-sm font-semibold">Live checkout is unavailable. Your AI credits remain usable.</p>
              )}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
                {wallet.packs.map((pack, i) => {
                  const s = PACK_STYLES[i % PACK_STYLES.length];
                  return (
                    <div key={pack.id} className={`relative p-6 rounded-[28px] flex flex-col gap-1.5 ${s.card}`}>
                      <p className={`text-sm font-extrabold ${s.name}`}>{pack.name}</p>
                      <p className={`text-[40px] font-extrabold tracking-[-0.03em] ${s.big}`}>{pack.credits}</p>
                      <p className={`mb-3.5 text-[13px] ${s.name}`}>consultation credits + {pack.aiCredits} AI credits</p>
                      <button
                        onClick={() => buy(pack)}
                        disabled={!wallet.paymentsEnabled || buyingPack !== null}
                        className={`h-12 rounded-full text-[15px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 ${s.btn}`}
                      >
                        {buyingPack === pack.id && <Loader2 size={16} className="animate-spin" />} Pay ₹{pack.price}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[13px] text-[#6B6A8A]">Consultation credits become available after Razorpay confirms the payment was captured.</p>
            </section>

            <div className="flex flex-wrap gap-5 items-start">
              <section className={`${CARD} flex-[1_1_300px] min-w-0 p-6`}>
                <h2 className="mb-3.5 text-lg font-extrabold">What things cost</h2>
                <div className="flex flex-col gap-2 text-sm">
                  {Object.entries(costs).map(([key, cost]) => (
                    <div key={key} className="flex justify-between items-center px-4 py-3 rounded-[18px] bg-[#F6F6FD]">
                      <span className="font-semibold">{COST_LABELS[key] || key}</span>
                      <span className="font-extrabold">{cost} {key === "slotBooking" ? "consultation" : "AI"} credits</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[13px] text-[#6B6A8A]">If something fails on our side, the credits go straight back. Reminders, SOS and hospital search are free.</p>
              </section>

              <section className={`${CARD} flex-[999_1_420px] min-w-0 p-6`}>
                <h2 className="mb-3.5 text-lg font-extrabold">Recent activity</h2>
                {wallet.transactions.length === 0 ? (
                  <p className="text-sm text-[#6B6A8A]">No activity yet.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {wallet.transactions.map((t) => (
                      <div key={t._id} className="flex items-center gap-3 min-h-[56px]">
                        <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${t.type === "credit" ? "bg-[#E7F7EF] text-[#05603A]" : "bg-[#EEEDFF] text-indigo-600"}`}>
                          {t.type === "credit" ? <Plus size={16} strokeWidth={3} /> : <Minus size={16} strokeWidth={3} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{t.reason}</p>
                          <p className="text-xs text-[#6B6A8A]">{new Date(t.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · balance {t.balanceAfter}</p>
                        </div>
                        <span className={`text-[15px] font-extrabold ${t.type === "credit" ? "text-[#05603A]" : ""}`}>{t.type === "credit" ? "+" : "−"}{t.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Credits;
