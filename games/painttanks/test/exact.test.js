import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cosine, distance, sine, wave } from "../src/exact.js";

const source = (name) => readFileSync(join(import.meta.dirname, "..", "src", name), "utf8");

describe("the numbers both phones must agree on", () => {
  it("are rounded to six decimals where an engine's last bits could differ", () => {
    expect(sine(30)).toBe(0.5);
    expect(cosine(60)).toBe(0.5);
    expect(sine(45)).toBe(0.707107);
    expect(wave(Math.PI / 6)).toBe(0.5);
    expect(distance(3, 4)).toBe(5);
    for (let degrees = -45; degrees <= 85; degrees += 1) expect(Number(sine(degrees).toFixed(6))).toBe(sine(degrees));
  });

  it("are the only trigonometry the simulation uses, and it never asks for a power or a hypotenuse", () => {
    for (const name of ["physics.js", "world.js", "rules.js"]) {
      expect(source(name), name).not.toMatch(/Math\.(sin|cos|tan|atan2?|hypot|pow|exp|log)\b/);
      expect(source(name), name).not.toMatch(/\*\*/);
    }
  });
});
