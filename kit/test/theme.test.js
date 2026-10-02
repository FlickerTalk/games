// The games take the app's colours (README, "Colours"): the app sets Ionic's variables on the
// frame's root and keeps them in step with its theme. The kit's tokens read them, with today's
// palette only as the fallback when they are absent; dark only ever changes that fallback, so two
// palettes are never mixed. And no rule writes a colour of its own except through a token: the
// only colour literals allowed are the fallback palette, fixed hues, shadows and a game's own art.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const KIT = join(root, "kit", "src", "style.css");
const gameStyles = readdirSync(join(root, "games")).map((game) => join(root, "games", game, "src", "board.css"));

/** Every declaration of a stylesheet, with the selector (and media query) it sits in. */
function declarations(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  const stack = [];
  let start = 0;
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (char === "{") {
      stack.push(text.slice(start, at).trim());
      start = at + 1;
    } else if (char === "}" || char === ";") {
      const chunk = text.slice(start, at).trim();
      const colon = chunk.indexOf(":");
      if (chunk && colon > 0 && stack.length) found.push({ where: stack.join(" » "), name: chunk.slice(0, colon).trim(), value: chunk.slice(colon + 1).trim() });
      if (char === "}") stack.pop();
      start = at + 1;
    }
  }
  return found;
}

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver)\b/i;
/** Where a colour literal may be written: tokens for the fallback palette, fixed hues, shadows, a game's art. */
const ALLOWED = /^--(?:fb|hue|shade|art)-/;

describe("the games' colours", () => {
  it("take the app's variables, with today's palette only as the fallback", () => {
    const base = Object.fromEntries(declarations(readFileSync(KIT, "utf8")).filter((one) => one.where === ".ftg").map((one) => [one.name, one.value]));
    expect(base["--ink"]).toBe("var(--ion-text-color, var(--fb-ink))");
    expect(base["--paper"]).toBe("var(--ion-background-color, var(--fb-paper))");
    expect(base["--line"]).toBe("var(--ion-border-color, var(--fb-line))");
    expect(base["--primary"]).toBe("var(--ion-color-primary, var(--fb-primary))");
    expect(base["--on-primary"]).toBe("var(--ion-color-primary-contrast, var(--fb-on-primary))");
    expect(base["--good"]).toBe("var(--ion-color-success, var(--fb-good))");
    expect(base["--danger"]).toBe("var(--ion-color-danger, var(--fb-danger))");
    // What the app does not give usable values for is derived from its ink and paper.
    for (const token of ["--muted", "--surface", "--surface-2", "--warn-bg", "--warn-ink", "--side-0", "--side-1"]) {
      expect(base[token], token).toMatch(/^color-mix\(in srgb, .*var\(--(?:ink|paper)\)/);
    }
    // The app's secondary-text colour, where the kit measured that it reads (data-medium).
    const medium = declarations(readFileSync(KIT, "utf8")).filter((one) => one.where === ".ftg[data-medium]");
    expect(medium).toEqual([{ where: ".ftg[data-medium]", name: "--muted", value: "var(--ion-color-medium)" }]);
    // Today's light palette, as the fallback.
    expect(base).toMatchObject({ "--fb-ink": "#0a0a0a", "--fb-paper": "#ffffff", "--fb-primary": "#0a0a0a", "--fb-on-primary": "#ffffff" });
  });

  it("let dark choose only the fallback palette, never a second palette over the app's", () => {
    const dark = declarations(readFileSync(KIT, "utf8")).filter((one) => /dark/.test(one.where) && one.where.includes(".ftg"));
    expect(dark.length).toBeGreaterThan(5);
    for (const one of dark) expect(one.name, `${one.where} { ${one.name} }`).toMatch(/^--fb-/);
    // The system's dark mode is followed only when the app gave no colours.
    const media = declarations(readFileSync(KIT, "utf8")).filter((one) => one.where.startsWith("@media (prefers-color-scheme: dark)"));
    for (const one of media) expect(one.where).toContain(":not([data-themed])");
  });

  it("write no colour of their own except through a token", () => {
    for (const file of [KIT, ...gameStyles]) {
      for (const one of declarations(readFileSync(file, "utf8"))) {
        if (!COLOUR.test(one.value)) continue;
        expect(one.name, `${file}: ${one.where} { ${one.name}: ${one.value} }`).toMatch(ALLOWED);
      }
    }
  });
});
