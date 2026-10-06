// What Reversi says, in the 21 languages of the app, the kit's texts and the game's together; and,
// in none of them, the trademark of the boxed game.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Reversi", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Reversi");
    expect(translate("ja", "name")).toBe("リバーシ");
    expect(translate("es", "count", { dark: 30, light: 34 })).toBe("30 oscuras, 34 claras");
    expect(translate("en", "cell", { row: 2, col: 3 })).toBe("Row 2, column 3");
  });

  it("never call the game by the boxed game's trademark, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    for (const name of ["Othello", "OTHELLO", "オセロ"]) expect(BRANDS.some((brand) => brand.test(name)), name).toBe(true);
  });
});
