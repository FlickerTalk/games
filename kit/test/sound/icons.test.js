import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOUND_ICONS, soundIcon } from "../../src/sound/icons.js";

const root = join(import.meta.dirname, "..", "..", "..");

describe("the sound controls' icons", () => {
  it("are the Ionicons for a speaker at each level, crossed out at zero, and for music, exactly as the package draws them", () => {
    expect(Object.keys(SOUND_ICONS).sort()).toEqual(["musical-notes-outline", "volume-high-outline", "volume-low-outline", "volume-mute-outline"]);
    for (const [name, inner] of Object.entries(SOUND_ICONS)) {
      const file = readFileSync(join(root, "node_modules", "ionicons", "dist", "svg", `${name}.svg`), "utf8");
      expect(inner, name).toBe(file.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, ""));
    }
  });

  it("draw inline in the text's colour, hidden from screen readers, in the slot asked for", () => {
    const drawn = soundIcon("volume-mute-outline", "icon-only");
    expect(drawn).toMatch(/^<svg slot="icon-only" class="ftg-ico" viewBox="0 0 512 512" aria-hidden="true" focusable="false">/);
    expect(drawn).toContain(SOUND_ICONS["volume-mute-outline"]);
    expect(soundIcon("musical-notes-outline")).not.toContain("slot=");
    expect(() => soundIcon("bell-outline")).toThrow("no icon");
  });
});
