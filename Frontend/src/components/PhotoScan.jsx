import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";

const API = import.meta.env.VITE_API_URL;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoScan({ path, label, onResult }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event) => {
    const photo = event.target.files?.[0];
    event.target.value = "";
    if (!photo) return;
    setError("");
    onResult(null);
    if (!imageTypes.includes(photo.type) || !photo.size || photo.size > 5 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, or WebP photo no larger than 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("photo", photo);
      const { data } = await axios.post(`${API}${path}`, form, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
        withCredentials: true,
        timeout: 60000,
      });
      onResult(data);
    } catch (err) {
      setError(err.response?.data?.msg || "Couldn't scan the photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="inline-flex cursor-pointer rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 focus-within:ring-2 focus-within:ring-indigo-400">
        <span role="status">{busy ? "Reading photo…" : label}</span>
        <input className="sr-only" type="file" accept={imageTypes.join(",")} disabled={busy} onChange={upload} />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
