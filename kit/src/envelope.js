// The envelope every game message travels in over `ft.live` (README, "Protocol"). JSON, then
// UTF-8, then base64, as `ft.live.send` wants it. The core carries at most 48 KiB once decoded and
// only to the same plugin on the other phone; what arrives is checked here before anything reads it.

/** The format of the kit's messages; anything else on the channel is not ours. */
export const PROTOCOL = "ftgame";
/** The version of the kit's protocol. A newer kit keeps reading and speaking this one. */
export const KV = 1;
/** What the core lets through in one message, in bytes once decoded (`LIVE_LIMIT`). */
export const LIMIT = 48 * 1024;

/** The kinds of message the kit speaks. `part` is reserved for later (README): never sent yet. */
export const KINDS = ["hello", "sync", "state", "commit", "seed", "reveal", "bye", "busy", "deny"];

/** An id that is a plain name (a match, a participant): it ends up in a record key. */
export function isId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

export function toBase64(bytes) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  return btoa(binary);
}

export function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  return bytes;
}

/** A message as it travels. Throws `too_big` rather than hand the core what it would refuse. */
export function seal(message) {
  const bytes = new TextEncoder().encode(JSON.stringify(message));
  if (bytes.length > LIMIT) throw new RangeError("too_big");
  return toBase64(bytes);
}

/**
 * A message read back, for the game `g` at rules version `gv`: `{ message }` when it is ours and
 * we can apply it; `{ newer: { app } }` when the other phone speaks a newer protocol or newer
 * rules (nothing is applied; the user is told to update); null for anything else.
 */
export function unseal(data, { g, gv }) {
  let message;
  try {
    message = JSON.parse(new TextDecoder().decode(fromBase64(data)));
  } catch {
    return null;
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) return null;
  if (message.p !== PROTOCOL || message.g !== g || typeof message.kv !== "number") return null;
  if (message.kv > KV || (typeof message.gv === "number" && message.gv > gv)) {
    return { newer: { app: typeof message.app === "string" ? message.app : "" } };
  }
  if (!KINDS.includes(message.k) || !isId(message.doc) || !isId(message.who)) return null;
  return { message };
}
