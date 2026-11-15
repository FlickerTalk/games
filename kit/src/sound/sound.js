import { DRONE_LEVEL, MASTER_LEVEL, MUSIC_LEVEL, openAudio } from "./audio.js";
import { EFFECTS, effectVoices } from "./effects.js";
import { TUNES } from "./tunes.js";
import { musicPlayer } from "./music.js";
import { DEFAULT_SETTINGS, gainOf, loadSettings, normalize, saveSettings } from "./settings.js";

const DUCKED = 0.3;
const EFFECT_DELAY = 0.01;
const GESTURES = ["pointerdown", "pointerup", "touchend", "keydown", "click"];

const clamp = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1);
const audible = (state) => Boolean(state.audio) && state.awake && !state.closed && state.settings.volume > 0;
const live = (state) => audible(state) && state.loaded;
const musicLevel = (state) => MUSIC_LEVEL * (state.paused ? DUCKED : 1);

function book(state) {
  if (!live(state)) return;
  for (const { voice, at } of state.player.due(state.audio.time())) state.audio.voice(voice, at, "music");
}

function keepTime(state) {
  const wanted = live(state) && state.player.playing !== null;
  if (wanted && !state.timer) {
    state.timer = setInterval(() => book(state), state.every);
    book(state);
  }
  if (!wanted && state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function refresh(state) {
  const { audio } = state;
  if (audio && audible(state) && !audio.running) audio.wake();
  if (audio && !audible(state) && audio.running) audio.sleep();
  keepTime(state);
}

function syncMusic(state) {
  const { audio, player } = state;
  if (!audio) return;
  const wanted = state.settings.music ? state.tune : null;
  if (wanted !== player.playing) {
    const now = audio.time();
    player.play(wanted, now);
    audio.level("music", 0, now, wanted ? 0.005 : 0.15);
    if (wanted) audio.level("music", musicLevel(state), now + 0.05, 0.3);
  }
  refresh(state);
}

function syncDrone(state, name) {
  const wanted = state.drones.get(name);
  if (!state.audio || !wanted) return;
  wanted.handle ??= state.audio.drone(state.droneSpecs[name]);
  const { sent } = wanted;
  if (sent && Math.abs(sent.level - wanted.level) < 0.01 && Math.abs(sent.pitch - wanted.pitch) < 0.01) return;
  wanted.sent = { level: wanted.level, pitch: wanted.pitch };
  wanted.handle.set(wanted.level, wanted.pitch, state.audio.time());
}

function applyMix(state) {
  const { audio, settings } = state;
  if (!audio) return;
  const now = audio.time();
  if (settings.volume > 0) audio.level("master", MASTER_LEVEL * gainOf(settings.volume), now);
  if (state.player.playing) audio.level("music", musicLevel(state), now, 0.1);
  audio.level("drones", state.paused ? 0 : DRONE_LEVEL, now, 0.1);
}

function unlock(state) {
  if (state.closed || state.audio || globalThis.navigator?.userActivation?.isActive === false) return refresh(state);
  state.audio = state.AudioContextClass ? openAudio(state.AudioContextClass) : null;
  if (!state.audio) return;
  applyMix(state);
  for (const name of state.drones.keys()) syncDrone(state, name);
  syncMusic(state);
}

function choose(state, settings) {
  state.settings = settings;
  applyMix(state);
  syncMusic(state);
  for (const listener of state.listeners) listener({ ...settings });
}

function play(state, name, options) {
  const found = live(state) ? effectVoices(state.effects, name, options) : null;
  if (!found) return false;
  const at = state.audio.time() + EFFECT_DELAY;
  for (const voice of found.voices) state.audio.voice(voice, at, "effects");
  if (found.duck) {
    state.audio.level("music", MUSIC_LEVEL * DUCKED, at, 0.03);
    state.audio.level("music", musicLevel(state), at + found.duck, 0.25);
  }
  return true;
}

function drone(state, name, wanted) {
  if (!Object.hasOwn(state.droneSpecs, name)) return;
  const old = state.drones.get(name);
  if (!wanted) {
    old?.handle?.stop(state.audio?.time() ?? 0);
    state.drones.delete(name);
    return;
  }
  const pitch = Number.isFinite(wanted.pitch) && wanted.pitch > 0 ? wanted.pitch : 1;
  state.drones.set(name, { ...old, level: clamp(wanted.level ?? 1), pitch });
  syncDrone(state, name);
}

function listen(state, page, ft) {
  const onGesture = () => unlock(state);
  const onVisibility = () => {
    state.awake = page.visibilityState !== "hidden";
    refresh(state);
  };
  for (const type of GESTURES) page?.addEventListener(type, onGesture, true);
  page?.addEventListener("visibilitychange", onVisibility);
  ft?.onClose?.(() => close(state));
  return () => {
    for (const type of GESTURES) page?.removeEventListener(type, onGesture, true);
    page?.removeEventListener("visibilitychange", onVisibility);
  };
}

function close(state) {
  if (state.closed) return;
  state.closed = true;
  state.stopListening();
  refresh(state);
  for (const { handle } of state.drones.values()) handle?.stop(state.audio.time());
  state.drones.clear();
  state.audio?.close();
  state.audio = null;
}

export function createSound(spec = {}, options = {}) {
  const { ft = globalThis.ft, page = globalThis.document, AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext, every = 150 } = options;
  const state = {
    AudioContextClass, every, audio: null, timer: null, closed: false, loaded: false, chosen: false, paused: false, tune: null,
    awake: page?.visibilityState !== "hidden", settings: { ...DEFAULT_SETTINGS }, listeners: new Set(), drones: new Map(),
    effects: { ...EFFECTS, ...spec.effects }, player: musicPlayer({ ...TUNES, ...spec.tunes }), droneSpecs: { ...spec.drones },
  };
  state.stopListening = listen(state, page, ft);
  const ready = loadSettings(ft?.store).then((kept) => {
    state.loaded = true;
    if (state.chosen) refresh(state);
    else choose(state, kept);
    return { ...state.settings };
  });
  return {
    ready,
    get unlocked() { return Boolean(state.audio); },
    get playing() { return state.audio ? state.player.playing : null; },
    get settings() { return { ...state.settings }; },
    play: (name, effect) => play(state, name, effect),
    music(name) {
      state.tune = typeof name === "string" ? name : null;
      syncMusic(state);
    },
    drone: (name, wanted) => drone(state, name, wanted),
    pause(on = true) {
      state.paused = Boolean(on);
      applyMix(state);
    },
    set(change) {
      state.chosen = true;
      choose(state, normalize({ ...state.settings, ...change }));
      return { ...state.settings };
    },
    save: () => saveSettings(ft?.store, state.settings),
    onChange(listener) {
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    unlock: () => unlock(state),
    close: () => close(state),
  };
}
