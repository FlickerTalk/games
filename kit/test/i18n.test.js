// The kit's texts in the 21 languages of the app; a game brings its own and the two are read as
// one catalogue. English is the source; a language the phone speaks that is not here falls back.
import { describe, expect, it } from "vitest";
import { KIT_TEXTS, LANGUAGES, direction, joinTexts, translator } from "../src/i18n.js";
import { checkTexts } from "./helpers.js";

describe("the kit's texts", () => {
  it("speak the 21 languages of the app, with the same keys and gaps in each", () => {
    expect(LANGUAGES).toHaveLength(21);
    checkTexts(KIT_TEXTS);
    // The game room has its own invite button (the mail icon) right above the game: the hint
    // points at it, drawing the same icon where `{invite}` stands (icons.test.js).
    for (const lang of LANGUAGES) expect(KIT_TEXTS[lang].howToInvite, lang).toContain("{invite}");
  });

  it("join a game's own texts, which may not reuse a key of the kit's", () => {
    const game = Object.fromEntries(LANGUAGES.map((lang) => [lang, { name: `Toy ${lang}` }]));
    const joined = joinTexts(KIT_TEXTS, game);
    expect(joined.es.name).toBe("Toy es");
    expect(joined.es.resign).toBe(KIT_TEXTS.es.resign);
    expect(() => joinTexts(KIT_TEXTS, { en: { resign: "x" } })).toThrow("resign");
  });

  it("fall back to the base language, then to English, and fill the gaps", () => {
    const t = translator(joinTexts(KIT_TEXTS, { en: { name: "Toy" }, es: { name: "Juguete" } }));
    expect(t("es", "name")).toBe("Juguete");
    expect(t("es-MX", "name")).toBe("Juguete");
    expect(t("fr", "name")).toBe("Toy");
    expect(t("xx", "newMatch")).toBe("New match");
    expect(t("en", "notOpen", { game: "Toy" })).toBe("The other person does not have “Toy” open in this conversation.");
    expect(t("en", "nothing-here")).toBe("nothing-here");
    expect(t("zh-TW", "resign")).not.toBe(t("zh-CN", "resign"));
  });

  it("run right to left in Arabic only", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("ar-EG")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
    expect(direction("he")).toBe("ltr"); // not one of the app's languages
  });
});
