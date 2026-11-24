export const pulseScanSeconds = 30;

// Coordinates correspond to the forehead guide in the video preview.
export const forehead = { left: 0.42, top: 0.3, width: 0.16, height: 0.08 };

export function readForehead(video, context) {
  const { videoWidth: width, videoHeight: height } = video;
  const { left, top, width: regionWidth, height: regionHeight } = forehead;
  context.drawImage(video, width * left, height * top, width * regionWidth, height * regionHeight, 0, 0, 32, 16);
  const { data } = context.getImageData(0, 0, 32, 16);
  let green = 0;
  let red = 0;
  let blue = 0;
  let clipped = 0;
  for (let i = 0; i < data.length; i += 4) {
    red += data[i];
    green += data[i + 1];
    blue += data[i + 2];
    if (data[i + 1] < 12 || data[i + 1] > 245) clipped++;
  }
  const count = data.length / 4;
  return { light: green / count, clipped: clipped / count, signal: green / Math.max(1, red + blue) };
}

function scanSpectrum(samples, origin) {
  const count = samples.length;
  const mean = samples.reduce((sum, sample) => sum + sample.signal, 0) / count;
  const signal = samples.map((sample, i) => {
    const taper = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1));
    return { time: sample.time - origin, value: taper * (sample.signal - mean) };
  });
  const spectrum = [];
  for (let bpm = 45; bpm <= 180; bpm++) {
    let real = 0;
    let imaginary = 0;
    for (const sample of signal) {
      const angle = 2 * Math.PI * bpm * sample.time / 60;
      real += sample.value * Math.cos(angle);
      imaginary += sample.value * Math.sin(angle);
    }
    spectrum.push({ bpm, power: (real * real + imaginary * imaginary) / count ** 2 });
  }
  const peak = spectrum.reduce((best, point) => point.power > best.power ? point : best);
  const competing = spectrum.filter((point) => Math.abs(point.bpm - peak.bpm) > 7)
    .reduce((highest, point) => Math.max(highest, point.power), 0);
  return peak.power >= 1e-9 && peak.power >= competing * 3 ? peak.bpm : null;
}

export function estimateCameraPulse(samples) {
  const duration = samples.at(-1)?.time - samples[0]?.time;
  if (samples.length < 450 || duration < 27 || !Number.isFinite(duration)
    || samples.some((sample, index) => index > 0 && (sample.time <= samples[index - 1].time || sample.time - samples[index - 1].time > 0.4))) {
    return { message: "Too few steady camera frames. Keep this tab open and try again." };
  }
  const badLight = samples.filter((sample) => sample.light < 24 || sample.light > 225 || sample.clipped > 0.15);
  if (badLight.length > samples.length * 0.1) {
    return { message: "The forehead area was too dark or overexposed. Try even light from the front." };
  }
  const abruptChanges = samples.filter((sample, index) => index > 0 &&
    (Math.abs(sample.light - samples[index - 1].light) > 8 || Math.abs(sample.signal - samples[index - 1].signal) > 0.012));
  if (abruptChanges.length > samples.length * 0.03) {
    return { message: "Movement or changing light disrupted the signal. Keep your face and the camera still." };
  }
  const origin = samples[0].time;
  const split = samples.findIndex((sample) => sample.time >= origin + duration / 2);
  const first = scanSpectrum(samples.slice(0, split), origin);
  const second = scanSpectrum(samples.slice(split), origin);
  const bpm = scanSpectrum(samples, origin);
  if (!bpm || !first || !second || Math.max(first, second, bpm) - Math.min(first, second, bpm) > 6) {
    return { message: "No consistent pulse signal was found. Reposition your forehead in the guide and try again." };
  }
  return { bpm, duration: Math.round(duration), samples: samples.length };
}
