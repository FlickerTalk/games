import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].canvas.startsWith(TEXTS[lang].name), lang).toBe(true);
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      for (const key of ["canvas", "ruler", "short", "medium", "long", "tip", "place"]) expect(TEXTS[lang][key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("never call the game one for children", () => {
    for (const texts of Object.values(TEXTS)) for (const text of Object.values(texts)) expect(text).not.toMatch(/child|kid|niñ|enfant|kinder|bambin/i);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "tip", layout: { slices: 4 } };
    expect(labelFor({ kind: "play" }, state)).toBe("Jugar");
    expect(labelFor({ kind: "ruler", value: 1 }, state)).toBe(say("es", "ruler", { n: 2, of: 4 }));
    expect(labelFor({ kind: "ruler", value: 1 }, state)).toMatch(/2.*4/);
    expect(labelFor({ kind: "variant", value: "long" }, state)).toBe(TEXTS.es.long);
    expect(labelFor({ kind: "look", value: 0 }, state)).toBe(say("es", "tip", { n: 1 }));
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "place" })).toBe(say("es", "place", { n: 2 }));
    expect(labelFor({ kind: "tab", value: "place" }, state)).toBe(TEXTS.es.tabPlace);
    expect(labelFor({ kind: "tab", value: "tip" }, state)).toBe(TEXTS.es.tabTip);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "rival" }, state)).toBe(TEXTS.es.call);
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume", "music"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
    expect(say("en", "tip", { n: 3 })).toBe("Arrow tip 3");
  });
});
