import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { PROGRESS } from "../src/levels.js";
import { TEXTS } from "../src/texts.js";

const state = { lang: "es", mode: "friend", looks: "ball", progress: PROGRESS.fresh() };

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys, the name kept", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].name, lang).toBe("Goal Swipe");
  });

  it("are real translations: what the game itself says is in no language the English text", () => {
    const own = ["canvas", "looks", "classic", "school", "shootLeft", "shootMiddle", "shootRight", "diveLeft", "diveMiddle", "diveRight"];
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      for (const key of own) expect(TEXTS[lang][key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("never speak of an age", () => {
    for (const [lang, texts] of Object.entries(TEXTS)) for (const text of Object.values(texts)) expect(text, lang).not.toMatch(/child|kid|niñ|enfant|kinder/i);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    expect(labelFor({ kind: "play" }, state)).toBe(TEXTS.es.play);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "variant", value: "pair" }, state)).toBe(TEXTS.es.pair);
    expect(labelFor({ kind: "variant", value: "flick" }, state)).toBe(TEXTS.es.vsFlick);
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe(TEXTS.es.beachball);
    expect(labelFor({ kind: "look", value: 2 }, state)).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "look", value: 0 }, { ...state, looks: "field" })).toBe(TEXTS.es.school);
    expect(labelFor({ kind: "tab", value: "field" }, state)).toBe(TEXTS.es.tabField);
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume"]) expect(labelFor({ kind }, state), kind).not.toBe(kind);
  });

  it("name the three ways to shoot and the three ways to dive", () => {
    expect(labelFor({ kind: "shoot", value: "left" }, state)).toBe("Chutar a la izquierda");
    expect(labelFor({ kind: "shoot", value: "middle" }, state)).toBe("Chutar al centro");
    expect(labelFor({ kind: "dive", value: "right" }, state)).toBe("Lanzarte a la derecha");
    expect(labelFor({ kind: "dive", value: "middle" }, { ...state, lang: "en" })).toBe("Stay in the middle");
  });

  it("say where the other person is on the seat's button, and that the play button is waiting", () => {
    const friend = { ...state, lang: "en" };
    const status = { here: false, calling: false, away: false, update: false, waiting: false };
    expect(labelFor({ kind: "rival" }, friend, status)).toBe(TEXTS.en.call);
    expect(labelFor({ kind: "rival" }, friend, { ...status, calling: true })).toBe(TEXTS.en.waiting);
    expect(labelFor({ kind: "rival" }, friend, { ...status, here: true })).toBe(TEXTS.en.here);
    expect(labelFor({ kind: "rival" }, friend, { ...status, away: true })).toBe(TEXTS.en.away);
    expect(labelFor({ kind: "rival" }, friend, { ...status, update: true })).toBe(TEXTS.en.update);
    expect(labelFor({ kind: "play" }, friend, { ...status, waiting: true })).toBe(TEXTS.en.waiting);
    expect(labelFor({ kind: "play" }, friend, status)).toBe(TEXTS.en.play);
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
  });
});
