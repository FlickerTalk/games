import { describe, expect, it } from "vitest";
import { handRows, handSlots } from "../src/hand.js";

const BOX = { x: 10, y: 200, w: 320, h: 140 };
const CARD = { width: 60, height: 84 };

const overlaps = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

describe("the user's hand", () => {
  it("keeps seven cards in one row, and opens a second and a third row as the hand grows", () => {
    expect(handRows(7, { span: 330, width: 60 })).toBe(1);
    expect(handRows(8, { span: 330, width: 60 })).toBe(2);
    expect(handRows(15, { span: 330, width: 60 })).toBe(3);
    expect(handRows(40, { span: 330, width: 60 })).toBe(3);
    expect(handRows(0, { span: 330, width: 60 })).toBe(1);
  });

  it("leaves at least 44 px of each card to touch, one beside the other, with 15 cards on a 360 px phone", () => {
    const slots = handSlots(BOX, 15, { ...CARD, rows: 3, step: 46 });
    expect(slots).toHaveLength(15);
    for (const { reach } of slots) {
      expect(reach.w).toBeGreaterThanOrEqual(44);
      expect(reach.h).toBeGreaterThanOrEqual(44);
    }
    for (const [at, one] of slots.entries()) for (const other of slots.slice(at + 1)) expect(overlaps(one.reach, other.reach)).toBe(false);
  });

  it("lays the cards out in reading order, each row centred, inside its box", () => {
    const slots = handSlots(BOX, 9, { ...CARD, rows: 2, step: 50 });
    expect(slots.map((one) => one.row)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1]);
    for (const slot of slots) {
      expect(slot.x).toBeGreaterThanOrEqual(BOX.x);
      expect(slot.x + slot.w).toBeLessThanOrEqual(BOX.x + BOX.w + 0.01);
      expect(slot.y + slot.h).toBeLessThanOrEqual(BOX.y + BOX.h + 0.01);
    }
    expect(slots[0].y).toBeLessThan(slots[5].y);
    const centre = (row) => {
      const cards = slots.filter((one) => one.row === row);
      return (cards[0].x + cards.at(-1).x + CARD.width) / 2;
    };
    expect(centre(0)).toBeCloseTo(BOX.x + BOX.w / 2, 5);
    expect(centre(1)).toBeCloseTo(BOX.x + BOX.w / 2, 5);
  });

  it("puts a few cards side by side with a little room, and overlaps them only when they do not fit", () => {
    const few = handSlots(BOX, 3, { ...CARD, rows: 1, step: 0 });
    expect(few[1].x - few[0].x).toBeGreaterThan(CARD.width);
    const many = handSlots(BOX, 7, { ...CARD, rows: 1, step: 0 });
    expect(many[1].x - many[0].x).toBeLessThan(CARD.width);
    expect(many.at(-1).x + CARD.width).toBeCloseTo(BOX.x + BOX.w, 5);
    expect(many.at(-1).reach.w).toBe(CARD.width);
  });

  it("raises a card it is told to lift, its touch area with it, and keeps the areas apart", () => {
    const flat = handSlots(BOX, 10, { ...CARD, rows: 2, step: 50, lift: 8 });
    const lifted = handSlots(BOX, 10, { ...CARD, rows: 2, step: 50, lift: 8, lifted: (index) => index === 7 });
    expect(lifted[7].y).toBeCloseTo(flat[7].y - 8, 5);
    expect(lifted[7].reach.y).toBeCloseTo(flat[7].reach.y - 8, 5);
    for (const [at, one] of lifted.entries()) for (const other of lifted.slice(at + 1)) expect(overlaps(one.reach, other.reach)).toBe(false);
    expect(lifted[2].reach.y + lifted[2].reach.h).toBeLessThanOrEqual(lifted[7].reach.y + 0.01);
  });
});
