import { describe, expect, it } from "vitest";
import { localFlick, playMode } from "../../src/canvas/flick.js";

const counting = { start: () => ({ steps: [], total: 0 }), step: (state, random) => ({ steps: [...state.steps, random()], total: state.total + 1 }), over: (state) => state.total >= 10 };

describe("who the other side is", () => {
  it("is Flick in the FlickerTalk conversation, the friend in a contact's, and nobody outside a conversation", () => {
    expect(playMode({ solo: true, live: false }, "chat-1")).toBe("flick");
    expect(playMode({ solo: true, live: true }, "chat-1")).toBe("flick");
    expect(playMode({ live: true }, "chat-1")).toBe("friend");
    expect(playMode({ live: false }, "chat-1")).toBe("alone");
    expect(playMode({ solo: true, live: true }, null)).toBe("alone");
  });
});

describe("Flick playing on this phone", () => {
  it("plays the same moves from the same seed, and other moves from another", () => {
    const one = localFlick({ seed: "AAAAAAAA", ...counting }).finish();
    const two = localFlick({ seed: "AAAAAAAA", ...counting }).finish();
    const other = localFlick({ seed: "BBBBBBBB", ...counting }).finish();
    expect(one.state.steps).toEqual(two.state.steps);
    expect(other.state.steps).not.toEqual(one.state.steps);
    expect(one.state.total).toBe(10);
  });

  it("keeps pace with the player, going only as far as asked", () => {
    const flick = localFlick({ seed: "AAAAAAAA", ...counting });
    flick.upTo((state) => state.total >= 3);
    expect(flick.state.total).toBe(3);
    flick.upTo((state) => state.total >= 3);
    expect(flick.state.total).toBe(3);
    flick.finish();
    expect(flick.state.total).toBe(10);
  });

  it("stops when it has no move left", () => {
    const stuck = localFlick({ seed: "AAAAAAAA", start: () => ({ total: 0 }), step: (state) => (state.total < 2 ? { total: state.total + 1 } : null), over: () => false });
    expect(stuck.finish().state.total).toBe(2);
  });

  it("draws its chances apart from the round's, so the player's trays stay the same", () => {
    const seen = [];
    localFlick({ seed: "AAAAAAAA", start: (random) => (seen.push(random), { total: 0 }), step: () => null, over: () => false });
    expect(typeof seen[0]).toBe("function");
  });
});
