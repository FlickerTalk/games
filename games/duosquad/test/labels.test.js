import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { PROGRESS } from "../src/levels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys, the canvas label opening with the game's name", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].canvas.startsWith(TEXTS[lang].name), lang).toBe(true);
  });

  it("are translated, not copies of the English", () => {
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      for (const key of ["canvas", "play", "looks", "space", "sea", "land", "craft", "wrapped"]) expect(TEXTS[lang][key], `${lang}.${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", world: "sea", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "play" }, state)).toBe(TEXTS.es.play);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    for (const world of ["space", "sea", "land"]) expect(labelFor({ kind: "variant", value: world }, state)).toBe(TEXTS.es[world]);
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Nave 2");
    expect(labelFor({ kind: "look", value: 1 }, { ...state, page: 1 })).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "tab", value: 1 }, state)).toBe("Naves 2");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "alone" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "volume"]) expect(labelFor({ kind }, state), kind).not.toBe(kind);
  });

  it("say what the teammate's seat is doing while two phones find each other", () => {
    const state = { lang: "en", mode: "friend", world: "space", progress: PROGRESS.fresh() };
    const seat = (status) => labelFor({ kind: "rival" }, state, status);
    expect(seat(null)).toBe(TEXTS.en.call);
    expect(seat({ calling: true })).toBe(TEXTS.en.waiting);
    expect(seat({ here: true, ready: { them: false } })).toBe(TEXTS.en.here);
    expect(seat({ here: true, ready: { them: true } })).toBe(TEXTS.en.ready);
    expect(seat({ away: true })).toBe(TEXTS.en.away);
    expect(seat({ update: true })).toBe(TEXTS.en.update);
    expect(labelFor({ kind: "play" }, state, { phase: "waiting", ready: { me: true } })).toBe(TEXTS.en.waiting);
    expect(say("pt-BR", "sea")).toBe(TEXTS.pt.sea);
  });
});
