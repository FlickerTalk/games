import { shape } from "./voices.js";

export const MASTER_LEVEL = 0.55;
export const MUSIC_LEVEL = 0.1;
export const DRONE_LEVEL = 0.06;
export const LIMITER = { threshold: -14, knee: 6, ratio: 12, attack: 0.003, release: 0.2 };

const STEP = { set: "setValueAtTime", linear: "linearRampToValueAtTime", exponential: "exponentialRampToValueAtTime" };
const STOP_AFTER = 0.02;
const GLIDE = 0.06;
const FADE = 0.08;

function settle(call) {
  try {
    Promise.resolve(call()).catch(() => {});
  } catch {}
}

function gain(context, value, output) {
  const node = context.createGain();
  node.gain.value = value;
  node.connect(output);
  return node;
}

function filterFor(context, { type, frequency, toFrequency, q = 0.7 }, start, end) {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, start);
  if (toFrequency) filter.frequency.exponentialRampToValueAtTime(toFrequency, end);
  return filter;
}

function source(context, noise, { wave, frequency }) {
  if (wave === "noise") {
    const looped = context.createBufferSource();
    looped.buffer = noise;
    looped.loop = true;
    return looped;
  }
  const oscillator = context.createOscillator();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  return oscillator;
}

function whiteNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let at = 0; at < samples.length; at += 1) samples[at] = Math.random() * 2 - 1;
  return buffer;
}

function playVoice(context, noise, voice, at, output) {
  const start = at + voice.start;
  const end = start + voice.duration;
  const sound = source(context, noise, voice);
  if (voice.wave !== "noise") {
    sound.frequency.setValueAtTime(voice.frequency, start);
    if (voice.toFrequency) sound.frequency.exponentialRampToValueAtTime(voice.toFrequency, end);
  }
  const level = context.createGain();
  for (const [kind, value, time] of shape(voice, at)) level.gain[STEP[kind]](value, time);
  const filter = voice.filter ? filterFor(context, voice.filter, start, end) : null;
  sound.connect(filter ?? level);
  filter?.connect(level);
  level.connect(output);
  sound.onended = () => level.disconnect();
  sound.start(start);
  sound.stop(end + STOP_AFTER);
}

export function droneLayers(layers) {
  const peak = layers.reduce((sum, layer) => sum + layer.gain * (1 + (layer.wobble?.depth ?? 0)), 0);
  const scale = peak > 1 ? 1 / peak : 1;
  return layers.map((layer) => ({ ...layer, gain: layer.gain * scale }));
}

function droneLayer(context, noise, layer, output) {
  const amount = gain(context, layer.gain, output);
  const filter = layer.filter ? filterFor(context, layer.filter, context.currentTime) : null;
  const sound = source(context, noise, layer);
  sound.connect(filter ?? amount);
  filter?.connect(amount);
  const sources = [sound];
  if (layer.wobble) {
    const wobble = source(context, noise, { wave: "sine", frequency: layer.wobble.rate });
    wobble.connect(gain(context, layer.gain * layer.wobble.depth, amount.gain));
    sources.push(wobble);
  }
  const tune = (pitch, at) => {
    if (layer.wave !== "noise") sound.frequency.setTargetAtTime(layer.frequency * pitch, at, GLIDE);
    filter?.frequency.setTargetAtTime(layer.filter.frequency * pitch, at, GLIDE);
  };
  return { sources, tune };
}

function makeDrone(context, noise, layers, output) {
  const level = gain(context, 0, output);
  const parts = droneLayers(layers).map((layer) => droneLayer(context, noise, layer, level));
  const sources = parts.flatMap((part) => part.sources);
  for (const one of sources) one.start(context.currentTime);
  sources[0].onended = () => level.disconnect();
  return {
    set(value, pitch, at) {
      level.gain.setTargetAtTime(value, at, GLIDE);
      for (const part of parts) part.tune(pitch, at);
    },
    stop(at) {
      level.gain.setTargetAtTime(0, at, FADE / 4);
      for (const one of sources) one.stop(at + FADE);
    },
  };
}

function mixer(context) {
  const limiter = context.createDynamicsCompressor();
  for (const [name, value] of Object.entries(LIMITER)) limiter[name].value = value;
  limiter.connect(context.destination);
  const master = gain(context, MASTER_LEVEL, limiter);
  return { master, effects: gain(context, 1, master), music: gain(context, MUSIC_LEVEL, master), drones: gain(context, DRONE_LEVEL, master) };
}

export function openAudio(AudioContextClass) {
  let context;
  try {
    context = new AudioContextClass();
  } catch {
    return null;
  }
  const blank = context.createBufferSource();
  blank.buffer = context.createBuffer(1, 1, context.sampleRate);
  blank.connect(context.destination);
  // iOS keeps Web Audio silent until a sound starts inside the touch itself.
  blank.start(0);
  const buses = mixer(context);
  const noise = whiteNoise(context);
  return {
    buses,
    noise,
    get running() {
      return context.state === "running";
    },
    time: () => context.currentTime,
    voice: (voice, at, bus) => playVoice(context, noise, voice, at, buses[bus]),
    drone: (layers) => makeDrone(context, noise, layers, buses.drones),
    level(bus, value, at, constant = 0.04) {
      buses[bus].gain.cancelScheduledValues(at);
      buses[bus].gain.setTargetAtTime(value, at, constant);
    },
    wake: () => settle(() => context.resume?.()),
    sleep: () => settle(() => context.suspend?.()),
    close: () => settle(() => context.close?.()),
  };
}
