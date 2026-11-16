import { waitAtMost } from './progress.js';
import { DEFAULT_VOLUME, normalizeVolume } from './sound-volume.js';

export const SOUND_KEY = 'sound';
export const MUSIC_ON_BY_DEFAULT = true;

export async function loadSoundSettings(store, { waitMs = 1000 } = {}) {
  const settings = { volume: DEFAULT_VOLUME, music: MUSIC_ON_BY_DEFAULT };
  let kept = null;
  try {
    const said = await waitAtMost(waitMs, Promise.resolve().then(() => store?.get(SOUND_KEY)));
    kept = typeof said === 'string' ? JSON.parse(said) : null;
  } catch {
    return settings;
  }
  if (kept?.volume !== undefined) settings.volume = normalizeVolume(kept.volume);
  if (typeof kept?.music === 'boolean') settings.music = kept.music;
  return settings;
}

export async function saveSoundSettings(store, { volume, music }) {
  try {
    return (await store?.set(SOUND_KEY, JSON.stringify({ volume, music }))) === true;
  } catch {
    return false;
  }
}
