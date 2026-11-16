import { describe, expect, it } from "vitest";
import { outline, required, zoneAt, zonesOf } from "../src/geometry.js";
import { BOOKS, FREE_PAGES, PAGES, PAGE_ORDER, pageOf } from "../src/pages.js";
import { PAINT_KEYS } from "../src/theme.js";

const ALL = PAGE_ORDER.map((id) => pageOf(id));

describe("the colouring pages", () => {
  it("are at least sixteen, each with 12 to 40 zones", () => {
    expect(PAGE_ORDER.length).toBeGreaterThanOrEqual(16);
    expect(new Set(PAGE_ORDER).size).toBe(PAGE_ORDER.length);
    for (const page of ALL) {
      expect(page.regions.length, page.id).toBeGreaterThanOrEqual(12);
      expect(page.regions.length, page.id).toBeLessThanOrEqual(40);
    }
  });

  it("mix every kind of subject, castles, princesses, dragons, flowers, food and mandalas among them", () => {
    expect(Object.keys(BOOKS).sort()).toEqual(["animals", "food", "landscapes", "nature", "patterns", "stories", "vehicles"]);
    for (const book of Object.keys(BOOKS)) expect(ALL.some((page) => page.book === book), book).toBe(true);
    for (const id of ["castle", "princess", "dragon", "flower", "cake", "mandala", "mountain", "cat"]) expect(PAGE_ORDER, id).toContain(id);
    const vehicles = ALL.filter((page) => page.book === "vehicles").length;
    expect(vehicles).toBeLessThan(ALL.length / 3);
  });

  it("have short plain names that a move can carry", () => {
    for (const id of PAGE_ORDER) expect(id).toMatch(/^[a-z][a-zA-Z]{1,15}$/);
    expect(pageOf("nothing")).toBeNull();
    expect(pageOf("constructor")).toBeNull();
  });

  it("suggest a paint of the palette for every zone", () => {
    for (const page of ALL) {
      for (const region of page.regions) {
        expect(Number.isInteger(region.s), page.id).toBe(true);
        expect(region.s, page.id).toBeGreaterThanOrEqual(0);
        expect(region.s, page.id).toBeLessThan(PAINT_KEYS.length);
        expect(["e", "r", "p", "d"], page.id).toContain(region.k);
      }
    }
  });

  it("stay on the sheet", () => {
    for (const page of ALL) {
      for (const point of page.regions.flatMap((region) => outline(region).flat())) {
        expect(point[0], page.id).toBeGreaterThanOrEqual(-12);
        expect(point[0], page.id).toBeLessThanOrEqual(312);
        expect(point[1], page.id).toBeGreaterThanOrEqual(-12);
        expect(point[1], page.id).toBeLessThanOrEqual(372);
      }
    }
  });

  it("leave nearly every zone wide enough for a finger, and a reachable point in each", () => {
    for (const page of ALL) {
      const asked = required(page);
      expect(asked.length, page.id).toBeGreaterThanOrEqual(12);
      expect(asked.length / page.regions.length, page.id).toBeGreaterThanOrEqual(0.7);
      const zones = zonesOf(page);
      for (const at of asked) expect(zoneAt(page, ...zones[at].anchor), `${page.id} ${at}`).toBe(at);
    }
  }, 60_000);

  it("open twelve pages from the start and keep the rest as wrapped gifts", () => {
    expect(FREE_PAGES).toBe(12);
    expect(PAGE_ORDER.slice(0, FREE_PAGES)).toContain("princess");
    expect(PAGE_ORDER.slice(0, FREE_PAGES)).toContain("dragon");
    expect(PAGES).toBeTypeOf("object");
  });
});
