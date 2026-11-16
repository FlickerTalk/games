import { randomOf } from "../../../kit/src/canvas/random.js";

export const STEPS_PER_SECOND = 50;
export const STEP_MS = 1000 / STEPS_PER_SECOND;
export const WINDOW_MS = 1000;
// nobody answers a signal faster than this: a shorter time is a tap made before seeing it
export const FLOOR_MS = 120;
export const MOST_EXCHANGES = 32;
export const FAKES = Object.freeze(["bird", "moon", "leaf"]);

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
// steps
const FIRST_READY = 40;
const WINDOW = WINDOW_MS / STEP_MS;
const REST = 50;
const LEAST_WAIT = 60;
const WAIT_SPREAD = 120;
const WAIT_A_FAKE = 50;
const FAKE_AFTER_READY = 25;
const FAKE_APART = 35;
const MOST_FAKES = 2;

function fakesOf(random, ready, wait, count) {
  const span = wait - LEAST_WAIT;
  const cell = Math.floor((span - FAKE_APART * (count - 1)) / Math.max(1, count));
  return Array.from({ length: count }, (_, at) => ({
    at: ready + FAKE_AFTER_READY + at * (cell + FAKE_APART) + Math.floor(random() * (cell + 1)),
    kind: FAKES[Math.floor(random() * FAKES.length)],
  }));
}

function exchangesOf(random, fakes, last) {
  const made = [];
  let ready = FIRST_READY;
  while (made.length < MOST_EXCHANGES) {
    const count = Math.max(0, Math.min(MOST_FAKES, Math.floor(fakes + random())));
    const wait = LEAST_WAIT + count * WAIT_A_FAKE + Math.floor(random() * WAIT_SPREAD);
    const end = ready + wait + WINDOW + REST;
    if (end > last) break;
    made.push({ ready, wait, fakes: fakesOf(random, ready, wait, count) });
    ready = end;
  }
  return made;
}

// The exchanges fill the round: what is left after the last one is shared out among the waits.
export function scheduleOf(seed, { fakes, seconds }) {
  const last = seconds * STEPS_PER_SECOND;
  const made = exchangesOf(randomOf(`${seed}/exchanges`), fakes, last);
  const spare = made.length ? Math.floor((last - made.at(-1).ready - made.at(-1).wait - WINDOW - REST) / made.length) : 0;
  return made.map((one, x) => {
    const ready = one.ready + x * spare;
    const signal = ready + one.wait + spare;
    return { x, ready, fakes: one.fakes.map((fake) => ({ ...fake, at: fake.at + x * spare })), signal, close: signal + WINDOW, end: signal + WINDOW + REST };
  });
}

export const exchangeAt = (schedule, step) => schedule.find((one) => step >= one.ready && step < one.end) ?? null;

const kindOf = (claim) => (!claim ? "none" : claim.r < FLOOR_MS ? "early" : "valid");

export function judge(first, second) {
  const kinds = [kindOf(first), kindOf(second)];
  const early = kinds.map((kind) => kind === "early");
  const beats = (mine, theirs, at) => kinds[at] === "valid" && (kinds[1 - at] !== "valid" || mine.r <= theirs.r);
  if (early[0] || early[1]) return { win: [early[1] && !early[0], early[0] && !early[1]], early };
  return { win: [beats(first, second, 0), beats(second, first, 1)], early };
}

export function tally(schedule, claims) {
  const said = new Map();
  for (const { x, r, seat } of claims) {
    if (!schedule[x]) continue;
    const pair = said.get(x) ?? [null, null];
    pair[seat] ??= { r };
    said.set(x, pair);
  }
  const results = new Map();
  const scores = [0, 0];
  for (const [x, [first, second]] of said) {
    const { win, early } = judge(first, second);
    results.set(x, { win, early, r: [first?.r ?? null, second?.r ?? null] });
    win.forEach((won, seat) => (scores[seat] += won ? 1 : 0));
  }
  return { scores, results };
}

// What this phone may show of an exchange: elapsed times are ms since each phone showed the signal, -1 before it.
export function standing({ mine, theirs, myElapsed, theirElapsed, slack, over = false }) {
  const verdict = () => ({ state: "done", ...judge(mine, theirs) });
  const [me, them] = [kindOf(mine), kindOf(theirs)];
  if (over || (mine && theirs) || me === "early" || them === "early") return verdict();
  if (me === "valid") return theirElapsed >= mine.r + slack ? verdict() : { state: "pending" };
  if (them === "valid" && myElapsed > theirs.r) return verdict();
  return { state: "open" };
}

const CLAIMS = /^(?:[A-Za-z0-9_-]{3})*$/;

export const encodeClaims = (claims) => claims.map(({ x, r }) => LETTERS[x] + LETTERS[(r >> 6) & 63] + LETTERS[r & 63]).join("");

export function decodeClaims(text, seat) {
  if (typeof text !== "string" || text.length > 3 * MOST_EXCHANGES || !CLAIMS.test(text)) return null;
  const claims = [];
  for (let at = 0; at < text.length; at += 3) {
    const [x, high, low] = [0, 1, 2].map((offset) => LETTERS.indexOf(text[at + offset]));
    const r = high * 64 + low;
    if (x >= MOST_EXCHANGES || r > WINDOW_MS || (claims.length && x <= claims.at(-1).x)) return null;
    claims.push({ x, r, seat });
  }
  return claims;
}
