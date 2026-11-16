import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { HELICOPTERS, PLANES, PROGRESS } from "../src/levels.js";
import { TEXTS } from "../src/texts.js";

const NEW = ["canvas", "looks", "steerLeft", "steerRight", "tabPlane", "tabHelicopter", "propeller", "jet", "seaplane", "stunt", "paper", "bubble", "tandem", "rescue", "saucer", "recolour"];

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys, the name kept, nothing left in English", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) {
      expect(TEXTS[lang].name, lang).toBe("Sky Chase");
      if (lang === "en") continue;
      for (const key of NEW) expect(TEXTS[lang][key], `${lang} ${key}`).not.toBe(TEXTS.en[key]);
    }
  });

  it("have a name for every aircraft, never one that says who the game is for", () => {
    for (const lang of Object.keys(TEXTS)) {
      for (const craft of [...PLANES, ...HELICOPTERS]) expect(TEXTS[lang][craft], `${lang} ${craft}`).toBeTruthy();
    }
    expect(JSON.stringify(TEXTS.en)).not.toMatch(/child|kid/i);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "plane", flying: "helicopter", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "play" }, state)).toBe(TEXTS.es.play);
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "steer", value: "left" }, state)).toBe(TEXTS.es.steerLeft);
    expect(labelFor({ kind: "steer", value: "right" }, state)).toBe(TEXTS.es.steerRight);
    expect(labelFor({ kind: "look", value: 2 }, state)).toBe(TEXTS.es.jet);
    expect(labelFor({ kind: "look", value: 3 }, state)).toBe(TEXTS.es.wrapped);
    expect(labelFor({ kind: "look", value: 1 }, { ...state, looks: "helicopter" })).toBe(TEXTS.es.tandem);
    expect(labelFor({ kind: "tab", value: "plane" }, state)).toBe(TEXTS.es.tabPlane);
    expect(labelFor({ kind: "tab", value: "helicopter" }, state)).toBe(TEXTS.es.tabHelicopter);
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "alone" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "volume"]) expect(labelFor({ kind }, state), kind).not.toBe(kind);
  });

  it("say on the aircraft being flown that touching it again changes its colour", () => {
    const state = { lang: "en", mode: "flick", looks: "plane", flying: "plane", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "look", value: 0 }, state)).toBe(`${TEXTS.en.propeller}. ${TEXTS.en.recolour}`);
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe(TEXTS.en.biplane);
    expect(labelFor({ kind: "look", value: 0 }, { ...state, flying: "helicopter" })).toBe(TEXTS.en.propeller);
  });

  it("say where the other person is on the seat's button, and that the player is waiting on the play button", () => {
    const state = { lang: "en", mode: "friend", looks: "plane", flying: "plane", progress: PROGRESS.fresh() };
    expect(labelFor({ kind: "rival" }, state, { here: false, calling: false, away: false, ready: {} })).toBe(TEXTS.en.call);
    expect(labelFor({ kind: "rival" }, state, { calling: true, ready: {} })).toBe(TEXTS.en.waiting);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: true } })).toBe(TEXTS.en.ready);
    expect(labelFor({ kind: "rival" }, state, { here: true, ready: { them: false } })).toBe(TEXTS.en.here);
    expect(labelFor({ kind: "rival" }, state, { away: true, ready: {} })).toBe(TEXTS.en.away);
    expect(labelFor({ kind: "rival" }, state, { away: true, update: true, ready: {} })).toBe(TEXTS.en.update);
    expect(labelFor({ kind: "play" }, state, { phase: "waiting", here: false, away: false, ready: { me: true } })).toBe(TEXTS.en.waiting);
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe(TEXTS.pt.play);
  });
});
