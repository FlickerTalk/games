const GLIDE = 0.06;
const FADE = 0.08;
const RESEND_SECONDS = 0.05;
const PURR_DEPTH = 0.22;
const NOTICEABLE = { frequency: 0.5, gain: 0.002, cutoff: 8, purr: 0.3 };

function oscillator(context, type, output, frequency) {
  const node = context.createOscillator();
  node.type = type;
  node.frequency.value = frequency;
  node.connect(output);
  return node;
}

function gain(context, value, output) {
  const node = context.createGain();
  node.gain.value = value;
  if (output) node.connect(output);
  return node;
}

function moved(sent, tone) {
  if (!sent || !tone) return sent !== tone;
  return Object.keys(NOTICEABLE).some((part) => Math.abs(sent[part] - tone[part]) >= NOTICEABLE[part]);
}

export function createEngineHum(context, bus) {
  const level = gain(context, 0, bus);
  const purred = gain(context, 1, level);
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.8;
  filter.connect(purred);
  const body = oscillator(context, 'sawtooth', gain(context, 0.5, filter), 64);
  const sub = oscillator(context, 'sine', gain(context, 0.8, filter), 32);
  const purr = oscillator(context, 'sine', gain(context, PURR_DEPTH, purred.gain), 9);
  const oscillators = [body, sub, purr];
  for (const node of oscillators) node.start(context.currentTime);
  const last = { tone: null, at: -Infinity };
  return {
    set(tone, now) {
      if (now - last.at < RESEND_SECONDS || !moved(last.tone, tone)) return;
      Object.assign(last, { tone, at: now });
      if (!tone) {
        level.gain.setTargetAtTime(0, now, FADE);
        return;
      }
      body.frequency.setTargetAtTime(tone.frequency, now, GLIDE);
      sub.frequency.setTargetAtTime(tone.frequency / 2, now, GLIDE);
      purr.frequency.setTargetAtTime(tone.purr, now, GLIDE);
      filter.frequency.setTargetAtTime(tone.cutoff, now, GLIDE);
      level.gain.setTargetAtTime(tone.gain, now, GLIDE);
    },
    stop(at = context.currentTime) {
      for (const node of oscillators) node.stop(at);
      level.disconnect();
    },
  };
}
