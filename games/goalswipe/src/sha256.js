// The rules replay a match at once, and WebCrypto's digest answers later: SHA-256 as FIPS 180-4 writes it.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const turn = (word, by) => (word >>> by) | (word << (32 - by));

function padded(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  bytes[length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(bytes.length - 8, Math.floor((length * 8) / 0x100000000));
  view.setUint32(bytes.length - 4, (length * 8) >>> 0);
  return view;
}

function mixBlock(state, words) {
  let [a, b, c, d, e, f, g, h] = state;
  for (let at = 0; at < 64; at += 1) {
    const one = (h + (turn(e, 6) ^ turn(e, 11) ^ turn(e, 25)) + ((e & f) ^ (~e & g)) + K[at] + words[at]) >>> 0;
    const two = ((turn(a, 2) ^ turn(a, 13) ^ turn(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
    [h, g, f, e, d, c, b, a] = [g, f, e, (d + one) >>> 0, c, b, a, (one + two) >>> 0];
  }
  [a, b, c, d, e, f, g, h].forEach((value, at) => (state[at] = (state[at] + value) >>> 0));
}

export function sha256(...parts) {
  const view = padded(parts);
  const state = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const words = new Uint32Array(64);
  for (let block = 0; block < view.byteLength; block += 64) {
    for (let at = 0; at < 16; at += 1) words[at] = view.getUint32(block + at * 4);
    for (let at = 16; at < 64; at += 1) {
      const early = words[at - 15];
      const late = words[at - 2];
      words[at] = (words[at - 16] + (turn(early, 7) ^ turn(early, 18) ^ (early >>> 3)) + words[at - 7] + (turn(late, 17) ^ turn(late, 19) ^ (late >>> 10))) >>> 0;
    }
    mixBlock(state, words);
  }
  const digest = new Uint8Array(32);
  state.forEach((value, at) => new DataView(digest.buffer).setUint32(at * 4, value));
  return digest;
}

export const utf8 = (text) => new TextEncoder().encode(text);

export const hex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export function toBase64url(bytes) {
  let text = "";
  for (let at = 0; at < bytes.length; at += 3) {
    const group = (bytes[at] << 16) | ((bytes[at + 1] ?? 0) << 8) | (bytes[at + 2] ?? 0);
    const letters = at + 2 < bytes.length ? 4 : at + 1 < bytes.length ? 3 : 2;
    for (let letter = 0; letter < letters; letter += 1) text += LETTERS[(group >>> (18 - letter * 6)) & 63];
  }
  return text;
}

export function fromBase64url(text) {
  if (typeof text !== "string" || !/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let bits = 0;
  let held = 0;
  let at = 0;
  for (const letter of text) {
    held = (held << 6) | LETTERS.indexOf(letter);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[at] = (held >>> bits) & 255;
      at += 1;
    }
  }
  return bytes;
}
