import { SOUND_TEXTS } from "./texts.js";

const STEP = 0.1;
const SAMPLE = "tap";

const clamp = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const round = (value) => Math.round(clamp(value) * 100) / 100;

export const loudness = (volume) => (volume <= 0 ? "mute" : volume < 0.5 ? "low" : "high");

export const lineValue = (position, start, end) => (end === start ? 0 : clamp((position - start) / (end - start)));

export function keyValue(key, value, { rtl = false } = {}) {
  const right = rtl ? -STEP : STEP;
  const moves = { ArrowUp: STEP, ArrowDown: -STEP, ArrowRight: right, ArrowLeft: -right };
  if (key === "Home") return 0;
  if (key === "End") return 1;
  return Object.hasOwn(moves, key) ? round(value + moves[key]) : null;
}

function textsFor(lang) {
  const tag = String(lang || "en");
  return SOUND_TEXTS[tag] ?? SOUND_TEXTS[tag.split("-")[0]] ?? SOUND_TEXTS.en;
}

export function soundControls(sound) {
  let open = false;
  const volume = () => sound.settings.volume;
  return {
    get open() {
      return open;
    },
    get icon() {
      return loudness(volume());
    },
    get music() {
      return sound.settings.music;
    },
    toggle() {
      open = !open;
      return open;
    },
    fold() {
      open = false;
    },
    toggleMusic() {
      sound.set({ music: !sound.settings.music });
      sound.save();
    },
    slide(value) {
      sound.set({ volume: round(value) });
    },
    release() {
      sound.save();
      if (volume() > 0) sound.play(SAMPLE);
    },
    key(key, options) {
      if (key === "Escape") {
        open = false;
        return true;
      }
      const next = keyValue(key, volume(), options);
      if (next === null) return false;
      this.slide(next);
      this.release();
      return true;
    },
    labels(lang) {
      const value = new Intl.NumberFormat(lang || "en", { style: "percent" }).format(volume());
      return { ...textsFor(lang), value };
    },
  };
}
