import { AVATAR_TEXTS } from "./texts.js";

const pascal = (id) => String(id).replace(/(^|-)(\w)/g, (_, dash, letter) => letter.toUpperCase());

export const emblemKey = (emblem) => `emblem${pascal(emblem)}`;

export const hairKey = (hair) => `hair${pascal(hair)}`;

export const colourKey = (colour) => `colour${pascal(colour)}`;

const find = (tag, key) => {
  const own = (lang) => (Object.hasOwn(AVATAR_TEXTS, lang) && Object.hasOwn(AVATAR_TEXTS[lang], key) ? AVATAR_TEXTS[lang][key] : undefined);
  return own(tag) ?? own(tag.split("-")[0]) ?? own("en");
};

export function avatarText(lang, key, vars = {}) {
  const text = find(String(lang || "en"), key) ?? key;
  return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? String(vars[name]) : gap));
}
