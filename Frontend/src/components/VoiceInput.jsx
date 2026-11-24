import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

export const languages = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "bn-IN": "Bengali",
  "mr-IN": "Marathi",
};

export function VoiceLanguage({ value, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      Language
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-indigo-100 bg-white px-2 py-1">
        {Object.entries(languages).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
  );
}

export default function VoiceInput({ language, onTranscript, disabled }) {
  const recognition = useRef(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => () => {
    if (!recognition.current) return;
    recognition.current.onresult = null;
    recognition.current.onerror = null;
    recognition.current.onend = null;
    recognition.current.abort();
  }, []);

  const dictate = () => {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    setError("");
    const speech = new Recognition();
    speech.lang = language;
    speech.onresult = (event) => onTranscript(event.results[0][0].transcript);
    speech.onerror = (event) => {
      if (event.error === "aborted") return;
      setError(event.error === "not-allowed" ? "Allow microphone access or type instead." : "Couldn't transcribe audio. Try again or type instead.");
    };
    speech.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    try {
      speech.start();
      recognition.current = speech;
      setListening(true);
    } catch {
      setError("Couldn't start the microphone. You can still type.");
    }
  };

  if (!Recognition) return <span className="text-xs text-slate-500">Voice input is unavailable in this browser.</span>;
  return (
    <div>
      <button type="button" disabled={disabled && !listening} onClick={dictate}
        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 disabled:opacity-50">
        <Mic size={14} /> {listening ? "Stop listening" : "Dictate"}
      </button>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
