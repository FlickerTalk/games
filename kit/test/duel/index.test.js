// @vitest-environment node
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as duel from "../../src/duel/index.js";

describe("the kit's part for real-time canvas games", () => {
  it("offers a game everything it builds on, from one module", () => {
    for (const name of ["CanvasDuel", "ScoredSession", "LiveClock", "FixedSteps", "Glide", "Follow", "lobbyOf", "drawLobby", "friendLeft", "drawFriendLeft", "friendNoteBox", "showFriendNote"]) expect(duel[name], name).toBeTypeOf("function");
  });

  it("leaves the live page and its texts out of a canvas game that only uses the bridge", async () => {
    const { build } = await import("esbuild");
    const made = await build({ stdin: { contents: 'import { CanvasDuel } from "./duel/index.js"; globalThis.duel = CanvasDuel;', resolveDir: join(import.meta.dirname, "..", "..", "src") }, bundle: true, minify: true, write: false, format: "esm", logLevel: "silent" });
    const code = made.outputFiles[0].text;
    expect(code).not.toContain("ftl-");
    expect(code).not.toContain("Try again");
    expect(code.length).toBeLessThan(15 * 1024);
  });
});
