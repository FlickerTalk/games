// What Five in a Row says, in the 21 languages of the app, the kit's texts and the game's
// together; and, in none of them, a boxed game's trademark.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Five in a Row", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Five in a Row");
    expect(translate("ja", "name")).toBe("五目並べ");
    expect(translate("es", "place", { row: 8, col: 8 })).toBe("Poner la piedra en la fila 8, columna 8");
    expect(translate("en", "cell", { row: 2, col: 3 })).toBe("Row 2, column 3");
    expect(translate("de", "five")).toBe("Fünf in einer Reihe");
  });

  it("never call the game by a boxed game's trademark, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    expect(BRANDS.some((brand) => brand.test("Pente"))).toBe(true);
  });
});
