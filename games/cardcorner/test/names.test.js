import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { cardName, cardNames, rankName, suitName } from "../src/names.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const t = (lang) => (key, vars) => translate(lang, key, vars);

describe("the names of the cards", () => {
  it("names the cards, the suits and the ranks in the user's language", () => {
    expect(cardName(0, t("es"))).toBe("as de picas");
    expect(cardName(23, t("es"))).toBe("jota de corazones");
    expect(cardName(35, t("en"))).toBe("10 of diamonds");
    expect(cardName(7, t("de"))).toBe("Pik 8");
    expect(suitName(2, t("en"))).toBe("diamonds");
    expect(rankName(11, t("en"))).toBe("queen");
    expect(rankName(6, t("en"))).toBe("7");
    expect(cardNames([0, 35], t("en"))).toBe("ace of spades, 10 of diamonds");
  });
});
