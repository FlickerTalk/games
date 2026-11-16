import { describe, expect, it } from "vitest";
import { FIRST_AIM, aimFromPull, anchorOf, previewOf, stepAim } from "../src/aim.js";
import { battle, setupMove } from "../src/rules.js";

const set = (field) => battle.play(battle.initial(), setupMove({ field, wind: 0, seed: "AbCdEfGh" }), 0).state;

describe("aiming", () => {
  it("starts from a middling aim", () => {
    expect(FIRST_AIM).toEqual({ angle: 45, power: 60 });
  });

  it("turns a pull back from the vehicle into the shot's angle and power, longer pulls shooting harder", () => {
    const from = { x: 100, y: 200 };
    const flat = aimFromPull(from, { x: 40, y: 200 }, { side: 0 });
    expect(flat.angle).toBe(5);
    const steep = aimFromPull(from, { x: 90, y: 280 }, { side: 0 });
    expect(steep.angle).toBeGreaterThan(70);
    const half = aimFromPull(from, { x: 50, y: 250 }, { side: 0 });
    expect(half.angle).toBe(45);
    expect(aimFromPull(from, { x: 0, y: 300 }, { side: 0 }).power).toBeGreaterThan(half.power);
    expect(aimFromPull(from, { x: 500, y: 600 }, { side: 0 }).power).toBe(99);
    expect(aimFromPull(from, { x: 150, y: 250 }, { side: 1 }).angle).toBe(45);
    expect(aimFromPull(from, { x: 98, y: 202 }, { side: 0 }).short).toBe(true);
  });

  it("aims a torpedo up or down under the water", () => {
    const from = { x: 100, y: 200 };
    expect(aimFromPull(from, { x: 40, y: 230 }, { side: 0, torpedo: true }).angle).toBeGreaterThan(20);
    expect(aimFromPull(from, { x: 40, y: 170 }, { side: 0, torpedo: true }).angle).toBeLessThan(-20);
  });

  it("steps the dials by five, wrapping round at the ends", () => {
    expect(stepAim({ angle: 45, power: 60 }, "angle", 1)).toEqual({ angle: 50, power: 60 });
    expect(stepAim({ angle: 85, power: 60 }, "angle", 1).angle).toBe(5);
    expect(stepAim({ angle: 5, power: 60 }, "angle", -1).angle).toBe(85);
    expect(stepAim({ angle: 45, power: 95 }, "power", 1).power).toBe(99);
    expect(stepAim({ angle: 45, power: 99 }, "power", 1).power).toBe(0);
    expect(stepAim({ angle: 40, power: 60 }, "angle", 1, { torpedo: true }).angle).toBe(45);
    expect(stepAim({ angle: 45, power: 60 }, "angle", 1, { torpedo: true }).angle).toBe(-45);
    expect(stepAim({ angle: 70, power: 60 }, "angle", -1, { torpedo: true }).angle).toBe(40);
  });

  it("shows the first part of the path the shot will take, from the end of the barrel", () => {
    const state = set("land");
    const anchor = anchorOf(state, 0);
    const preview = previewOf(state, 0, { kind: "ball", angle: 45, power: 60 });
    expect(preview.length).toBeGreaterThan(4);
    expect(preview[0][0]).toBeGreaterThan(anchor.x);
    expect(preview.at(-1)[1]).toBeLessThan(preview[0][1]);
  });
});
