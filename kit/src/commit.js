// Commit and reveal with SHA-256 (README, "Commit and reveal"; plan 9.4–9.5). Neither phone can
// choose an outcome: the committer binds itself to its random bytes before it sees the other's,
// and the other picks its bytes without knowing the committer's. WebCrypto's SHA-256 only: no
// other primitive, no hash of our own. Strings are UTF-8; numbers are u32 big-endian.
//
//   commitment = SHA-256(domain ‖ 0x00 ‖ match id ‖ 0x00 ‖ n ‖ r)
//   outcome    = SHA-256(domain + "/out" ‖ 0x00 ‖ match id ‖ 0x00 ‖ n ‖ r ‖ o)

const COIN = "ftgames-coin-v1";
const DICE = "ftgames-dice-v1";
const SHIPS = "ftgames-ships-v1";

const utf8 = (text) => new TextEncoder().encode(text);
const ZERO = new Uint8Array([0]);

function u32(n) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, n);
  return bytes;
}

/** SHA-256 of the parts, one after the other. */
export async function sha256(...parts) {
  const whole = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    whole.set(part, at);
    at += part.length;
  }
  return new Uint8Array(await crypto.subtle.digest("SHA-256", whole));
}

export function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Bytes from hex; null when it is not hex. */
export function fromHex(text) {
  if (typeof text !== "string" || text.length % 2 || !/^[0-9a-f]*$/i.test(text)) return null;
  return Uint8Array.from(text.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

export function randomBytes(length = 32) {
  return crypto.getRandomValues(new Uint8Array(length));
}

const commitment = async (domain, g, n, r) => hex(await sha256(utf8(domain), ZERO, utf8(g), ZERO, u32(n), r));
const outcome = (domain, g, n, r, o) => sha256(utf8(`${domain}/out`), ZERO, utf8(g), ZERO, u32(n), r, o);
const valid = (r) => r instanceof Uint8Array && r.length === 32;

/** The committer's commitment to the coin toss `n` of match `g` (the opening toss is 0). */
export function coinCommit(g, r, n = 0) {
  return commitment(COIN, g, n, r);
}

/** Whether `r` is what the committer bound itself to with `c`. */
export async function verifyCoin(g, r, c, n = 0) {
  return valid(r) && (await coinCommit(g, r, n)) === c;
}

/** Where the coin lands: 0, the committer starts; 1, the other side does. */
export async function coinToss(g, r, o, n = 0) {
  return (await outcome(COIN, g, n, r, o))[0] % 2;
}

export function diceCommit(g, n, r) {
  return commitment(DICE, g, n, r);
}

export async function verifyDice(g, n, r, c) {
  return valid(r) && (await diceCommit(g, n, r)) === c;
}

/**
 * `count` dice of roll `n`: the outcome's bytes in order, dropping those from 252 up so each face
 * is as likely (die = byte mod 6 + 1); when they run out, SHA-256(outcome ‖ k) for k = 1, 2, …
 */
export async function rollDice(g, n, r, o, count) {
  const first = await outcome(DICE, g, n, r, o);
  const faces = [];
  let block = first;
  for (let counter = 1; ; counter += 1) {
    for (const byte of block) {
      if (byte >= 252) continue;
      faces.push((byte % 6) + 1);
      if (faces.length === count) return faces;
    }
    block = await sha256(first, u32(counter));
  }
}

const cellOrder = (cell) => [cell.charCodeAt(0), Number(cell.slice(1))];
const byCell = (one, two) => {
  const [a, b] = [cellOrder(one), cellOrder(two)];
  return a[0] - b[0] || a[1] - b[1];
};

/** A fleet written one way only: each ship's cells by letter then number, joined by commas;
 *  ships by their first cell, joined by semicolons (`A9,A10;E3,E4,E5`). */
export function canonicalFleet(ships) {
  return ships
    .map((ship) => [...ship].sort(byCell))
    .sort((one, two) => byCell(one[0], two[0]))
    .map((ship) => ship.join(","))
    .join(";");
}

/** The commitment to a hidden fleet: SHA-256(domain ‖ 0x00 ‖ match id ‖ 0x00 ‖ salt ‖ fleet). */
export async function fleetCommit(g, salt, ships) {
  return hex(await sha256(utf8(SHIPS), ZERO, utf8(g), ZERO, salt, utf8(canonicalFleet(ships))));
}

export async function verifyFleet(g, salt, ships, c) {
  return valid(salt) && (await fleetCommit(g, salt, ships)) === c;
}
