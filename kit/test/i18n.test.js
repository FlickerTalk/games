import { describe, expect, it } from "vitest";
import { KIT_TEXTS, LANGUAGES, direction, joinTexts, translator } from "../src/i18n.js";
import { checkTexts } from "./helpers.js";

describe("the kit's texts", () => {
  it("speak the 21 languages of the app, with the same keys and gaps in each", () => {
    expect(LANGUAGES).toHaveLength(21);
    checkTexts(KIT_TEXTS);
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

  it("give a text's own wording for a match against the phone where it has one, and the shared one elsewhere", () => {
    const game = { en: { name: "Toy", hint: "Ask them", hintSolo: "Ask FlickerTalk" }, es: { name: "Juguete", hint: "Pregúntale", hintSolo: "Pregúntale a FlickerTalk" } };
    const t = translator(joinTexts(KIT_TEXTS, game));
    expect(t("es", "hint", {}, true)).toBe("Pregúntale a FlickerTalk");
    expect(t("es-MX", "hint", {}, true)).toBe("Pregúntale a FlickerTalk");
    expect(t("es", "hint")).toBe("Pregúntale");
    expect(t("es", "hint", {}, false)).toBe("Pregúntale");
    expect(t("es", "name", {}, true)).toBe("Juguete");
    expect(t("en", "theyStart", {}, true)).toBe("The coin says FlickerTalk starts");
    expect(t("en", "theyStart")).toBe("The coin says they start");
    expect(t("en", "them", {}, true)).toBe("FlickerTalk");
    expect(t("en", "them")).toBe("Opponent");
  });

  it("have a shared text for every wording of a match against the phone", () => {
    for (const key of Object.keys(KIT_TEXTS.en).filter((one) => one.endsWith("Solo"))) expect(KIT_TEXTS.en, key).toHaveProperty(key.slice(0, -"Solo".length));
    expect(() => checkTexts(Object.fromEntries(LANGUAGES.map((lang) => [lang, { ...KIT_TEXTS[lang], strayKeySolo: "x" }])))).toThrow("strayKey");
  });

  it("run right to left in Arabic only", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("ar-EG")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
    expect(direction("he")).toBe("ltr");
  });
});
