import { describe, expect, it } from "vitest";
import { KIT_TEXTS } from "../../src/i18n.js";
import { HAIRS, HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { AVATAR_TEXTS } from "../../src/avatars/texts.js";
import { avatarText, colourKey, emblemKey, hairKey } from "../../src/avatars/words.js";
import { checkTexts } from "../helpers.js";

describe("the avatars' texts", () => {
  it("speak the app's 21 languages, every key in each, with the same gaps", () => {
    checkTexts(AVATAR_TEXTS);
    expect(Object.keys(AVATAR_TEXTS)).toEqual(Object.keys(KIT_TEXTS));
  });

  it("name every emblem, hairstyle and hair colour, each differently", () => {
    for (const lang of Object.keys(AVATAR_TEXTS)) {
      const named = (keys) => keys.map((key) => AVATAR_TEXTS[lang][key]);
      for (const [what, keys] of Object.entries({ emblems: PROFILES.map((one) => emblemKey(one.emblem)), hairs: HAIRS.map((one) => hairKey(one.id)), colours: HAIR_COLOURS.map((one) => colourKey(one.id)) })) {
        expect(named(keys).every(Boolean), `${lang} ${what}`).toBe(true);
        expect(new Set(named(keys)).size, `${lang} ${what}`).toBe(keys.length);
      }
    }
  });
});
