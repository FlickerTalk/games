// Where matches are kept (README, "A match belongs to its conversation"): one record each,
// `game/<chat>/<id>`, in the plugin's own records on this phone. `chat` is the conversation the
// plugin was opened in (`onOpen`): local, opaque, never sent. Nothing outside one conversation's
// partition is listed, loaded, joined over or deleted from it. Written on every change: the plugin
// is never told it is being closed.

import { isId } from "./envelope.js";
import { PREFIX, RECORD } from "./match.js";

/** The longest conversation id the core gives (`onOpen.chat`). */
export const CHAT_LENGTH = 43;

/** A conversation id as the core gives it; anything else is no conversation. */
export function isChat(value) {
  return typeof value === "string" && new RegExp(`^[A-Za-z0-9_-]{1,${CHAT_LENGTH}}$`).test(value);
}

/** The key of a match in a conversation: `game/<chat>/<id>`, at most 113 bytes (the core allows 128). */
export function keyOf(chat, id) {
  if (!isChat(chat) || !isId(id)) throw new TypeError("not a conversation and a match");
  return `${PREFIX}${chat}/${id}`;
}

/** A kept match we can read, or null. A record of a newer kit is left alone, not misread. */
function parse(json) {
  try {
    const record = JSON.parse(json);
    if (!record || record.v !== RECORD || !isId(record.id) || !isId(record.me)) return null;
    if (!record.game || typeof record.game !== "object" || !Array.isArray(record.game.moves)) return null;
    return record;
  } catch {
    return null;
  }
}

/** Keeps a match. False when the phone has no room left for it: the old copy stays. */
export async function save(records, chat, record) {
  return Boolean(await records.set(keyOf(chat, record.id), JSON.stringify(record)));
}

/** Whether anything at all is kept under a match's key, readable by this kit or not. */
export async function exists(records, chat, id) {
  return (await records.get(keyOf(chat, id))) !== null;
}

export async function load(records, chat, id) {
  const json = await records.get(keyOf(chat, id));
  return json ? parse(json) : null;
}

/** The matches of game `g` kept in this conversation, the most recently changed first. */
export async function list(records, chat, g) {
  const found = [];
  const prefix = `${PREFIX}${chat}/`;
  if (!isChat(chat)) return found;
  for (const key of await records.keys(prefix)) {
    const record = parse(await records.get(key));
    if (record && record.g === g && keyOf(chat, record.id) === key) found.push(record);
  }
  return found.sort((one, two) => two.updated - one.updated);
}

export async function forget(records, chat, id) {
  await records.forget(keyOf(chat, id));
}
