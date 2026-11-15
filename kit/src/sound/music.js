import { compileScore, eventsBetween } from "./score.js";
import { instrumentVoices } from "./instruments.js";

export const LOOKAHEAD = 0.5;
const LEAD_IN = 0.05;

export function musicPlayer(tunes) {
  const songs = Object.fromEntries(Object.entries(tunes).map(([name, tune]) => [name, compileScore(tune)]));
  let current = null;
  return {
    get playing() {
      return current?.name ?? null;
    },
    play(name, now) {
      const wanted = Object.hasOwn(songs, name ?? "") ? name : null;
      if (wanted === this.playing) return;
      current = wanted && { name: wanted, song: songs[wanted], startedAt: now + LEAD_IN, cursor: now + LEAD_IN };
    },
    due(now) {
      if (!current) return [];
      const until = now + LOOKAHEAD;
      const events = eventsBetween(current.song, current.startedAt, Math.max(current.cursor, now), until);
      current.cursor = Math.max(current.cursor, until);
      return events.flatMap((event) => instrumentVoices(event).map((voice) => ({ voice, at: event.at })));
    },
  };
}
