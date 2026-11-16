import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys, the name kept", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].name, lang).toBe("Paddle Pop");
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "paddle", progress: { received: [] } };
    expect(labelFor({ kind: "play" }, state)).toBe(TEXTS.es.play);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "variant", value: "pair" }, state)).toBe(TEXTS.es.pair);
    expect(labelFor({ kind: "variant", value: "flick" }, state)).toBe(TEXTS.es.vsFlick);
    expect(labelFor({ kind: "look", value: 2 }, state)).toBe(TEXTS.es.dog);
    expect(labelFor({ kind: "look", value: 5 }, state)).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "table" })).toBe(TEXTS.es.ice);
    expect(labelFor({ kind: "tab", value: "table" }, state)).toBe(TEXTS.es.tabTable);
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "volume"]) expect(labelFor({ kind }, state), kind).not.toBe(kind);
  });

  it("say where the other person is on the seat's button", () => {
    const state = { lang: "en", mode: "friend", looks: "paddle", progress: { received: [] } };
    expect(labelFor({ kind: "rival" }, state, { here: false, calling: false, away: false, ready: {} })).toBe(TEXTS.en.call);
    expect(labelFor({ kind: "rival" }, state, { calling: true, ready: {} })).toBe(TEXTS.en.waiting);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: true } })).toBe(TEXTS.en.ready);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: false } })).toBe(TEXTS.en.here);
    expect(labelFor({ kind: "rival" }, state, { away: true, ready: {} })).toBe(TEXTS.en.away);
    expect(labelFor({ kind: "rival" }, state, { away: true, update: true, ready: {} })).toBe(TEXTS.en.update);
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe(TEXTS.pt.play);
  });
});
