import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";
import { wagonOf } from "../src/train.js";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ro", "pl", "ru", "uk", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps, translated rather than copied", () => {
    checkTexts(TEXTS);
    expect(Object.keys(TEXTS)).toEqual(LANGS);
    for (const lang of LANGS) expect(TEXTS[lang].name, lang).toBe("Beat Wagons");
    for (const lang of LANGS.slice(1)) {
      const same = Object.keys(TEXTS.en).filter((key) => !["name", "flick"].includes(key) && TEXTS[lang][key] === TEXTS.en[key]);
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });

  it("never call the game one for children", () => {
    for (const lang of LANGS) for (const text of Object.values(TEXTS[lang])) expect(text).not.toMatch(/child|kid|niñ|enfant|Kinder|bambin|criança|copii|dziec|дет|діт|çocuk|أطفال|बच्च|শিশু|anak|trẻ em|เด็ก|子ども|子供|어린이|儿童|兒童/i);
  });

  it("name every button the canvas draws, in the player's language", () => {
    const round = { candidates: [wagonOf(1), wagonOf(0, 3)] };
    const build = { wagons: [wagonOf(2), wagonOf(3, 2)], hidden: [false, true], beats: 2 };
    const state = { lang: "es", mode: "alone", looks: "engine", screen: "play", round, build };
    expect(labelFor({ kind: "variant", value: "levels" }, { ...state, screen: "home" })).toBe("Completar los trenes");
    expect(labelFor({ kind: "variant", value: "make" }, { ...state, screen: "home" })).toBe("Componer un tren");
    expect(labelFor({ kind: "play" }, { ...state, screen: "home" })).toBe("Jugar");
    expect(labelFor({ kind: "candidate", value: 0 }, state)).toBe("Vagón de la campana");
    expect(labelFor({ kind: "candidate", value: 1 }, state)).toBe("Vagón del tambor, 3 golpes");
    expect(labelFor({ kind: "wagon", value: 7 }, { ...state, screen: "build" })).toBe("Vagón de la bocina, 2 golpes");
    expect(labelFor({ kind: "wagon", value: 7 }, { ...state, screen: "build", build: { ...build, beats: 1 } })).toBe("Vagón de la bocina");
    expect(labelFor({ kind: "dots" }, { ...state, screen: "build" })).toBe("Golpes del próximo vagón: 2");
    expect(labelFor({ kind: "slot", value: 0 }, { ...state, screen: "build" })).toBe("Vagón 1: esconderlo");
    expect(labelFor({ kind: "slot", value: 1 }, { ...state, screen: "build" })).toBe("Hueco 2: devolver el vagón");
    expect(labelFor({ kind: "send" }, state)).toBe("Tocar la melodía");
    expect(labelFor({ kind: "send" }, { ...state, mode: "flick" })).toBe("Dar el tren a FlickerTalk");
    expect(labelFor({ kind: "send" }, { ...state, mode: "friend" })).toBe("Enviar el tren a tu amigo");
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Locomotora 2");
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "scenery" })).toBe("Estación 2");
    expect(labelFor({ kind: "tab", value: "scenery" }, state)).toBe("Estaciones");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume", "undo", "music"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
  });

  it("write numbers the way the language does and fall back on English for a language the game does not have", () => {
    expect(say("de", "engineLook", { n: 1234 })).toBe("Lok 1.234");
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
  });
});
