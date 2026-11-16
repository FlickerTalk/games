import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { PAGE_ORDER } from "../src/pages.js";
import { PAINT_KEYS } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";
import { FREE_TOOLS, PAGE_TOOLS } from "../src/screens.js";
import { PATTERNS } from "../src/paints.js";

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps", () => {
    checkTexts(TEXTS);
    for (const lang of Object.keys(TEXTS)) expect(TEXTS[lang].name, lang).toBe("Colour Corner");
  });

  it("are real translations, not copies of the English", () => {
    for (const lang of Object.keys(TEXTS).filter((one) => one !== "en")) {
      const same = Object.keys(TEXTS.en).filter((key) => key !== "name" && key !== "flick" && TEXTS[lang][key] === TEXTS.en[key]);
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThanOrEqual(4);
    }
  });

  it("never call the game one for children", () => {
    for (const lang of Object.keys(TEXTS)) for (const text of Object.values(TEXTS[lang])) expect(text, lang).not.toMatch(/child|kid|niñ|enfant|Kind|bambin|crianç|copii|дет|діт|çocuk/i);
  });

  it("name every button the canvas draws, for a screen reader", () => {
    const state = { lang: "es", mode: "friend", screen: "page" };
    for (const id of PAGE_ORDER) expect(labelFor({ kind: "tile", value: id }, { ...state, screen: "shelf", owned: PAGE_ORDER })).not.toBe(id);
    expect(labelFor({ kind: "tile", value: PAGE_ORDER.at(-1) }, { ...state, screen: "shelf", owned: [] })).toBe(say("es", "wrapped"));
    for (const at of PAINT_KEYS.keys()) expect(labelFor({ kind: "paint", value: at }, state)).toBe(say("es", `paint_${PAINT_KEYS[at]}`));
    for (const tool of [...PAGE_TOOLS, ...FREE_TOOLS]) expect(labelFor({ kind: "tool", value: tool }, state), tool).not.toMatch(/^[a-z0-9]+$/);
    for (const pattern of PATTERNS) expect(labelFor({ kind: "pattern", value: pattern }, state)).not.toBe(pattern);
    expect(labelFor({ kind: "zone", value: 4 }, state)).toBe(say("es", "zone", { n: 5 }));
    expect(labelFor({ kind: "tile", value: 2 }, { ...state, screen: "gallery" })).toBe(say("es", "picture", { n: 3 }));
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "flick" })).toBe("FlickerTalk");
    expect(labelFor({ kind: "play" }, { ...state, screen: "picture" })).toBe(say("es", "another"));
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
    for (const kind of ["play", "back", "home", "undo", "done", "prev", "next", "avatar", "looks", "edit", "send", "gift", "accept", "dismiss", "volume", "music"]) {
      expect(labelFor({ kind }, state), kind).not.toBe(kind);
    }
    for (const value of ["pages", "free", "together"]) expect(labelFor({ kind: "variant", value }, state)).not.toBe(value);
  });

  it("fall back on English for a language the game does not have", () => {
    expect(say("xx", "undo")).toBe("Undo");
    expect(say("pt-BR", "undo")).toBe(TEXTS.pt.undo);
  });
});
