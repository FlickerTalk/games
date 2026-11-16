import { createMixer } from './sound-mixer.js';
import { createEngineHum } from './sound-engine-hum.js';
import { createMusicPlayer } from './sound-music-player.js';
import { playVoice } from './sound-voice-player.js';
import { cueSound } from './sound-cues.js';
import { MUSIC_ON_BY_DEFAULT } from './sound-settings.js';

const CUE_DELAY = 0.01;

const settle = (promise) => promise?.catch?.(() => {});

function made(AudioContextClass) {
  try {
    return new AudioContextClass();
  } catch {
    return null;
  }
}

function build(state, AudioContextClass) {
  const context = made(AudioContextClass);
  if (!context) return;
  const blank = context.createBufferSource();
  blank.buffer = context.createBuffer(1, 1, context.sampleRate);
  blank.connect(context.destination);
  // Older iOS keeps Web Audio locked until a sound starts inside the touch itself.
  blank.start(0);
  const mixer = createMixer(context);
  state.context = context;
  state.parts = { mixer, hum: createEngineHum(context, mixer.engine), music: createMusicPlayer(context, mixer) };
  mixer.setVolume(context.currentTime, state.volume);
  syncSong(state);
}

const live = (state) => Boolean(state.context) && state.awake && state.volume > 0;

function refresh(state) {
  const { context } = state;
  if (!context) return;
  if (live(state) && context.state !== 'running') settle(context.resume?.());
  if (!live(state) && context.state === 'running') settle(context.suspend?.());
}

function syncSong(state) {
  if (state.context) state.parts.music.play(state.music ? state.song : null, state.context.currentTime);
}

function playCue(state, name) {
  const sound = cueSound(name);
  if (!sound || !live(state)) return;
  const { context, parts } = state;
  const at = context.currentTime + CUE_DELAY;
  for (const voice of sound.voices) playVoice(context, parts.mixer.effects, voice, at, parts.mixer.noise);
  if (sound.duck) parts.mixer.duckMusic(at, sound.duck);
}

export function createSound({ AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext } = {}) {
  const state = { context: null, parts: null, volume: 1, music: MUSIC_ON_BY_DEFAULT, awake: true, song: null };
  return {
    get unlocked() {
      return Boolean(state.context);
    },
    get muted() {
      return state.volume === 0;
    },
    get musicOn() {
      return state.music;
    },
    get playing() {
      return state.parts?.music.playing ?? null;
    },
    unlock() {
      if (!AudioContextClass) return;
      if (!state.context) build(state, AudioContextClass);
      refresh(state);
    },
    cue: (name) => playCue(state, name),
    engine(tone) {
      if (state.context) state.parts.hum.set(live(state) ? tone : null, state.context.currentTime);
    },
    song(name) {
      state.song = name;
      syncSong(state);
    },
    setAwake(awake) {
      if (state.awake === awake) return;
      state.awake = awake;
      refresh(state);
    },
    setVolume(gain) {
      state.volume = gain;
      if (state.context && gain > 0) state.parts.mixer.setVolume(state.context.currentTime, gain);
      refresh(state);
    },
    setMusicOn(on) {
      state.music = on;
      syncSong(state);
    },
    tick() {
      if (live(state)) state.parts.music.schedule(state.context.currentTime);
    },
    close() {
      if (!state.context) return;
      state.parts.hum.stop();
      state.parts.music.stop();
      settle(state.context.close?.());
      state.context = null;
      state.parts = null;
    },
  };
}
