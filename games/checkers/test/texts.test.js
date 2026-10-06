// What checkers says, in the 21 languages of the app, the kit's texts and the game's together.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of checkers", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Checkers");
    expect(translate("es", "name")).toBe("Damas");
    expect(translate("de", "name")).toBe("Dame");
    expect(translate("en", "square", { row: 3, col: 6 })).toBe("Row 3, column 6");
    expect(translate("pt", "count", { dark: 5, light: 7 })).toBe("5 escuras, 7 claras");
  });
});
