import React, { useState, useRef, useEffect } from "react";
import { X, Send, Stethoscope, Sparkles } from "lucide-react";
import Cookies from "js-cookie";
import VoiceInput, { VoiceLanguage } from "./VoiceInput";

const FALLBACK_MESSAGE = "Sorry, I couldn't process that. Please try again.";

const Bot = ({ raised = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const closeChat = () => {
    abortControllerRef.current?.abort();
    window.speechSynthesis?.cancel();
    setIsOpen(false);
  };

  const updateLastMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!prompt.trim() || loading) return;
    const text = prompt.trim();
    setMessages((prev) => [
      ...prev,
      { text, sender: "user" },
      { text: "", sender: "bot", streaming: true, language },
    ]);
    setPrompt("");
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {

      const token = Cookies.get("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: JSON.stringify({ prompt: text, language }),
        signal: controller.signal,
      });

      if (res.status === 400 || res.status === 402 || res.status === 429) {
        const data = await res.json().catch(() => ({}));
        updateLastMessage(() => ({ text: data.message || FALLBACK_MESSAGE, sender: "bot", streaming: false }));
        return;
      }

      if (!res.ok || !res.body) throw new Error(`Request failed with status ${res.status}`);
      if (token) window.dispatchEvent(new Event("credits-changed"));

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let doneReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const rawFrame = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
          if (!rawFrame.trim()) continue;

          let eventType = "message";
          let dataLine = null;
          for (const line of rawFrame.split("\n")) {
            if (line.startsWith("event:")) eventType = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine = line.slice(5).trim();
          }

          if (eventType === "done") {
            doneReceived = true;
            updateLastMessage((m) => ({ ...m, streaming: false }));
          } else if (eventType === "error") {
            doneReceived = true;
            updateLastMessage((m) => ({
              text: m.text || FALLBACK_MESSAGE,
              sender: "bot",
              streaming: false,
            }));
          } else if (dataLine) {
            const { text: chunkText } = JSON.parse(dataLine);
            updateLastMessage((m) => ({ ...m, text: m.text + chunkText }));
          }
        }
      }

      if (!doneReceived) {
        updateLastMessage((m) => ({
          text: m.text || FALLBACK_MESSAGE,
          sender: "bot",
          streaming: false,
        }));
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      updateLastMessage((m) => ({
        text: m.text || FALLBACK_MESSAGE,
        sender: "bot",
        streaming: false,
      }));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const readReply = (message) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(message.text);
    speech.lang = message.language;
    window.speechSynthesis.speak(speech);
  };

  return (
    <div className={`fixed right-6 z-50 flex flex-col items-end ${raised ? "bottom-[104px]" : "bottom-6"}`}>

      <div className={`mb-4 w-90 bg-white rounded-[28px] shadow-2xl shadow-indigo-100 border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
        ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
        style={{ maxHeight: "520px" }}
      >
        <div className="bg-linear-to-r from-indigo-600 to-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-[20px] flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-sm tracking-tight">AuraHealth Bot</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                <p className="text-indigo-200 text-[10px] font-semibold">Online · Ask me anything</p>
              </div>
            </div>
          </div>
          <button
            onClick={closeChat}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: "280px", maxHeight: "340px" }}>
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="w-14 h-14 bg-linear-to-br from-indigo-600 to-indigo-600 rounded-[20px] flex items-center justify-center mb-3">
                <Sparkles size={22} className="text-indigo-400" />
              </div>
              <p className="text-slate-700 font-bold text-sm">How can I help you?</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-50">
                Ask me about symptoms, medications, or general health advice.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {["What are signs of diabetes?", "Tips for better sleep", "Common cold remedies"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setPrompt(q); inputRef.current?.focus(); }}
                    className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "bot" && (
                <div className="w-6 h-6 bg-linear-to-br from-indigo-600 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm">
                  <Stethoscope size={11} className="text-white" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-2.5 rounded-[20px] text-sm leading-relaxed
                  ${msg.sender === "user"
                    ? "bg-linear-to-br from-indigo-600 to-indigo-600 text-white rounded-br-md shadow-md shadow-indigo-100"
                    : "bg-slate-100 text-slate-700 rounded-bl-md"
                  }`}
              >
                {msg.sender === "bot" && msg.streaming && !msg.text ? (
                  <div className="flex items-center gap-1 py-0.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <>
                    {msg.text}
                    {msg.sender === "bot" && !msg.streaming && msg.language && msg.text && window.speechSynthesis && (
                      <button type="button" className="mt-2 block text-xs font-bold text-indigo-700" onClick={() => readReply(msg)}>Read aloud</button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-slate-50 shrink-0">
          {isOpen && <div className="mb-2 flex flex-wrap items-center gap-2">
            <VoiceLanguage value={language} onChange={setLanguage} disabled={loading} />
            <VoiceInput key={language} language={language} disabled={loading} onTranscript={(value) => setPrompt(value.slice(0, 4000))} />
          </div>}
          <div className="flex items-center gap-2 bg-[#F6F6FD] border-2 border-transparent rounded-[18px] focus:bg-white px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
            <input
              ref={inputRef}
              value={prompt}
              maxLength={4000}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your health question..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!prompt.trim() || loading}
              className="w-8 h-8 bg-linear-to-br from-indigo-600 to-indigo-600 hover:opacity-90 disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
          <p className="text-[10px] text-slate-300 text-center mt-2">For informational purposes only · Not medical advice · {Cookies.get("token") ? "1 credit per message" : "5 free messages a day"}</p>
        </div>
      </div>

      <button
        onClick={isOpen ? closeChat : () => setIsOpen(true)}
        className={`w-14 h-14 bg-linear-to-br from-indigo-600 to-indigo-600 hover:opacity-90 text-white rounded-[20px] shadow-xl shadow-indigo-200 flex items-center justify-center transition-all duration-300 active:scale-95
          ${isOpen ? "rotate-0" : "hover:scale-105"}`}
        title="AuraHealth Bot"
      >
        {isOpen
          ? <X size={22} />
          : <Stethoscope size={22} />
        }
      </button>
    </div>
  );
};

export default Bot;
