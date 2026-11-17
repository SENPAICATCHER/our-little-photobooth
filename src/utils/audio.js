// Procedural Web Audio API Sound Effects (Zero external asset dependencies!)

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Retro Camera Shutter Click with mechanical mirror snap & flash capacitor whine
export function playShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Initial mechanical shutter slap (noise burst)
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(800, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // 2. Secondary curtain clack (50ms later)
    setTimeout(() => {
      try {
        const curTime = ctx.currentTime;
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, curTime);
        osc.frequency.exponentialRampToValueAtTime(80, curTime + 0.08);

        oscGain.gain.setValueAtTime(0.6, curTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, curTime + 0.08);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(curTime);
        osc.stop(curTime + 0.09);
      } catch (e) {}
    }, 50);

    // 3. Vintage flash charging capacitor whine
    const whine = ctx.createOscillator();
    const whineGain = ctx.createGain();
    whine.type = 'sine';
    whine.frequency.setValueAtTime(1400, now + 0.12);
    whine.frequency.exponentialRampToValueAtTime(3800, now + 0.5);

    whineGain.gain.setValueAtTime(0.001, now);
    whineGain.gain.setValueAtTime(0.04, now + 0.12);
    whineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    whine.connect(whineGain);
    whineGain.connect(ctx.destination);
    whine.start(now + 0.12);
    whine.stop(now + 0.55);

  } catch (err) {
    console.warn('Audio playback not supported:', err);
  }
}

// Countdown Tick (Retro 8-bit blip)
export function playCountdownBeep(isFinal = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1200 : 750, now);
    if (isFinal) {
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    }

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.25 : 0.1));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isFinal ? 0.25 : 0.1));
  } catch (err) {}
}

// Button click feedback
export function playButtonPop() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (err) {}
}
