// Where matches are kept (README, "Storage"): one record each, `game/<id>`, in the plugin's own
// records on this phone. Written on every change: the plugin is never told it is being closed.

import { isId } from "./envelope.js";
import { PREFIX, RECORD } from "./match.js";

export function keyOf(id) {
  return `${PREFIX}${id}`;
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
export async function save(records, record) {
  return Boolean(await records.set(keyOf(record.id), JSON.stringify(record)));
}

/** Whether anything at all is kept under a match's key, readable by this kit or not. */
export async function exists(records, id) {
  return (await records.get(keyOf(id))) !== null;
}

export async function load(records, id) {
  const json = await records.get(keyOf(id));
  return json ? parse(json) : null;
}

/** The matches of game `g` kept here, the most recently changed first. */
export async function list(records, g) {
  const found = [];
  for (const key of await records.keys(PREFIX)) {
    const record = parse(await records.get(key));
    if (record && record.g === g && keyOf(record.id) === key) found.push(record);
  }
  return found.sort((one, two) => two.updated - one.updated);
}

export async function forget(records, id) {
  await records.forget(keyOf(id));
}
