import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { blankLevel } from "../src/editor.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ro", "pl", "ru", "uk", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps, translated rather than copied", () => {
    checkTexts(TEXTS);
    expect(Object.keys(TEXTS)).toEqual(LANGS);
    for (const lang of LANGS) expect(TEXTS[lang].name, lang).toBe("Beep Route");
    for (const lang of LANGS.slice(1)) {
      const same = Object.keys(TEXTS.en).filter((key) => !["name", "flick"].includes(key) && TEXTS[lang][key] === TEXTS.en[key]);
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });

  it("never call the game one for children", () => {
    for (const lang of LANGS) for (const text of Object.values(TEXTS[lang])) expect(text).not.toMatch(/child|kid|niñ|enfant|Kinder|bambin|criança|copii|dziec|дет|діт|çocuk|أطفال|बच्च|শিশু|anak|trẻ em|เด็ก|子ども|子供|어린이|儿童|兒童/i);
  });

  it("name every button the canvas draws, in the player's language", () => {
    const state = { lang: "es", mode: "alone", looks: "robot", screen: "play", round: { edit: { items: [], open: false }, run: null }, build: { level: blankLevel() } };
    expect(labelFor({ kind: "variant", value: "levels" }, { ...state, screen: "home" })).toBe("Niveles");
    expect(labelFor({ kind: "play" }, { ...state, screen: "home" })).toBe("Jugar");
    expect(labelFor({ kind: "play" }, state)).toBe("Poner en marcha el programa");
    expect(labelFor({ kind: "play" }, { ...state, round: { ...state.round, run: {} } })).toBe("Parar el robot");
    expect(labelFor({ kind: "command", value: "F" }, state)).toBe("Adelante");
    expect(labelFor({ kind: "command", value: "L" }, state)).toBe("Girar a la izquierda");
    expect(labelFor({ kind: "ring", value: "ring" }, state)).toBe("Repetir dos veces lo siguiente");
    expect(labelFor({ kind: "ring", value: "ring" }, { ...state, round: { ...state.round, edit: { items: [{ times: 2, body: [] }], open: true } } })).toBe("Repetirlo tres veces");
    expect(labelFor({ kind: "ring", value: "ring" }, { ...state, round: { ...state.round, edit: { items: [{ times: 2, body: ["F"] }], open: true } } })).toBe("Cerrar la repetición");
    expect(labelFor({ kind: "tool", value: "wall" }, state)).toBe("Muro");
    expect(labelFor({ kind: "cell", value: 0 }, { ...state, screen: "build" })).toBe("Casilla 1");
    expect(labelFor({ kind: "cell", value: 5 }, { ...state, screen: "build" })).toBe("Casilla 6: Meta");
    expect(labelFor({ kind: "send" }, { ...state, mode: "flick" })).toBe("Dar el nivel a FlickerTalk");
    expect(labelFor({ kind: "send" }, { ...state, mode: "friend" })).toBe("Enviar el nivel a tu amigo");
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Robot 2");
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "world" })).toBe("Mundo 2");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume", "undo", "music"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
  });
});
