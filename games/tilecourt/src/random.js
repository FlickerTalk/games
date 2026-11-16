export const SEED_LENGTH = 8;

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SEED = new RegExp(`^[A-Za-z0-9_-]{${SEED_LENGTH}}$`);

export const isSeed = (value) => typeof value === "string" && SEED.test(value);

function hash(text, salt) {
  let state = (0x811c9dc5 ^ salt) >>> 0;
  for (const char of String(text)) {
    state ^= char.codePointAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  state ^= state >>> 16;
  state = Math.imul(state, 0x85ebca6b) >>> 0;
  state ^= state >>> 13;
  return state >>> 0;
}

export function seedOf(text) {
  const high = hash(text, 0x9e3779b9);
  const low = hash(text, 0x7f4a7c15);
  let seed = "";
  for (let at = 0; at < SEED_LENGTH; at += 1) seed += LETTERS[(at < 4 ? high >>> (at * 6) : low >>> ((at - 4) * 6)) & 63];
  return seed;
}

export function randomOf(seed) {
  let state = hash(seed, 0x2545f491);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
