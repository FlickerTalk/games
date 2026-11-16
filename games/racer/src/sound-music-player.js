import { SONGS } from './sound-songs.js';
import { compileScore, eventsBetween } from './sound-score.js';
import { instrumentVoices } from './sound-instruments.js';
import { playVoice } from './sound-voice-player.js';

export const LOOKAHEAD_SECONDS = 0.5;
export const FADE_SECONDS = 0.8;
const LEAD_IN = 0.05;

export function createMusicPlayer(context, mixer, songs = SONGS) {
  const compiled = Object.fromEntries(Object.entries(songs).map(([name, score]) => [name, compileScore(score)]));
  const state = { current: null, leaving: [] };

  const begin = (name, now) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + FADE_SECONDS);
    gain.connect(mixer.music);
    return { name, song: compiled[name], gain, startedAt: now + LEAD_IN, cursor: now + LEAD_IN };
  };

  const fadeOut = (track, now) => {
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.setTargetAtTime(0, now, FADE_SECONDS / 4);
    state.leaving.push({ gain: track.gain, until: now + FADE_SECONDS });
  };

  const book = (track, now) => {
    const until = now + LOOKAHEAD_SECONDS;
    for (const event of eventsBetween(track.song, track.startedAt, Math.max(track.cursor, now), until)) {
      for (const voice of instrumentVoices(event)) playVoice(context, track.gain, voice, event.at, mixer.noise);
    }
    track.cursor = Math.max(track.cursor, until);
  };

  return {
    get playing() {
      return state.current?.name ?? null;
    },
    play(name, now) {
      const wanted = name && compiled[name] ? name : null;
      if (wanted === this.playing) return;
      if (state.current) fadeOut(state.current, now);
      state.current = wanted ? begin(wanted, now) : null;
    },
    schedule(now) {
      const gone = state.leaving.filter((track) => track.until <= now);
      for (const track of gone) track.gain.disconnect();
      state.leaving = state.leaving.filter((track) => track.until > now);
      if (state.current) book(state.current, now);
    },
    stop() {
      for (const track of [...state.leaving, ...(state.current ? [state.current] : [])]) track.gain.disconnect();
      state.leaving = [];
      state.current = null;
    },
  };
}
