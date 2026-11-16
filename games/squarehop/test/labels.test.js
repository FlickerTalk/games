import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ro", "pl", "ru", "uk", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps, translated rather than copied", () => {
    checkTexts(TEXTS);
    expect(Object.keys(TEXTS)).toEqual(LANGS);
    for (const lang of LANGS) expect(TEXTS[lang].canvas.startsWith(TEXTS[lang].name), lang).toBe(true);
    for (const lang of LANGS.slice(1)) {
      const same = Object.keys(TEXTS.en).filter((key) => !["name", "flick"].includes(key) && TEXTS[lang][key] === TEXTS.en[key]);
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });

  it("never call the game one for children", () => {
    for (const lang of LANGS) for (const text of Object.values(TEXTS[lang])) expect(text).not.toMatch(/child|kid|niñ|enfant|Kinder|bambin|criança|copii|dziec|дет|діт|çocuk|أطفال|बच्च|শিশু|anak|trẻ em|เด็ก|子ども|子供|어린이|儿童|兒童/i);
  });

  it("name every button the canvas draws, in the player's language", () => {
    const state = { lang: "es", mode: "alone", looks: "track", screen: "play", round: { dice: [2, 5] } };
    expect(labelFor({ kind: "play" }, state)).toBe("Jugar");
    expect(labelFor({ kind: "die", value: 0 }, state)).toBe("Saltar 2 casillas");
    expect(labelFor({ kind: "die", value: 1 }, state)).toBe("Saltar 5 casillas");
    expect(labelFor({ kind: "die", value: 1 }, { ...state, lang: "ar" })).toContain(new Intl.NumberFormat("ar").format(5));
    expect(labelFor({ kind: "variant", value: "flick" }, state)).toBe("Jugar contra FlickerTalk");
    expect(labelFor({ kind: "variant", value: "pair" }, state)).toBe("Dos jugadores en este dispositivo");
    expect(labelFor({ kind: "tab", value: "track" }, state)).toBe("Pistas");
    expect(labelFor({ kind: "tab", value: "dice" }, state)).toBe("Dados");
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Pista 2");
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "dice" })).toBe("Dados 2");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "friend" })).toBe("Volver a llamar a tu amigo");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "friend" }, { invited: true })).toBe("Tu amigo te espera: jugar");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume", "music"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
  });
});
