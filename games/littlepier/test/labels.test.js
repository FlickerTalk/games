import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps", () => {
    checkTexts(TEXTS);
    expect(TEXTS.en.name).toBe("Little Pier");
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].name, lang).toBe("Little Pier");
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      for (const key of ["canvas", "water", "album", "charm", "place"]) expect(TEXTS[lang][key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("never call the game one for children", () => {
    for (const texts of Object.values(TEXTS)) for (const text of Object.values(texts)) expect(text).not.toMatch(/child|kid/i);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "charm" };
    expect(labelFor({ kind: "play" }, state)).toBe("Jugar");
    expect(labelFor({ kind: "water" }, state)).toBe(TEXTS.es.water);
    expect(labelFor({ kind: "variant", value: "album" }, state)).toBe("Álbum de cromos");
    expect(labelFor({ kind: "look", value: 0 }, state)).toBe("Amuleto del anzuelo 1");
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "place" })).toBe("Lugar de pesca 2");
    expect(labelFor({ kind: "tab", value: "place" }, state)).toBe("Lugares de pesca");
    expect(labelFor({ kind: "tab", value: "charm" }, state)).toBe("Amuletos del anzuelo");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "rival" }, state)).toBe("Volver a llamar a tu amigo");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
    expect(say("en", "charm", { n: 3 })).toBe("Hook charm 3");
  });
});
