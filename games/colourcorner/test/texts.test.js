import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { PAGE_ORDER } from "../src/pages.js";
import { PATTERNS } from "../src/paints.js";
import { FREE_TOOLS, PAGE_TOOLS } from "../src/screens.js";
import { TEXTS } from "../src/texts.js";
import { PAINT_KEYS } from "../src/theme.js";

describe("the texts", () => {
  it("hold a name for every page, paint, pattern and tool, in every language", () => {
    checkTexts(TEXTS);
    const wanted = [...PAGE_ORDER.map((id) => `page_${id}`), ...PAINT_KEYS.map((key) => `paint_${key}`), ...PATTERNS.map((name) => `pattern_${name}`), ...[...PAGE_TOOLS, ...FREE_TOOLS].map((tool) => `tool_${tool}`)];
    for (const key of wanted) expect(TEXTS.en, key).toHaveProperty(key);
  });

  it("keep every label short enough to be read out quickly", () => {
    for (const [lang, texts] of Object.entries(TEXTS)) for (const [key, text] of Object.entries(texts)) expect([...text].length, `${lang}.${key}`).toBeLessThanOrEqual(110);
  });
});
