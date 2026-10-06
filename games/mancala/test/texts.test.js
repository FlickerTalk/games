// What mancala says, in the 21 languages of the app, the kit's texts and the game's together.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const catalogue = joinTexts(KIT_TEXTS, TEXTS);
const translate = translator(catalogue);

describe("the texts of mancala", () => {
  it("speak the 21 languages, the kit's and the game's together", () => {
    checkTexts(catalogue);
    expect(translate("en", "name")).toBe("Mancala");
    expect(translate("id", "name")).toBe("Congklak");
    expect(translate("en", "yourPit", { n: 3 })).toBe("Your pit 3");
    expect(translate("es", "count", { first: 25, second: 23 })).toBe("25 semillas a 23");
  });
});
