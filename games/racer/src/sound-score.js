import { noteFrequency } from './sound-pitch.js';

const TOKEN = /^(r|[khs]|[A-G][#b]?\d)(?::([1-9]\d*))?$/;
const DRUMS = new Set(['k', 'h', 's']);

export function parseTrack(text) {
  return text.trim().split(/\s+/).map((token) => {
    const match = TOKEN.exec(token);
    if (!match) throw new Error(`not a note, drum or rest: ${token}`);
    return { sound: match[1] === 'r' ? null : match[1], steps: match[2] ? Number(match[2]) : 1 };
  });
}

function trackEvents(track, loopSteps, stepSeconds) {
  const pattern = parseTrack(track.notes);
  const patternSteps = pattern.reduce((sum, note) => sum + note.steps, 0);
  if (loopSteps % patternSteps !== 0) throw new Error(`${track.instrument}: ${patternSteps} steps do not fill ${loopSteps}`);
  const events = [];
  for (let step = 0; step < loopSteps;) {
    for (const { sound, steps } of pattern) {
      if (sound) events.push(eventOf(track, sound, step * stepSeconds, steps * stepSeconds));
      step += steps;
    }
  }
  return events;
}

function eventOf(track, sound, time, duration) {
  const event = { time, duration, instrument: track.instrument, sound, volume: track.volume ?? 1 };
  if (!DRUMS.has(sound)) event.frequency = noteFrequency(sound);
  return event;
}

export function compileScore(score) {
  const stepSeconds = 60 / score.tempo / score.stepsPerBeat;
  const loopSteps = score.bars * score.beatsPerBar * score.stepsPerBeat;
  const events = score.tracks.flatMap((track) => trackEvents(track, loopSteps, stepSeconds));
  events.sort((a, b) => a.time - b.time);
  return { stepSeconds, loopSeconds: loopSteps * stepSeconds, events };
}

export function eventsBetween(song, startedAt, from, to) {
  if (!(to > from)) return [];
  const first = Math.max(0, Math.floor((from - startedAt) / song.loopSeconds));
  const last = Math.floor((to - startedAt) / song.loopSeconds);
  const found = [];
  for (let loop = first; loop <= last; loop += 1) {
    const loopStart = startedAt + loop * song.loopSeconds;
    for (const event of song.events) {
      const at = loopStart + event.time;
      if (at >= from && at < to) found.push({ ...event, at });
    }
  }
  return found;
}
