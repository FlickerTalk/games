import { KIT_TEXTS } from "./texts.js";

export { KIT_TEXTS };

export const LANGUAGES = Object.keys(KIT_TEXTS);

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

export function translator(catalogue) {
  return (lang, key, vars = {}) => {
    const tag = String(lang || "en");
    const text = catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en?.[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? String(vars[name]) : gap));
  };
}

export function direction(lang) {
  return String(lang || "en").split("-")[0] === "ar" ? "rtl" : "ltr";
}
