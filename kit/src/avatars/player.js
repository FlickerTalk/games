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

export async function loadPlayer(store) {
  try {
    const record = JSON.parse(await store.get(PLAYER_KEY));
    return isRecord(record) && "who" in record ? normalizePlayer(record) : null;
  } catch {
    return null;
  }
}

export async function savePlayer(store, choice) {
  try {
    let kept = null;
    try {
      kept = JSON.parse(await store.get(PLAYER_KEY));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    const record = { ...(isRecord(kept) ? kept : {}), ...normalizePlayer(choice) };
    return (await store.set(PLAYER_KEY, JSON.stringify(record))) === true;
  } catch {
    return false;
  }
}
