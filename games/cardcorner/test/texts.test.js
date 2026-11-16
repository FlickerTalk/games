import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Card Corner", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Card Corner");
    expect(translate("es", "name")).toBe("Rincón de cartas");
    expect(translate("es", "cardOf", { rank: "as", suit: "picas" })).toBe("as de picas");
    expect(translate("en", "takeStock", { n: 3 })).toBe("Take a card from the stock (3 left)");
  });

  it("name the four games in every language, and never use a kit's key for something else", () => {
    for (const [lang, texts] of Object.entries(TEXTS)) {
      for (const game of ["pairs", "war", "rummy", "fish"]) expect(texts[game].trim(), `${lang}.${game}`).not.toBe("");
      for (const key of Object.keys(texts)) if (key !== "name") expect(KIT_TEXTS.en[key], `${lang}.${key}`).toBeUndefined();
    }
  });

  it("never say who the game is for, nor promise a prize", () => {
    for (const text of Object.values(TEXTS.en)) expect(text).not.toMatch(/child|kid|prize|reward|bonus|\bstars?\b/i);
  });
});
