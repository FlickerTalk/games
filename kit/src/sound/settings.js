export const SOUND_KEY = "sound";

export const DEFAULT_SETTINGS = Object.freeze({ volume: 1, music: true });

const onLine = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

export const gainOf = (volume) => onLine(volume) ** 2;

export function normalize(kept) {
  const volume = kept?.volume;
  return {
    volume: typeof volume === "number" && volume >= 0 && volume <= 1 ? volume : DEFAULT_SETTINGS.volume,
    music: typeof kept?.music === "boolean" ? kept.music : DEFAULT_SETTINGS.music,
  };
}

function atMost(waitMs, promise) {
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

export async function loadSettings(store, { waitMs = 1000 } = {}) {
  try {
    const said = await atMost(waitMs, Promise.resolve().then(() => store?.get(SOUND_KEY)));
    return normalize(typeof said === "string" ? JSON.parse(said) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(store, { volume, music }) {
  try {
    return (await store?.set(SOUND_KEY, JSON.stringify({ volume, music }))) === true;
  } catch {
    return false;
  }
}
