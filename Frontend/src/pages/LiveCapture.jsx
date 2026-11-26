import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Video, VideoOff, Camera, Scan, Loader2, Sparkles } from 'lucide-react';
import Cookies from 'js-cookie';
import VoiceInput, { VoiceLanguage } from '../components/VoiceInput';
import CameraPulse from '../components/CameraPulse';
import { forehead } from '../utils/cameraPulse';

const LiveCapture = () => {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const analysisTimerRef = useRef(null);
  const firstAnalysisRef = useRef(null);
  const requestRef = useRef(null);
  const measuringRef = useRef(false);
  const settingsRef = useRef({ language: 'en-IN', concern: '' });

  const [isStreaming, setIsStreaming] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sessionEndsAt, setSessionEndsAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [language, setLanguage] = useState('en-IN');
  const [concern, setConcern] = useState('');
  const [resultLanguage, setResultLanguage] = useState('en-IN');
  const [speaking, setSpeaking] = useState(false);

  const updateMeasuring = React.useCallback((value) => {
    measuringRef.current = value;
    setMeasuring(value);
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    const ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 360;
    ctx.drawImage(video, 0, 0, 640, 360);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  const analyzeSkin = async () => {
    if (measuringRef.current || requestRef.current) return;
    const frame = captureFrame();
    if (!frame) return;
    const options = settingsRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skin-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Cookies.get('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ frame, ...options }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.sessionEnded) {
        stopCamera();
        setError(data.message);
        return;
      }
      setResultLanguage(data.success ? options.language : 'en-IN');
      setAnalysis(data.success ? data.analysis : 'Analysis failed: ' + data.message);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Skin analysis fetch error:', err);
      setAnalysis('Could not reach server. Make sure backend is running.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsAnalyzing(false);
      }
    }
  };

  const startSession = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/skin-analysis/session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Cookies.get('token')}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not start a live session.');
        return null;
      }
      if (data.charged) window.dispatchEvent(new Event('credits-changed'));
      return new Date(data.expiresAt);
    } catch {
      setError('Could not reach server. Make sure backend is running.');
      return null;
    }
  };

  const startCamera = async () => {
    setError(null);
    setAnalysis(null);
    settingsRef.current = { language: 'en-IN', concern: '' };
    setStarting(true);
    try {

      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      const endsAt = await startSession();
      if (!endsAt) {
        cameraStream.getTracks().forEach(t => t.stop());
        return;
      }
      setSessionEndsAt(endsAt);

      streamRef.current = cameraStream;
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play();
      setIsStreaming(true);

      intervalRef.current = setInterval(() => {
        if (videoRef.current?.readyState >= 2) setFrameCount(p => p + 1);
      }, 100);

      analysisTimerRef.current = setInterval(() => analyzeSkin(), 5000);

      firstAnalysisRef.current = setTimeout(analyzeSkin, 1000);

    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Camera permission denied.');
      else if (err.name === 'NotFoundError') setError('No camera found on this device.');
      else setError('Could not open camera: ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(analysisTimerRef.current);
    clearTimeout(firstAnalysisRef.current);
    requestRef.current?.abort();
    requestRef.current = null;
    setIsAnalyzing(false);
    updateMeasuring(false);
    intervalRef.current = null;
    analysisTimerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    videoRef.current.srcObject = null;
    setIsStreaming(false);
    setFrameCount(0);
  }, [updateMeasuring]);

  useEffect(() => {
    if (!sessionEndsAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((sessionEndsAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        if (streamRef.current) {
          stopCamera();
          setError('Your 10-minute session has ended. Start the camera again to begin a new session (5 credits).');
        }
        setSessionEndsAt(null);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sessionEndsAt, stopCamera]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(analysisTimerRef.current);
      clearTimeout(firstAnalysisRef.current);
      requestRef.current?.abort();
      window.speechSynthesis?.cancel();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const readAnalysis = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(analysis.replace(/\*\*/g, ''));
    utterance.lang = resultLanguage;
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const renderAnalysis = (text) => {
    const sections = [];
    text.split('\n').forEach((line) => {
      const t = line.trim();
      if (!t) return;
      if (t.startsWith('**')) {
        const [title, ...rest] = t.replace(/^\*\*/, '').split('**');
        sections.push({ title: title.replace(/:$/, ''), lines: rest.join('').trim() ? [rest.join('').replace(/^:\s*/, '').trim()] : [] });
      } else if (sections.length) {
        sections[sections.length - 1].lines.push(t.replace(/^- /, ''));
      } else {
        sections.push({ title: '', lines: [t] });
      }
    });
    const tints = ['bg-[#EEEDFF]', 'bg-[#FFF0E6]', 'bg-[#E6F1FF]', 'bg-[#E7F7EF]'];
    return sections.map((s, i) => (
      <div key={i} className={`p-4 rounded-[20px] ${tints[i % tints.length]}`}>
        {s.title && <p className="mb-1.5 text-sm font-extrabold text-[#1E1B4B]">{s.title}</p>}
        {s.lines.map((l, j) => <p key={j} className="text-sm leading-relaxed text-[#4B4A6B]">{l}</p>)}
      </div>
    ));
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-2 lg:py-2">
      <div className="flex flex-col gap-[22px] pb-24">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_300px]">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.025em]">Skin scan</h1>
            <p className="mt-1.5 text-[15px] text-[#6B6A8A]">Point your camera at the area. AI checks it every few seconds.</p>
          </div>
          <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#EEEDFF] text-[#3730A3] text-sm font-bold">
            {sessionEndsAt ? <>Session · {mins}:{secs} left</> : <>5 credits for 10 minutes</>}
          </span>
        </div>

        {error && <p className="px-5 py-3 rounded-[20px] bg-[#FFECEB] text-[#B42318] text-sm font-semibold">{error}</p>}

        <div className="flex flex-wrap gap-5 items-start">

          <section className="flex-[999_1_480px] min-w-0 bg-white rounded-[32px] p-3 shadow-[0_8px_30px_rgba(79,70,229,0.06)]">
            <div className="relative overflow-hidden rounded-[26px] bg-[#1E1B4B] aspect-video flex items-center justify-center">
              <video ref={videoRef} className={`w-full h-full ${measuring ? 'object-fill' : 'object-cover'} ${isStreaming ? 'block' : 'hidden'}`} playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {measuring && <div aria-hidden="true" className="pointer-events-none absolute rounded-lg border-2 border-emerald-300"
                style={Object.fromEntries(Object.entries(forehead).map(([key, value]) => [key, `${value * 100}%`]))} />}
              {!isStreaming && (
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <span className="w-20 h-20 rounded-full bg-[#312E81] text-[#C7D2FE] flex items-center justify-center"><Camera size={34} /></span>
                  <p className="text-white text-lg font-extrabold">Camera is off</p>
                  <p className="text-[#C7D2FE] text-sm">Good light and a steady hand give the best results.</p>
                </div>
              )}
              {isStreaming && (
                <span className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 text-[#B42318] text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-[#F04438] animate-pulse" /> LIVE
                </span>
              )}
              {isAnalyzing && (
                <span className="absolute top-4 right-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  <Loader2 size={12} className="animate-spin" /> Analysing
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-4 pb-2">
              <span className="text-sm font-semibold text-[#6B6A8A]">
                {isStreaming ? <>Frames <span className="font-extrabold text-indigo-600">{frameCount.toLocaleString()}</span></> : 'Your camera stays on your device until you start.'}
              </span>
              <div className="flex gap-2">
                {isStreaming && (
                  <button onClick={() => {
                    settingsRef.current = { language, concern: concern.trim() };
                    analyzeSkin();
                  }} disabled={isAnalyzing || measuring} className="h-11 px-5 rounded-full bg-[#E7F7EF] text-[#05603A] text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                    <Scan size={16} /> Analyse now
                  </button>
                )}
                <button onClick={isStreaming ? stopCamera : startCamera} disabled={starting}
                  className={`h-11 px-6 rounded-full text-sm font-bold flex items-center gap-2 disabled:opacity-50 ${isStreaming ? 'bg-[#FFECEB] text-[#B42318]' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_10px_20px_-6px_rgba(79,70,229,0.5)]'}`}>
                  {isStreaming ? <><VideoOff size={16} /> Stop</> : <><Video size={16} /> {starting ? 'Starting…' : 'Start camera'}</>}
                </button>
              </div>
            </div>
            <CameraPulse videoRef={videoRef} streaming={isStreaming} measuring={measuring} setMeasuring={updateMeasuring} analysisPending={isAnalyzing} />
          </section>

          <section className="flex-[1_1_320px] min-w-0 bg-white rounded-[28px] p-6 shadow-[0_8px_30px_rgba(79,70,229,0.06)] flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><Sparkles size={18} className="text-indigo-600" /> What the AI sees</h2>
            <label className="grid gap-1 text-sm font-semibold">Skin concern (optional)
              <textarea className="rounded-xl bg-[#F6F6FD] p-3 text-sm font-normal" maxLength={500} rows={2}
                value={concern} onChange={(event) => setConcern(event.target.value)} placeholder="Describe what you want the analysis to focus on" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <VoiceLanguage value={language} onChange={setLanguage} disabled={measuring} />
              <VoiceInput key={language} language={language} disabled={measuring}
                onTranscript={(value) => setConcern((current) => [current, value].filter(Boolean).join(' ').slice(0, 500))} />
              {analysis && window.speechSynthesis && <button type="button" onClick={readAnalysis}
                className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">{speaking ? 'Stop reading' : 'Read result aloud'}</button>}
            </div>
            <p className="text-xs text-[#6B6A8A]">Select Analyse now to use your concern and language.</p>
            {analysis ? (
              renderAnalysis(analysis)
            ) : (
              <div className="py-10 flex flex-col items-center text-center gap-3">
                <span className="w-14 h-14 rounded-full bg-[#F6F6FD] text-[#9A99B5] flex items-center justify-center">
                  {isAnalyzing ? <Loader2 size={24} className="animate-spin text-indigo-500" /> : <Scan size={24} />}
                </span>
                <p className="text-sm text-[#6B6A8A] max-w-[240px]">{isStreaming ? 'First result in a moment…' : 'Start the camera to get your skin type, concerns and tips.'}</p>
              </div>
            )}
            <p className="mt-1 text-xs text-[#6B6A8A]">For guidance only, not a diagnosis. See a dermatologist for anything worrying.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LiveCapture;
