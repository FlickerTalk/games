import { describe, expect, it } from "vitest";
import { bounds, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { CARD_RATIO, drawBack, drawFace, sideMark } from "../src/faces.js";
import { themeFor } from "../src/theme.js";

const theme = themeFor(null, { dark: false });
const dark = themeFor(null, { dark: true });
const WIDTH = 60;
const face = (card, look = theme) => draw((ctx) => drawFace(ctx, look, card, 10, 20, WIDTH));
const fillsIn = (ctx, colour) => {
  let style = null;
  let count = 0;
  for (const call of ctx.calls) {
    if (call.op === "set" && call.name === "fillStyle") style = call.value;
    if (call.op === "fill" && style === colour) count += 1;
  }
  return count;
};
const colours = (ctx) => new Set(ctx.calls.filter((call) => call.op === "set" && (call.name === "fillStyle" || call.name === "strokeStyle")).map((call) => call.value));
const card = (suit, rank) => suit * 13 + rank;

describe("a card's face", () => {
  it("fills its box, a real card's proportions, at every size the hand or the table may give it", () => {
    expect(CARD_RATIO).toBeCloseTo(1.4, 5);
    for (const width of [24, 60, 140]) {
      const area = bounds(painted(draw((ctx) => drawFace(ctx, theme, card(3, 11), 0, 0, width))));
      expect(area.left).toBeGreaterThanOrEqual(-0.01);
      expect(area.top).toBeGreaterThanOrEqual(-0.01);
      expect(area.right).toBeLessThanOrEqual(width + 0.01);
      expect(area.bottom).toBeLessThanOrEqual(width * CARD_RATIO + 0.01);
      expect(area.right - area.left).toBeGreaterThan(width * 0.95);
    }
  });

  it("carries the standard pips of a number card, and the rank and suit in two opposite corners", () => {
    for (let rank = 0; rank < 10; rank += 1) {
      expect(fillsIn(face(card(0, rank)), theme.deck.black), `rank ${rank + 1}`).toBe(rank + 1 + 2);
      expect(face(card(0, rank)).calls.filter((call) => call.op === "stroke").length).toBeGreaterThanOrEqual(2);
    }
  });

  it("draws hearts and diamonds in red, spades and clubs in black", () => {
    for (const suit of [1, 2]) {
      expect(fillsIn(face(card(suit, 4)), theme.deck.red)).toBe(7);
      expect(fillsIn(face(card(suit, 4)), theme.deck.black)).toBe(0);
    }
    for (const suit of [0, 3]) expect(fillsIn(face(card(suit, 4)), theme.deck.red)).toBe(0);
  });

  it("gives the plain ace of spades one big pip and nothing more", () => {
    const ace = face(card(0, 0));
    expect(fillsIn(ace, theme.deck.black)).toBe(3);
    const big = bounds(painted(draw((ctx) => drawFace(ctx, theme, card(0, 0), 0, 0, 240)))).right;
    expect(big).toBeLessThanOrEqual(240);
  });

  it("paints the court figures in the deck's gold, red, blue and black, both halves of each layer", () => {
    for (const rank of [10, 11, 12]) {
      const court = face(card(2, rank));
      const used = colours(court);
      for (const colour of [theme.deck.gold, theme.deck.red, theme.deck.blue, theme.deck.black]) expect(used.has(colour), `${rank} ${colour}`).toBe(true);
      expect(fillsIn(court, theme.deck.gold)).toBe(2);
      expect(court.calls.filter((call) => call.op === "bezierCurveTo").length).toBeGreaterThan(400);
      expect(court.depth).toBe(0);
    }
  });

  it("draws every card differently, and the same card the same way", () => {
    const seen = new Set();
    for (let one = 0; one < 52; one += 1) seen.add(JSON.stringify(face(one).calls));
    expect(seen.size).toBe(52);
    expect(face(card(1, 12)).calls).toEqual(face(card(1, 12)).calls);
  });

  it("is a little lower on a dark page, its suits still in their colour", () => {
    expect(colours(face(card(1, 7), dark)).has(dark.deck.paper)).toBe(true);
    expect(dark.deck.red).toBe(theme.deck.red);
  });
});

describe("a card's back", () => {
  it("is a lattice inside a white border, inside its box", () => {
    const back = draw((ctx) => drawBack(ctx, theme, 0, 0, WIDTH));
    const area = bounds(painted(back));
    expect(area.left).toBeGreaterThanOrEqual(-0.01);
    expect(area.right).toBeLessThanOrEqual(WIDTH + 0.01);
    expect(area.bottom).toBeLessThanOrEqual(WIDTH * CARD_RATIO + 0.01);
    const used = colours(back);
    for (const colour of [theme.back.field, theme.back.lattice, theme.back.border]) expect(used.has(colour)).toBe(true);
    expect(back.depth).toBe(0);
  });
});

describe("the mark of a side beside a player's name", () => {
  it("is a circle for one side and a diamond for the other, hidden from screen readers", () => {
    const [one, two] = [sideMark(0), sideMark(1)];
    expect(one).not.toBe(two);
    for (const mark of [one, two]) {
      expect(mark).toMatch(/^<svg [^>]*aria-hidden="true"/);
      expect(mark).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
    expect(one).toContain("<circle");
    expect(two).toContain("<polygon");
  });
});
