const SPLASHING = ["ground", "floor", "vehicle", "target", "surface"];
const STAINING = ["ground", "floor"];
const STAINS_KEPT = 30;

export const SPLASH_MS = 1100;
export const WIPE_MS = 1800;
export const STAR_MS = 900;
export const TARGET_MS = 1100;
export const WATER_STAIN_MS = 5000;

function soundOf(flight, scored, struck, painted) {
  if (painted) return "pop";
  if (struck) return "collect";
  if (flight.bounced) return "bounce";
  if (flight.entry) return "splash";
  return scored ? "collect" : "place";
}

export function landed(game, state, now) {
  const { round, moments } = game.state;
  const { side, flight, rained, special } = state.last;
  const team = side === round.mySide ? 0 : 1;
  const { end, entry } = flight;
  const seed = Math.round(end.x * 7 + end.y * 3) % 97;
  const size = special ? 60 : 44;
  if (entry) {
    moments.push({ kind: "splash", water: true, x: entry.x, y: entry.y, size, team, seed, start: now, duration: SPLASH_MS });
    round.stains.push({ water: true, x: entry.x, y: entry.y + 6, size: 24, team, seed, at: now });
  }
  if (SPLASHING.includes(end.kind)) moments.push({ kind: "splash", water: false, x: end.x, y: end.y, size, team, seed, start: now, duration: SPLASH_MS });
  if (STAINING.includes(end.kind)) round.stains.push({ water: false, x: end.x, y: end.y, size: special ? 30 : 20, team, seed });
  round.stains = round.stains.slice(-STAINS_KEPT);
  const others = flight.painted.filter((one) => one !== side);
  for (const painted of flight.painted) moments.push({ kind: "wipe", side: painted, start: now + 600, duration: WIPE_MS });
  if (rained !== null && rained !== undefined) moments.push({ kind: "wipe", side: rained, start: now + 300, duration: WIPE_MS });
  for (const index of flight.struck) moments.push({ kind: "target", index, start: now, duration: TARGET_MS });
  round.hitBy = { ...round.hitBy, ...Object.fromEntries(flight.struck.map((index) => [index, team])) };
  const points = others.length + flight.struck.length;
  for (let star = 0; star < points; star += 1) moments.push({ kind: "star", x: end.x, y: end.y, to: team === 0 ? "me" : "rival", start: now + star * 120, duration: STAR_MS });
  round.paths[side] = flight.path;
  game.sound.play(soundOf(flight, points > 0, flight.struck.length > 0, flight.painted.length > 0));
}
