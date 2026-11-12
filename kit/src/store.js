// Nothing outside the conversation's own `game/<chat>/` is listed, loaded, joined over or deleted.
// Written on every change, the plugin is never told it is being closed.

import { isId } from "./envelope.js";
import { PREFIX, RECORD } from "./match.js";

export const CHAT_LENGTH = 43;

export function isChat(value) {
  return typeof value === "string" && new RegExp(`^[A-Za-z0-9_-]{1,${CHAT_LENGTH}}$`).test(value);
}

// at most 113 bytes, the core allows 128
export function keyOf(chat, id) {
  if (!isChat(chat) || !isId(id)) throw new TypeError("not a conversation and a match");
  return `${PREFIX}${chat}/${id}`;
}

// a newer kit's record is left alone, not misread
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

export async function save(records, chat, record) {
  return Boolean(await records.set(keyOf(chat, record.id), JSON.stringify(record)));
}

export async function exists(records, chat, id) {
  return (await records.get(keyOf(chat, id))) !== null;
}

export async function load(records, chat, id) {
  const json = await records.get(keyOf(chat, id));
  return json ? parse(json) : null;
}

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
