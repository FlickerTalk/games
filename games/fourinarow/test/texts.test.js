import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Four in a Row", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Four in a Row");
    expect(translate("es", "name")).toBe("Cuatro en raya");
    expect(translate("fr", "name")).toBe("Quatre en ligne");
    expect(translate("de", "name")).toBe("Vier in einer Reihe");
    expect(translate("ja", "column", { n: 3 })).toBe("3列");
  });

  it("never call the game by a brand name, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    for (const name of ["Connect 4", "Connect Four", "Conecta 4", "Puissance 4", "Vier gewinnt", "Forza 4", "Lig 4"]) expect(BRANDS.some((brand) => brand.test(name)), name).toBe(true);
  });
});
