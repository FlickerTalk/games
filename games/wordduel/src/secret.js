// the word and its salt are kept in the plugin's store until the reveal

import { fromBase64url, toBase64url } from "./sha256.js";
import { LENGTH, SALT_BYTES, accepted } from "./rules.js";

export const storeKey = (me, round) => `wordduel/${me}/${round}`;

export function cleaned(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/ñ/g, "ñ")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zñ]/g, "")
    .slice(0, LENGTH);
}

export function keeper(ft) {
  return {
    async keep(key, salt, word) {
      if (!ft?.store) return true;
      try {
        return (await ft.store.set(key, JSON.stringify({ salt: toBase64url(salt), word }))) !== false;
      } catch {
        return false;
      }
    },
    async recall(key, lang) {
      try {
        const kept = await ft?.store?.get?.(key);
        if (!kept) return null;
        const read = JSON.parse(kept);
        const salt = fromBase64url(read.salt);
        return salt && salt.length === SALT_BYTES && accepted(lang, read.word) ? { salt, word: read.word } : null;
      } catch {
        return null;
      }
    },
  };
}
