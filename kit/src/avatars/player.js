import { HAIRS, HAIR_COLOURS, PROFILES, profileOf } from "./cast.js";

export const PLAYER_KEY = "player";

export const NAME_LENGTH = 12;

const HIDDEN = /[\p{Cc}؜‎‏‪-‮⁦-⁩﻿]/gu;

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const known = (list, id) => list.some((one) => one.id === id);

export function defaultPlayer() {
  return { who: PROFILES[0].id, hair: HAIRS[0].id, hairColour: HAIR_COLOURS[0].id, name: "" };
}

function letters(text) {
  if (typeof Intl.Segmenter !== "function") return Array.from(text);
  return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (part) => part.segment);
}

export function cleanName(raw) {
  if (typeof raw !== "string") return "";
  const text = raw.replace(/\s+/g, " ").replace(HIDDEN, "").trim();
  return letters(text).slice(0, NAME_LENGTH).join("").trim();
}

export function normalizePlayer(raw) {
  const given = isRecord(raw) ? raw : {};
  const fallback = defaultPlayer();
  return {
    who: known(PROFILES, given.who) ? given.who : fallback.who,
    hair: known(HAIRS, given.hair) ? given.hair : fallback.hair,
    hairColour: known(HAIR_COLOURS, given.hairColour) ? given.hairColour : fallback.hairColour,
    name: cleanName(given.name),
  };
}

export function playerName(choice) {
  return cleanName(choice?.name) || profileOf(choice?.who).name;
}

const SHARED_WAIT = 1000; // ms

const isChoice = (record) => isRecord(record) && "who" in record;

const sameChoice = (one, other) => ["who", "hair", "hairColour", "name"].every((field) => one[field] === other[field]);

// an app without the shared player has no ft.player, and its frame would never answer the call
const offered = (players) => (typeof players?.get === "function" && typeof players?.set === "function" ? players : null);

async function ask(call) {
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(resolve, SHARED_WAIT);
  });
  try {
    return await Promise.race([Promise.resolve().then(call), late]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function loadOwn(store) {
  try {
    const record = JSON.parse(await store.get(PLAYER_KEY));
    return isChoice(record) ? normalizePlayer(record) : null;
  } catch {
    return null;
  }
}

async function saveOwn(store, player) {
  try {
    let kept = null;
    try {
      kept = JSON.parse(await store.get(PLAYER_KEY));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    const record = { ...(isRecord(kept) ? kept : {}), ...player };
    return (await store.set(PLAYER_KEY, JSON.stringify(record))) === true;
  } catch {
    return false;
  }
}

export async function loadPlayer(store, players = globalThis.ft?.player) {
  const shared = offered(players);
  const kept = shared ? await ask(() => shared.get()) : undefined;
  if (isChoice(kept)) return normalizePlayer(kept);
  const own = await loadOwn(store);
  if (own && kept === null) await ask(() => shared.set(own));
  return own;
}

export async function savePlayer(store, choice, players = globalThis.ft?.player) {
  const player = normalizePlayer(choice);
  const kept = await saveOwn(store, player);
  const shared = offered(players);
  if (!shared) return kept;
  if ((await ask(() => shared.set(player))) === true) return true;
  if (!kept) return false;
  const now = await ask(() => shared.get());
  return !isChoice(now) || sameChoice(normalizePlayer(now), player);
}
