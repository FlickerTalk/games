import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { TEXTS } from "../src/texts.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps", () => {
    checkTexts(TEXTS);
    expect(TEXTS.en.name).toBe("Tile Court");
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].canvas.startsWith(TEXTS[lang].name), lang).toBe(true);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", looks: "court" };
    expect(labelFor({ kind: "play" }, state)).toBe("Jugar");
    expect(labelFor({ kind: "variant", value: "daily" }, state)).toBe("Patio del día");
    expect(labelFor({ kind: "slot", value: 1 }, state)).toBe("Pieza 2");
    expect(labelFor({ kind: "look", value: 0 }, state)).toBe("Patio 1");
    expect(labelFor({ kind: "look", value: 2 }, { ...state, looks: "effect" })).toBe("Efecto de línea 3");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "music" }, state)).toBe("Música");
    expect(labelFor({ kind: "rival" }, state)).toBe("Volver a llamar a tu amigo");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "profile", label: "Ari, sun" }, state)).toBe("Ari, sun");
    for (const kind of ["again", "home", "pause", "resume", "avatar", "looks", "done", "gift", "accept", "dismiss", "volume"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
    expect(labelFor({ kind: "tab", value: "effect" }, state)).toBe("Efectos de línea");
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
  });
});
