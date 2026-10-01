// How the texts are read (Plan §84): the kit's (`texts.js`) and a game's, as one catalogue; a
// language the phone speaks that is not here falls back to its base, then to English.

import { KIT_TEXTS } from "./texts.js";

export { KIT_TEXTS };

export const LANGUAGES = Object.keys(KIT_TEXTS);

/** The kit's texts and a game's, as one catalogue. A game may not reuse a key of the kit's. */
export function joinTexts(kit, game) {
  for (const texts of Object.values(game)) {
    for (const key of Object.keys(texts)) {
      if (key in kit.en) throw new Error(`the game text "${key}" is a key of the kit`);
    }
  }
  const joined = {};
  for (const lang of new Set([...Object.keys(kit), ...Object.keys(game)])) joined[lang] = { ...kit[lang], ...game[lang] };
  return joined;
}

/**
 * `t(lang, key, vars)` over a catalogue: the exact language, then its base (`pt-BR` → `pt`), then
 * English, then the key itself; `{name}` gaps filled from `vars`.
 */
export function translator(catalogue) {
  return (lang, key, vars = {}) => {
    const tag = String(lang || "en");
    const text = catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en?.[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? String(vars[name]) : gap));
  };
}

/** Which way the text runs: right to left in Arabic, the one such language of the app. */
export function direction(lang) {
  return String(lang || "en").split("-")[0] === "ar" ? "rtl" : "ltr";
}
