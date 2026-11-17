import { describe, expect, it } from "vitest";
import { homeLayout } from "../../src/canvas/menu-layout.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { drawFriendLeft, friendLeft, friendNoteBox, showFriendNote } from "../../src/duel/left.js";
import { drawLobby } from "../../src/duel/lobby.js";
import { bounds, draw, painted } from "../canvas/recorder.js";

const UI = themeFromTokens(null);
const DARK = themeFromTokens(null, { dark: true });
const status = (fields = {}) => ({ phase: "idle", here: false, calling: false, away: false, update: false, ready: { me: false, them: false }, ...fields });
const play = { x: 132, y: 500, w: 120, h: 120 };
const rival = { x: 148, y: 632, w: 88, h: 88 };
const within = (area, target) => area.left >= target.x - 1 && area.right <= target.x + target.w + 1 && area.top >= target.y - 1 && area.bottom <= target.y + target.h + 1;
const SIZES = [[360, 343, false], [375, 370, false], [375, 515, false], [412, 618, false], [360, 640, true], [412, 800, true], [844, 338, true], [1280, 748, true]];

function hosted() {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  host.append(canvas);
  return { host, canvas, line: () => host.querySelector("p") };
}

describe("the friend's seat once a round between two phones ended without them", () => {
  it("says the friend left once a round or the lobby ended because the other phone left, went quiet or could not be reached", () => {
    for (const notice of ["left", "silent", "unreachable"]) expect(friendLeft(status({ away: true, phase: "left", notice }))).toBe(true);
    expect(friendLeft(status({ away: true, phase: "left", notice: null }))).toBe(false);
    expect(friendLeft(status({ away: true, phase: "waiting", notice: "notOpen" }))).toBe(false);
    expect(friendLeft(status({ here: true, phase: "lobby", notice: null }))).toBe(false);
    expect(friendLeft(null)).toBe(false);
  });

  it("outlines the friend's empty seat with dashes, nothing filled that could pass for a button, and draws nothing otherwise", () => {
    const gone = status({ away: true, phase: "left", notice: "left" });
    const ctx = draw((pen) => drawFriendLeft(pen, rival, gone, UI));
    expect(ctx.calls.some((call) => call.op === "setLineDash" && call.segments.length > 0)).toBe(true);
    expect(ctx.calls.some((call) => call.op === "stroke")).toBe(true);
    expect(ctx.calls.some((call) => call.op === "fill" || call.op === "arc")).toBe(false);
    expect(within(bounds(painted(ctx)), rival)).toBe(true);
    expect(ctx.depth).toBe(0);
    const invited = draw((pen) => drawLobby(pen, { play, rival }, { waiting: false, invited: true }, UI, 1));
    expect(JSON.stringify(ctx.calls)).not.toBe(JSON.stringify(invited.calls));
    const stayed = draw((pen) => drawFriendLeft(pen, rival, status({ away: true, phase: "left", notice: null }), UI));
    expect(stayed.calls.filter((call) => call.op === "fill" || call.op === "stroke")).toEqual([]);
    expect(() => draw((pen) => drawFriendLeft(pen, null, gone, UI))).not.toThrow();
  });

  it("finds room for the line where no button is, inside the frame, at every size of the room and of a full screen", () => {
    const apart = (one, two) => one.x + one.w <= two.x || two.x + two.w <= one.x || one.y + one.h <= two.y || two.y + two.h <= one.y;
    for (const [width, height, fill] of [...SIZES, [328, 343, false], [343, 370, false], [328, 300, false]]) {
      const { targets } = homeLayout(width, height, { variants: [], rival: true, fill });
      const box = friendNoteBox(targets, width, height);
      const where = `${width}x${height}`;
      expect(box.h, where).toBeGreaterThanOrEqual(52);
      expect(box.w, where).toBeGreaterThanOrEqual(120);
      expect(box.w, where).toBeLessThanOrEqual(360);
      expect(box.x, where).toBeGreaterThanOrEqual(12);
      expect(box.x + box.w, where).toBeLessThanOrEqual(width - 12);
      expect(box.y + box.h, where).toBeLessThanOrEqual(height);
      for (const target of targets) expect(apart(box, target), `${where} ${target.kind}`).toBe(true);
    }
  });

  it("writes the line in the page over the canvas, in the interface's colours, where the box says", () => {
    const { host, canvas, line } = hosted();
    const box = { x: 20, y: 300, w: 320, h: 60 };
    showFriendNote(canvas, { text: "Your friend does not have the game open", lang: "en", box, ui: UI });
    const shown = line();
    expect(shown.textContent).toBe("Your friend does not have the game open");
    expect(shown.hidden).toBe(false);
    expect(shown.getAttribute("role")).toBe("status");
    expect(shown.lang).toBe("en");
    expect(shown.style.position).toBe("absolute");
    expect([shown.style.left, shown.style.top, shown.style.width, shown.style.maxHeight]).toEqual(["20px", "300px", "320px", "60px"]);
    expect(shown.style.pointerEvents).toBe("none");
    expect(host.children.length).toBe(2);
    const light = [shown.style.color, shown.style.backgroundColor];
    expect(light.every(Boolean)).toBe(true);
    showFriendNote(canvas, { text: "Your friend does not have the game open", lang: "en", box, ui: DARK });
    expect(line()).toBe(shown);
    expect([shown.style.color, shown.style.backgroundColor]).not.toEqual(light);
  });

  it("takes the line away when there is nothing to say, and keeps quiet without a page to write in", () => {
    const { canvas, line } = hosted();
    showFriendNote(canvas, null);
    expect(line()).toBeNull();
    showFriendNote(canvas, { text: "gone", lang: "en", box: { x: 0, y: 0, w: 100, h: 50 }, ui: UI });
    showFriendNote(canvas, null);
    expect(line().hidden).toBe(true);
    expect(() => showFriendNote(undefined, { text: "gone", lang: "en", box: { x: 0, y: 0, w: 100, h: 50 }, ui: UI })).not.toThrow();
  });
});
