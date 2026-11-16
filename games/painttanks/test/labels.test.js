import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ro", "pl", "ru", "uk", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];

describe("the labels", () => {
  it("are in the app's 21 languages, the same keys and gaps in each, and translated", () => {
    expect(Object.keys(TEXTS).sort()).toEqual([...LANGS].sort());
    checkTexts({ ...TEXTS });
    for (const lang of LANGS.filter((one) => one !== "en")) {
      expect(TEXTS[lang].canvas, lang).not.toBe(TEXTS.en.canvas);
      expect(TEXTS[lang].fire, lang).not.toBe(TEXTS.en.fire);
    }
  });

  it("name every control the player can touch, with the number it shows", () => {
    const state = { lang: "es", mode: "flick", practice: false, looks: "tank", round: { aim: { angle: 45, power: 60 }, torpedo: false }, progress: { received: [] } };
    expect(labelFor({ kind: "fire" }, state)).toBe("Lanzar");
    expect(labelFor({ kind: "angle" }, state)).toBe("Apuntar más alto, ahora 45 grados");
    expect(labelFor({ kind: "variant", value: "deep" }, state)).toBe("Mar profundo");
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Tanque 2");
    expect(labelFor({ kind: "look", value: 4 }, state)).toBe("Una sorpresa, todavía envuelta");
    expect(labelFor({ kind: "look", value: 2 }, { ...state, looks: null })).toBe("Submarinos");
    expect(labelFor({ kind: "rival" }, state)).toMatch(/FlickerTalk/);
    expect(labelFor({ kind: "speaker" }, state)).toBeTruthy();
    expect(labelFor({ kind: "dive" }, { ...state, round: { ...state.round, torpedo: true } })).toBe("Subir");
    expect(say("bn", "power", { n: 60 })).toContain(new Intl.NumberFormat("bn").format(60));
  });
});
