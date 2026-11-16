import { fromBase64url, sha256, toBase64url, utf8 } from "./sha256.js";

export const CARDS = 52;
export const SEED_BYTES = 24;
const DOMAIN = "ftgames-deck-v1";
const ZERO = new Uint8Array([0]);
const SEED_LENGTH = Math.ceil((SEED_BYTES * 4) / 3);

export const commitText = (seed) => `c${toBase64url(sha256(utf8(DOMAIN), ZERO, seed))}`;
export const seedText = (seed) => `s${toBase64url(seed)}`;
export const revealText = (seed) => `r${toBase64url(seed)}`;

function seedOf(text) {
  const bytes = fromBase64url(text.slice(1));
  return text.length === 1 + SEED_LENGTH && bytes && bytes.length === SEED_BYTES ? bytes : null;
}

// Fisher–Yates fed by SHA-256: a byte too big for the range is skipped, so no card is likelier than another.
export function shuffled(seedA, seedB) {
  const first = sha256(utf8(`${DOMAIN}/out`), ZERO, seedA, seedB);
  let block = first;
  let at = 0;
  let counter = 0;
  const next = () => {
    if (at === block.length) {
      counter += 1;
      const k = new Uint8Array(4);
      new DataView(k.buffer).setUint32(0, counter);
      block = sha256(first, k);
      at = 0;
    }
    return block[at++];
  };
  const deck = Array.from({ length: CARDS }, (_, card) => card);
  for (let i = CARDS - 1; i > 0; i -= 1) {
    const range = i + 1;
    const limit = 256 - (256 % range);
    let byte = next();
    while (byte >= limit) byte = next();
    const j = byte % range;
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function shuffleStep({ commit, seedB }, move, side) {
  if (commit === null) {
    if (!/^c[A-Za-z0-9_-]{43}$/.test(move)) return { error: "bad" };
    if (side !== 0) return { error: "turn" };
    return { commit: move.slice(1), seedB: null, next: 1 };
  }
  if (seedB === null) {
    if (move[0] !== "s" || !seedOf(move)) return { error: "bad" };
    if (side !== 1) return { error: "turn" };
    return { commit, seedB: move.slice(1), next: 0 };
  }
  const seed = move[0] === "r" ? seedOf(move) : null;
  if (!seed) return { error: "bad" };
  if (side !== 0) return { error: "turn" };
  if (commitText(seed) !== `c${commit}`) return { cheat: true };
  return { deck: shuffled(seed, fromBase64url(seedB)) };
}
