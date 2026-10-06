// What Backgammon says, in the 21 languages of the app, the kit's texts and the game's together.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Backgammon", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Backgammon");
    expect(translate("tr", "name")).toBe("Tavla");
    expect(translate("es", "dice", { a: 3, b: 5 })).toBe("Dados: 3 y 5");
    expect(translate("en", "point", { n: 24 })).toBe("Point 24");
  });

  it("name no boxed brand, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
  });
});
