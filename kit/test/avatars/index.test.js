import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGame } from "../../build.js";
import * as avatars from "../../src/avatars/index.js";

const kit = join(import.meta.dirname, "..", "..");

async function bundle(source) {
  const dir = mkdtempSync(join(tmpdir(), "ftgames-avatars-"));
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "module.json"), JSON.stringify({ id: "com.flickertalk.game.probe", version: "1.0.0", components: ["ft-probe"] }));
  copyFileSync(join(kit, "test", "fixture", "THIRD_PARTY_NOTICES.md"), join(dir, "THIRD_PARTY_NOTICES.md"));
  writeFileSync(join(dir, "src", "index.js"), source);
  await buildGame(dir);
  return readFileSync(join(dir, "dist", "index.js"), "utf8");
}

describe("the avatars module", () => {
  it("offers the cast, the drawings, the player's choice, the pick screen and the portraits", () => {
    expect(Object.keys(avatars).sort()).toEqual(
      [
        "AVATAR_TEXTS",
        "EXPRESSIONS",
        "FLICK",
        "HAIRS",
        "HAIR_COLOURS",
        "NAME_LENGTH",
        "PICK_TARGET",
        "PLAYER_KEY",
        "PORTRAIT_SIZE",
        "POSES",
        "PROFILES",
        "avatarText",
        "cleanName",
        "colourKey",
        "defaultPlayer",
        "drawAvatar",
        "drawBadge",
        "drawFigure",
        "drawPick",
        "drawRoundEnd",
        "emblemKey",
        "hairKey",
        "loadPlayer",
        "normalizePlayer",
        "pickAt",
        "pickLayout",
        "pickPointer",
        "pickPress",
        "pickRename",
        "playerName",
        "portraitFaces",
        "savePlayer",
        "standIn",
        "startPick",
        "withPortraits",
      ].sort(),
    );
  });

  it("is not in a game that does not import it", async () => {
    const code = await bundle(`import { defineGame } from ${JSON.stringify(join(kit, "src", "index.js"))};\nexport { defineGame };\n`);
    for (const mark of ["#8D7DE8", "mini-twists", "Mini twists"]) expect(code, mark).not.toContain(mark);
  });

  it("brings only the drawing to a game that only draws, without the pick screen's words", async () => {
    const code = await bundle(`import { drawAvatar } from ${JSON.stringify(join(kit, "src", "avatars", "index.js"))};\nglobalThis.draw = drawAvatar;\n`);
    expect(code).toContain("mini-twists");
    for (const words of ["Mini twists", "Who are you?", "Hair colour"]) expect(code, words).not.toContain(words);
    expect(Buffer.byteLength(code)).toBeLessThan(16 * 1024);
  });
});
