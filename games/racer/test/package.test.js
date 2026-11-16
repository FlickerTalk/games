import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../../kit/build.js";
import { LOCALES, checkDist, checkManifest, checkNamesTranslated } from "../../../kit/test/helpers.js";

const dir = join(import.meta.dirname, "..");
const dist = join(dir, "dist");
const ICON_ELEMENTS = ["svg", "g", "title", "desc", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "linearGradient", "radialGradient", "stop", "clipPath", "mask"];

const manifest = () => checkManifest(dir, { id: "com.flickertalk.game.racer", name: "Racer", component: "ft-racer" });
const fresh = () => mkdtempSync(join(tmpdir(), "ftgames-racer-"));
const same = (a, b, name) => readFileSync(join(a, name)).equals(readFileSync(join(b, name)));

describe("the Racer package", () => {
  it("is a game that asks only for the live channel, to race a friend, like the other games", () => {
    const { version, icon } = manifest();
    expect(version).toBe("0.7.5");
    expect(icon).toBe("car-sport-outline");
  });

  it("says what the game is in one English sentence", () => {
    const { summary } = manifest();
    expect(summary.length).toBeGreaterThan(20);
    expect(summary.length).toBeLessThanOrEqual(200);
    expect(summary.endsWith(".")).toBe(true);
    expect(summary.slice(0, -1).includes(". ")).toBe(false);
  });

  it("names and describes itself in the app's other 20 languages", () => {
    const { locales, summary: english } = manifest();
    expect(Object.keys(locales).sort()).toEqual([...LOCALES].sort());
    checkNamesTranslated(manifest());
    for (const lang of LOCALES) {
      const { name, summary, ...rest } = locales[lang];
      expect(rest, lang).toEqual({});
      expect(name.trim(), lang).not.toBe("");
      expect([...name].length, lang).toBeLessThanOrEqual(64);
      expect(summary.trim().length, lang).toBeGreaterThan(10);
      expect([...summary].length, lang).toBeLessThanOrEqual(200);
      expect(summary, lang).not.toBe(english);
    }
    expect(new Set(LOCALES.map((lang) => locales[lang].summary)).size).toBe(LOCALES.length);
  });

  it("has an icon that follows the rules the app applies to icon.svg", () => {
    const icon = readFileSync(join(dir, "icon.svg"), "utf8");
    expect(Buffer.byteLength(icon)).toBeLessThanOrEqual(4096);
    expect(icon.startsWith("<svg")).toBe(true);
    expect(icon).not.toMatch(/<[!?]/);
    expect(icon).toMatch(/viewBox="0 0 64 64"/);
    for (const [, element] of icon.matchAll(/<([A-Za-z]+)/g)) expect(ICON_ELEMENTS, element).toContain(element);
    expect(icon).not.toMatch(/\s(on\w+|href|xlink:href|style)=/i);
  });

  it("carries in dist/ exactly what src/ builds, and builds the same bytes every time", async () => {
    const first = fresh();
    const second = fresh();
    await buildGame(dir, { outdir: first });
    await buildGame(dir, { outdir: second });
    expect(readdirSync(first).sort()).toEqual(readdirSync(dist).sort());
    for (const name of readdirSync(dist)) {
      expect(same(first, dist, name), `${name} differs: run npm run build`).toBe(true);
      expect(same(first, second, name), name).toBe(true);
    }
  });

  it("stays under 200 KB, ships no Ionic, says its one third-party work is the Ionicons icon, and loads nothing from outside", () => {
    expect(checkDist(dir, { cap: 200 * 1024 })).toBeGreaterThan(20_000);
    const notices = readFileSync(join(dist, "THIRD_PARTY_NOTICES.md"), "utf8").replace(/\s+/g, " ");
    expect(notices).toContain("The one third-party work in the package is the drawing of its icon");
  });

  it("defines its element with its own style and the version of its manifest", () => {
    const code = readFileSync(join(dist, "index.js"), "utf8");
    expect(code).toContain('"ft-racer"');
    expect(code.replace(/\s+/g, "")).toContain("touch-action:none");
    expect(code).toContain('"0.7.5"');
  });

  it("never writes in the chat, and talks to the other phone only over the live channel", () => {
    const code = readFileSync(join(dist, "index.js"), "utf8");
    expect(code).toMatch(/\.live\.send\(/);
    const elsewhere = code.replaceAll(/\.live\.send\(/g, "").replaceAll(/this\.send\(/g, "");
    expect(elsewhere).not.toMatch(/\.(say|send)\(/);
  });
});
