import { describe, expect, it } from "vitest";
import { colours, draw } from "../../../kit/test/canvas/recorder.js";
import { HULLS } from "../src/levels.js";
import { THEME } from "../src/theme.js";
import { land } from "../src/land.js";

const look = THEME.art.worlds.land;
const paints = (hull, options = {}) => colours(draw((pen) => land.drawCraft(pen, 0, 0, 80, hull, look, { seat: 0, time: 0, ...options })));

describe("the hover vehicles of the desert", () => {
  it("float every hull on a hover field with a dust wake behind it, the pilot's seat on the middle line", () => {
    HULLS.land.forEach((_, hull) => {
      expect(paints(hull), `hull ${hull}`).toEqual(expect.arrayContaining([look.shield, look.dust]));
      expect(land.cockpitOf(hull)[0], `hull ${hull}`).toBe(0);
    });
  });

  it("turn a caught vehicle grey, its field gone dull and no dust behind it", () => {
    HULLS.land.forEach((_, hull) => {
      const caught = paints(hull, { caught: true });
      expect(caught, `hull ${hull}`).toContain(look.dimmed[0]);
      expect(caught, `hull ${hull}`).not.toContain(look.shield);
      expect(caught, `hull ${hull}`).not.toContain(look.dust);
    });
  });
});
