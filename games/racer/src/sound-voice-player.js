const SILENT = 0.0001;
const STOP_AFTER = 0.02;

function toneSource(context, voice, start, end) {
  const oscillator = context.createOscillator();
  oscillator.type = voice.wave;
  oscillator.frequency.setValueAtTime(voice.frequency, start);
  if (voice.toFrequency) oscillator.frequency.exponentialRampToValueAtTime(voice.toFrequency, end);
  return oscillator;
}

function noiseSource(context, noise) {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  return source;
}

function filterFor(context, { type, frequency, toFrequency, q = 0.7 }, start, end) {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, start);
  if (toFrequency) filter.frequency.exponentialRampToValueAtTime(toFrequency, end);
  return filter;
}

function shapeLevel(param, voice, start, end) {
  const peakAt = start + voice.attack;
  param.setValueAtTime(0, start);
  param.linearRampToValueAtTime(voice.gain, peakAt);
  if (voice.shape === 'hold') {
    param.setValueAtTime(voice.gain, Math.max(peakAt, end - voice.release));
    param.linearRampToValueAtTime(0, end);
    return;
  }
  param.exponentialRampToValueAtTime(SILENT, end);
  param.setValueAtTime(0, end);
}

export function playVoice(context, output, voice, at, noise) {
  const start = at + voice.start;
  const end = start + voice.duration;
  const source = voice.wave === 'noise' ? noiseSource(context, noise) : toneSource(context, voice, start, end);
  const level = context.createGain();
  shapeLevel(level.gain, voice, start, end);
  const filter = voice.filter ? filterFor(context, voice.filter, start, end) : null;
  source.connect(filter ?? level);
  filter?.connect(level);
  level.connect(output);
  source.onended = () => level.disconnect();
  source.start(start);
  source.stop(end + STOP_AFTER);
  return source;
}
