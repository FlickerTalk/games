// What Sea Battle says, in the 21 languages of the app, the kit's texts and the game's together;
// and, in none of them, the trademark of the boxed game.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Sea Battle", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Sea Battle");
    expect(translate("es", "name")).toBe("Batalla naval");
    expect(translate("ru", "name")).toBe("Морской бой");
    expect(translate("es", "fireAt", { row: 3, col: 4 })).toBe("Disparar a la fila 3, columna 4");
    expect(translate("en", "shipsLeft", { n: 2 })).toBe("2 ships afloat");
  });

  it("never call the game by the boxed game's trademark, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    for (const name of ["Battleship", "Hundir la flota"]) expect(BRANDS.some((brand) => brand.test(name)), name).toBe(true);
  });
});
