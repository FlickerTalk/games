export const PROTOCOL = "ftgame";
// a newer kit keeps reading and speaking this version
export const KV = 1;
// bytes once decoded, the core's LIVE_LIMIT
export const LIMIT = 48 * 1024;

export const KINDS = ["hello", "sync", "state", "commit", "seed", "reveal", "bye", "busy", "deny"];

// ends up in a record key
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

export function seal(message) {
  const bytes = new TextEncoder().encode(JSON.stringify(message));
  if (bytes.length > LIMIT) throw new RangeError("too_big");
  return toBase64(bytes);
}

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
