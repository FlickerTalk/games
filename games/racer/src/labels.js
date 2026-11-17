import { TEXTS } from './texts.js';

function textsFor(lang) {
  if (TEXTS[lang]) return TEXTS[lang];
  const base = String(lang ?? '').split('-')[0];
  return TEXTS[base] ?? TEXTS.en;
}

function numberIn(lang, value) {
  try {
    return new Intl.NumberFormat(lang || undefined).format(value);
  } catch {
    return String(value);
  }
}

export function startLabel(lang, level) {
  return textsFor(lang).start.replace('{level}', numberIn(lang, level));
}

export function switchLabels(lang) {
  const { sound, music, volume } = textsFor(lang);
  return { sound, music, volume };
}

export function goneLabel(lang) {
  return textsFor(lang).away;
}
