import { useEffect, useState } from "react";
import { estimateCameraPulse, pulseScanSeconds, readForehead } from "../utils/cameraPulse";

export default function CameraPulse({ videoRef, streaming, measuring, setMeasuring, analysisPending }) {
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!measuring || !streaming) return;
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 16;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const video = videoRef.current;
    const useVideoFrames = typeof video?.requestVideoFrameCallback === "function";
    let frameId;
    let lastFrameTime = -1;
    let lastSecond = 0;
    const samples = [];
    const started = performance.now();

    const cancelFrame = () => {
      if (frameId === undefined) return;
      if (useVideoFrames) video.cancelVideoFrameCallback(frameId);
      else cancelAnimationFrame(frameId);
    };
    const finish = (value) => {
      cancelFrame();
      setResult(value);
      setMeasuring(false);
    };

    const sample = (now, metadata) => {
      const time = (now - started) / 1000;
      if (document.hidden || !video?.srcObject?.active || !context) {
        finish({ message: "Scan interrupted. Keep the camera and this tab open, then retry." });
        return;
      }
      const frameTime = metadata?.mediaTime ?? video.getVideoPlaybackQuality?.().totalVideoFrames ?? video.currentTime;
      if (video.readyState >= 2 && frameTime !== lastFrameTime && video.videoWidth && video.videoHeight) {
        lastFrameTime = frameTime;
        samples.push({ time, ...readForehead(video, context) });
      }
      if (time >= pulseScanSeconds) {
        finish(estimateCameraPulse(samples));
        return;
      }
      const second = Math.floor(time);
      if (second !== lastSecond) {
        lastSecond = second;
        setElapsed(second);
      }
      queueFrame();
    };
    const queueFrame = () => {
      frameId = useVideoFrames ? video.requestVideoFrameCallback(sample) : requestAnimationFrame(sample);
    };
    const stopIfHidden = () => {
      if (document.hidden) finish({ message: "Scan interrupted. Keep this tab open and try again." });
    };
    const deadline = setTimeout(() => finish(estimateCameraPulse(samples)), pulseScanSeconds * 1000 + 500);
    document.addEventListener("visibilitychange", stopIfHidden);
    queueFrame();
    return () => {
      cancelFrame();
      clearTimeout(deadline);
      document.removeEventListener("visibilitychange", stopIfHidden);
    };
  }, [measuring, setMeasuring, streaming, videoRef]);

  const start = () => {
    setResult(null);
    setElapsed(0);
    setMeasuring(true);
  };

  return (
    <section className="grid gap-3 rounded-[22px] bg-[#F6F6FD] p-4 text-sm">
      <h2 className="text-base font-extrabold">Experimental camera pulse</h2>
      <p className="text-[#4B4A6B]">Use even front lighting. Hold still with bare forehead skin inside the guide for 30 seconds. Pulse frames are processed on this device.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!streaming || (!measuring && analysisPending)} onClick={measuring ? () => setMeasuring(false) : start}
          className="rounded-full bg-indigo-600 px-4 py-2 font-bold text-white disabled:opacity-50">
          {measuring ? "Cancel pulse scan" : "Start pulse scan"}
        </button>
        {measuring && <span role="status">{pulseScanSeconds - elapsed}s remaining</span>}
      </div>
      {measuring && <progress className="w-full accent-indigo-600" aria-label="Pulse scan progress" value={elapsed} max={pulseScanSeconds} />}
      {result?.message && <p role="status">{result.message}</p>}
      {result?.bpm && <div role="status" className="rounded-xl bg-white p-3">
        <strong className="text-lg">{result.bpm} bpm</strong> estimated pulse
        <p>{result.duration}s sampled · {result.samples} video frames · consistent across both halves</p>
      </div>}
      <p className="text-xs text-[#6B6A8A]">For experimentation only. Use a validated device when you need a pulse measurement.</p>
    </section>
  );
}
