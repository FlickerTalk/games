import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";
import { BRANDS } from "./brands.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of Word Duel", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Word Duel");
    expect(translate("es", "name")).toBe("Palabra oculta");
    expect(translate("es", "theirWordWas", { word: "CASA" })).toBe("Su palabra era CASA");
    expect(translate("de", "right")).toBe("an der richtigen Stelle");
  });

  it("name FlickerTalk in a match against the phone, and the other side in a match with a person", () => {
    expect(translate("en", "secretHint", {}, true)).toBe("Five letters, for FlickerTalk to guess.");
    expect(translate("es", "secretWait", {}, true)).toBe("Esperando la palabra de FlickerTalk");
    expect(translate("es", "secretHint")).toBe("Cinco letras, para que la adivine la otra persona. Se queda en este teléfono hasta el final.");
    expect(translate("en", "secretWait")).toBe("Waiting for the other side's word");
  });

  it("never call the game by the daily word game's trademark, in any language", () => {
    for (const [lang, texts] of Object.entries(catalogue)) {
      for (const [key, text] of Object.entries(texts)) {
        for (const brand of BRANDS) expect(text, `${lang}.${key}`).not.toMatch(brand);
      }
    }
    expect(BRANDS.some((brand) => brand.test("Wordle"))).toBe(true);
  });
});
