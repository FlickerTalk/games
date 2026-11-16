import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as tabletop from "../../src/tabletop/index.js";

const GAMES = join(import.meta.dirname, "..", "..", "..", "games");
const MARK = "ftt-layer";

function importsTabletop(dir) {
  const src = join(dir, "src");
  return existsSync(src) && readdirSync(src).some((file) => /tabletop\//.test(readFileSync(join(src, file), "utf8")));
}

describe("the tabletop kit", () => {
  it("offers a board game drawn on a canvas everything it builds on, from one module", () => {
    const names = ["canvasBoard", "TABLETOP_STYLE", "syncButtons", "tabletopTheme", "duskBoard", "gridIn", "cellBox", "cellCentre", "cellAt", "fractionOf", "boardFrame", "drawBoardFrame", "drawPieceShadow", "along", "progressOf", "easeInOut"];
    for (const name of names) expect(tabletop[name], name).toBeDefined();
  });

  it("is compiled only into a game that imports it", () => {
    const games = readdirSync(GAMES).map((name) => join(GAMES, name));
    expect(games.some(importsTabletop)).toBe(true);
    for (const dir of games) expect(readFileSync(join(dir, "dist", "index.js"), "utf8").includes(MARK), dir).toBe(importsTabletop(dir));
  });
});
