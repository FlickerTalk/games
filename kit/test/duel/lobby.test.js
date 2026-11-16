// @vitest-environment node
import { describe, expect, it } from "vitest";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { drawLobby, lobbyOf } from "../../src/duel/lobby.js";
import { bounds, draw, painted } from "../canvas/recorder.js";

const UI = themeFromTokens(null);
const status = (fields = {}) => ({ phase: "idle", here: false, calling: false, away: false, update: false, ready: { me: false, them: false }, ...fields });
const play = { x: 132, y: 500, w: 120, h: 120 };
const rival = { x: 148, y: 632, w: 88, h: 88 };
const within = (area, target) => area.left >= target.x - 1 && area.right <= target.x + target.w + 1 && area.top >= target.y - 1 && area.bottom <= target.y + target.h + 1;

describe("the two players before a round between two phones", () => {
  it("says nobody is waiting before anyone started, against the phone or with no link at all", () => {
    expect(lobbyOf(null)).toEqual({ waiting: false, invited: false });
    expect(lobbyOf(status())).toEqual({ waiting: false, invited: false });
    expect(lobbyOf(status({ here: true, phase: "lobby" }))).toEqual({ waiting: false, invited: false });
  });

  it("says this player waits once they started, while calling and once the other is here", () => {
    expect(lobbyOf(status({ calling: true, phase: "waiting", ready: { me: true, them: false } })).waiting).toBe(true);
    expect(lobbyOf(status({ here: true, phase: "lobby", ready: { me: true, them: false } })).waiting).toBe(true);
  });

  it("says this player is invited when the other started first", () => {
    expect(lobbyOf(status({ here: true, phase: "lobby", ready: { me: false, them: true } }))).toEqual({ waiting: false, invited: true });
  });

  it("says nothing of either once the round runs, ended, or the other went away", () => {
    for (const phase of ["countdown", "running", "finished", "over"]) expect(lobbyOf(status({ here: true, phase, ready: { me: true, them: true } }))).toEqual({ waiting: false, invited: false });
    expect(lobbyOf(status({ away: true, phase: "left", ready: { me: true, them: true } }))).toEqual({ waiting: false, invited: false });
    expect(lobbyOf(status({ away: true, phase: "waiting", ready: { me: true, them: false } }))).toEqual({ waiting: false, invited: false });
  });

  it("draws nothing when nobody waits", () => {
    const ctx = draw((pen) => drawLobby(pen, { play, rival }, { waiting: false, invited: false }, UI, 1));
    expect(ctx.calls.filter((call) => call.op === "fill" || call.op === "stroke")).toEqual([]);
  });

  it("turns dots round inside the play button while this player waits, moving with time", () => {
    const one = draw((pen) => drawLobby(pen, { play, rival }, { waiting: true, invited: false }, UI, 1));
    const two = draw((pen) => drawLobby(pen, { play, rival }, { waiting: true, invited: false }, UI, 1.4));
    expect(one.calls.filter((call) => call.op === "arc").length).toBeGreaterThanOrEqual(3);
    expect(within(bounds(painted(one)), play)).toBe(true);
    expect(JSON.stringify(one.calls)).not.toBe(JSON.stringify(two.calls));
    expect(one.depth).toBe(0);
  });

  it("marks the other player's seat with a play sign when they started first", () => {
    const ctx = draw((pen) => drawLobby(pen, { play, rival }, { waiting: false, invited: true }, UI, 1));
    expect(ctx.calls.some((call) => call.op === "fill")).toBe(true);
    expect(within(bounds(painted(ctx)), rival)).toBe(true);
    expect(ctx.depth).toBe(0);
  });

  it("copes with a home screen that has no seat", () => {
    expect(() => draw((pen) => drawLobby(pen, { play, rival: null }, { waiting: true, invited: true }, UI, 1))).not.toThrow();
  });
});
