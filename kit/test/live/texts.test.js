import { describe, expect, it } from "vitest";
import { KIT_TEXTS, translator } from "../../src/i18n.js";
import { LIVE_TEXTS } from "../../src/live/texts.js";
import { checkTexts } from "../helpers.js";

const SHARED = ["you", "them", "retry", "again", "youWon", "youLost", "unreachable", "notOpen", "update"];

describe("the texts of the real-time games", () => {
  it("speak the app's 21 languages, every key in each, with the same gaps", () => {
    checkTexts(LIVE_TEXTS);
    expect(Object.keys(LIVE_TEXTS)).toEqual(Object.keys(KIT_TEXTS));
  });

  it("say what the turn-based games already say in the same words", () => {
    for (const lang of Object.keys(LIVE_TEXTS)) {
      for (const key of SHARED) expect(LIVE_TEXTS[lang][key], `${lang}.${key}`).toBe(KIT_TEXTS[lang][key]);
    }
  });

  it("fill their gaps", () => {
    const t = translator(LIVE_TEXTS);
    expect(t("es", "best", { time: "0:41,3" })).toBe("Mejor: 0:41,3");
    expect(t("en", "calling", { game: "Car Race" })).toBe("Waiting for the other person to open “Car Race” in this conversation…");
    expect(t("zh-TW", "start")).toBe("開始");
  });
});
