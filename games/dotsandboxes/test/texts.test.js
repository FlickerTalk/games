// What dots and boxes says, in the 21 languages of the app, the kit's texts and the game's together.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of dots and boxes", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Dots and Boxes");
    expect(translate("es", "name")).toBe("Puntos y cajas");
    expect(translate("en", "flatLine", { row: 1, col: 2 })).toBe("Line across, row 1, box 2");
    expect(translate("de", "count", { first: 9, second: 7 })).toBe("9 Kästchen zu 7");
  });
});
