// What Crazy Eights says, in the 21 languages of the app, the kit's texts and the game's together;
// and, in none of them, the trademark of the boxed card game.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Crazy Eights", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Crazy Eights");
    expect(translate("es", "name")).toBe("Ochos locos");
    expect(translate("es", "cardOf", { rank: "as", suit: "picas" })).toBe("as de picas");
    expect(translate("en", "drawPile", { n: 3 })).toBe("Draw a card (3 left)");
  });

  it("never call the game by the boxed game's trademark, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    expect(BRANDS.some((brand) => brand.test("UNO"))).toBe(true);
    expect(BRANDS.some((brand) => brand.test("unobserved"))).toBe(false);
  });
});
