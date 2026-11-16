import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { PROGRESS, SCENERIES, SWORDS } from "../src/levels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys, the canvas label opening with the game's name", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].canvas.startsWith(TEXTS[lang].name), lang).toBe(true);
  });

  it("are translated, not copies of the English", () => {
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      for (const key of ["canvas", "play", "looks", "strike", "strikeTwo", "tabSword", "tabScenery", ...SWORDS, ...SCENERIES, "wrapped", "pair", "vsFlick"]) expect(TEXTS[lang][key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "sword", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "play" }, state)).toBe(TEXTS.es.play);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "strike", value: 0 }, state)).toBe(TEXTS.es.strike);
    expect(labelFor({ kind: "strike", value: 1 }, state)).toBe(TEXTS.es.strikeTwo);
    expect(labelFor({ kind: "variant", value: "flick" }, state)).toBe(TEXTS.es.vsFlick);
    expect(labelFor({ kind: "variant", value: "pair" }, state)).toBe(TEXTS.es.pair);
    expect(labelFor({ kind: "tab", value: "sword" }, state)).toBe(TEXTS.es.tabSword);
    expect(labelFor({ kind: "tab", value: "scenery" }, state)).toBe(TEXTS.es.tabScenery);
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe(TEXTS.es.curved);
    expect(labelFor({ kind: "look", value: 5 }, state)).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "look", value: 0 }, { ...state, looks: "scenery" })).toBe(TEXTS.es.castle);
    expect(labelFor({ kind: "look", value: 2 }, { ...state, looks: "scenery" })).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "look", value: 2 }, { ...state, looks: "scenery", progress: { ...PROGRESS.fresh(), received: ["pillows", "wavy", "treehouse"] } })).toBe(TEXTS.es.treehouse);
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "volume"]) expect(labelFor({ kind }, state), kind).not.toBe(kind);
  });

  it("say where the other person is on the seat's button, and that the player waits on the play button", () => {
    const state = { lang: "en", mode: "friend", looks: "sword", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "rival" }, state, { here: false, calling: false, away: false, ready: {} })).toBe(TEXTS.en.call);
    expect(labelFor({ kind: "rival" }, state, { calling: true, ready: {} })).toBe(TEXTS.en.waiting);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: true } })).toBe(TEXTS.en.ready);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: false } })).toBe(TEXTS.en.here);
    expect(labelFor({ kind: "rival" }, state, { away: true, ready: {} })).toBe(TEXTS.en.away);
    expect(labelFor({ kind: "rival" }, state, { away: true, update: true, ready: {} })).toBe(TEXTS.en.update);
    expect(labelFor({ kind: "play" }, state, { phase: "waiting", ready: { me: true } })).toBe(TEXTS.en.waiting);
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe(TEXTS.pt.play);
  });
});
