import { describe, expect, it } from "vitest";
import { draw, shapes } from "../../../../kit/test/canvas/recorder.js";
import { THEME } from "../../src/theme.js";
import { ENEMIES } from "../../src/waves.js";
import { land } from "../../src/worlds/land/index.js";

const look = THEME.art.worlds.land;
const outline = (kind, options = {}) => shapes(draw((pen) => land.drawEnemy(pen, 0, 0, 70, kind, look, { time: 0, ...options }))).join("|");

describe("the giant machines of the desert", () => {
  it("give every kind of machine two looks of its own, picked by the variant", () => {
    const looks = new Set();
    for (const kind of ENEMIES) {
      expect(outline(kind, { variant: 1 }), kind).not.toBe(outline(kind, { variant: 0 }));
      expect(outline(kind, { variant: 2 }), kind).toBe(outline(kind, { variant: 0 }));
      looks.add(outline(kind, { variant: 0 })).add(outline(kind, { variant: 1 }));
    }
    expect(looks.size).toBe(ENEMIES.length * 2);
  });

  it("show how many hits a machine and a boss core can still take", () => {
    for (const kind of [...ENEMIES, "core"]) expect(outline(kind, { left: 0.5 }), kind).not.toBe(outline(kind, { left: 1 }));
  });
});
