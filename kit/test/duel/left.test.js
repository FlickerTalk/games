// @vitest-environment node
import { describe, expect, it } from "vitest";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { drawFriendLeft, friendLeft } from "../../src/duel/left.js";
import { drawLobby } from "../../src/duel/lobby.js";
import { bounds, draw, painted } from "../canvas/recorder.js";

const UI = themeFromTokens(null);
const status = (fields = {}) => ({ phase: "idle", here: false, calling: false, away: false, update: false, ready: { me: false, them: false }, ...fields });
const play = { x: 132, y: 500, w: 120, h: 120 };
const rival = { x: 148, y: 632, w: 88, h: 88 };
const within = (area, target) => area.left >= target.x - 1 && area.right <= target.x + target.w + 1 && area.top >= target.y - 1 && area.bottom <= target.y + target.h + 1;

describe("the friend's seat once a round between two phones ended without them", () => {
  it("says the friend left once a round or the lobby ended because the other phone left, went quiet or could not be reached", () => {
    for (const notice of ["left", "silent", "unreachable"]) expect(friendLeft(status({ away: true, phase: "left", notice }))).toBe(true);
    expect(friendLeft(status({ away: true, phase: "left", notice: null }))).toBe(false);
    expect(friendLeft(status({ away: true, phase: "waiting", notice: "notOpen" }))).toBe(false);
    expect(friendLeft(status({ here: true, phase: "lobby", notice: null }))).toBe(false);
    expect(friendLeft(null)).toBe(false);
  });

  it("marks the friend's seat when they left, and draws nothing otherwise", () => {
    const gone = status({ away: true, phase: "left", notice: "left" });
    const ctx = draw((pen) => drawFriendLeft(pen, rival, gone, UI));
    expect(ctx.calls.some((call) => call.op === "fill")).toBe(true);
    expect(within(bounds(painted(ctx)), rival)).toBe(true);
    expect(ctx.depth).toBe(0);
    const invited = draw((pen) => drawLobby(pen, { play, rival }, { waiting: false, invited: true }, UI, 1));
    expect(JSON.stringify(ctx.calls)).not.toBe(JSON.stringify(invited.calls));
    const stayed = draw((pen) => drawFriendLeft(pen, rival, status({ away: true, phase: "left", notice: null }), UI));
    expect(stayed.calls.filter((call) => call.op === "fill" || call.op === "stroke")).toEqual([]);
    expect(() => draw((pen) => drawFriendLeft(pen, null, gone, UI))).not.toThrow();
  });
});
