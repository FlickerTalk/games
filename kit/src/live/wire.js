import { KV, LIMIT, PROTOCOL, fromBase64, isId, seal } from "../envelope.js";

// apart from envelope.js KINDS, so a turn-based game never reads them and its bundle does not change
export const LIVE_KINDS = ["hello", "ready", "go", "tick", "done", "bye"];
// bytes once decoded
export const TICK_LIMIT = 1024;
// ms
export const MAX_COUNTDOWN = 10_000;
// ms
export const MAX_TIME = 3_600_000;

const ENCODED = Math.ceil(LIMIT / 3) * 4;

const time = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_TIME;
const version = (value) => (typeof value === "string" ? value.slice(0, 32) : "");

export function sealLive({ g, gv, k, doc, who, ...fields }) {
  const message = { p: PROTOCOL, kv: KV, g, gv, k, doc, who, ...fields };
  if (k === "tick" && new TextEncoder().encode(JSON.stringify(message)).length > TICK_LIMIT) throw new RangeError("too_big");
  return seal(message);
}

function state(message, check) {
  if (!time(message.t) || !("s" in message)) return null;
  try {
    const s = check(message.s);
    return s === null || s === undefined ? null : { t: message.t, s };
  } catch {
    return null;
  }
}

function fields(message, check) {
  switch (message.k) {
    case "hello":
      return typeof message.ready === "boolean" ? { ready: message.ready, re: message.re === true, app: version(message.app) } : null;
    case "go":
      return Number.isInteger(message.ms) && message.ms >= 0 && message.ms <= MAX_COUNTDOWN ? { ms: message.ms } : null;
    case "tick":
      return state(message, check);
    case "done":
      return message.t === null || time(message.t) ? { t: message.t } : null;
    default:
      return {};
  }
}

export function openLive(data, { g, gv, check }) {
  if (typeof data !== "string" || data.length > ENCODED) return null;
  let bytes;
  let message;
  try {
    bytes = fromBase64(data);
    message = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) return null;
  if (message.p !== PROTOCOL || message.g !== g || typeof message.kv !== "number" || typeof message.gv !== "number") return null;
  if (message.kv > KV || message.gv > gv) return { newer: { app: version(message.app) } };
  if (message.gv < gv || !LIVE_KINDS.includes(message.k) || !isId(message.doc) || !isId(message.who)) return null;
  if (message.k === "tick" && bytes.length > TICK_LIMIT) return null;
  const read = fields(message, check);
  return read ? { message: { k: message.k, doc: message.doc, who: message.who, ...read } } : null;
}
