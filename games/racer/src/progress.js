import { isChat } from './opening.js';
import { normalizeProfile } from './profile.js';

export const BEST_LEVEL_KEY = 'best-level';
export const PROFILE_KEY = 'player';
const LEVEL = /^[1-9]\d{0,3}$/;

export function levelKey(chat) {
  return isChat(chat) ? `${BEST_LEVEL_KEY}/${chat}` : BEST_LEVEL_KEY;
}

export function waitAtMost(milliseconds, promise) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function loadLevel(store, { key = BEST_LEVEL_KEY, waitMs = 1000 } = {}) {
  try {
    const said = await waitAtMost(waitMs, Promise.resolve().then(() => store?.get(key)));
    return typeof said === 'string' && LEVEL.test(said) ? Number(said) : 1;
  } catch {
    return 1;
  }
}

export async function saveLevel(store, level, key = BEST_LEVEL_KEY) {
  try {
    return (await store?.set(key, String(level))) === true;
  } catch {
    return false;
  }
}

export async function loadProfile(store, { waitMs = 1000 } = {}) {
  try {
    const said = await waitAtMost(waitMs, Promise.resolve().then(() => store?.get(PROFILE_KEY)));
    return normalizeProfile(typeof said === 'string' ? JSON.parse(said) : null);
  } catch {
    return normalizeProfile(null);
  }
}

export async function saveProfile(store, profile) {
  try {
    return (await store?.set(PROFILE_KEY, JSON.stringify(profile))) === true;
  } catch {
    return false;
  }
}
