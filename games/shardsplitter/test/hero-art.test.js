import { describe, expect, it } from "vitest";
import { bounds, draw, painted, shapes } from "../../../kit/test/canvas/recorder.js";
import { drawHero, drawMallet } from "../src/hero-art.js";
import { THEME } from "../src/theme.js";

const ME = { who: "ari", hair: "bob", hairColour: "ink" };
const hero = (options = {}) => draw((ctx) => drawHero(ctx, { x: 200, y: 200, size: 120 }, { player: ME, mallet: "block", angle: -0.55, pose: "idle", time: 0.3, ...options }, THEME));
const lines = (ctx) => shapes(ctx).join("\n");

describe("the hero", () => {
  it("is the player's own face on the kit's figure, holding a wooden mallet, within reach of its place", () => {
    const ctx = hero();
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThan(200 - 120);
    expect(box.right).toBeLessThan(200 + 150);
    expect(box.top).toBeGreaterThan(200 - 150);
    expect(box.bottom).toBeLessThan(200 + 80);
    expect(ctx.depth).toBe(0);
    expect(lines(hero({ player: { who: "flick" } }))).not.toBe(lines(ctx));
    expect(ctx.calls.filter((call) => call.op === "fillText")).toEqual([]);
  });

  it("swings the mallet as its angle changes, and looks the other way as a teammate", () => {
    expect(lines(hero({ angle: 1.2 }))).not.toBe(lines(hero()));
    const turned = bounds(painted(hero({ flip: true, angle: 1.25 })));
    const straight = bounds(painted(hero({ angle: 1.25 })));
    expect(turned.left).toBeLessThan(straight.left);
    expect(straight.right).toBeGreaterThan(turned.right);
  });

  it("cheers and is taken aback with the figure's own poses", () => {
    expect(new Set(["idle", "celebrate", "lose"].map((pose) => lines(hero({ pose })))).size).toBe(3);
  });
});

describe("the mallets", () => {
  it("are three wooden shapes, drawn the same wherever they are", () => {
    const at = (look, x) => shapes(draw((ctx) => drawMallet(ctx, x, 100, 110, { look, angle: 0.3 }, THEME)), { shift: [x, 100] }).join("\n");
    expect(new Set(["block", "round", "wedge"].map((look) => at(look, 100))).size).toBe(3);
    expect(at("round", 100)).toBe(at("round", 260));
    expect(at("nothing", 100)).toBe(at("block", 100));
  });
});
