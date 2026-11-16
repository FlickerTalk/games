import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { POP_MS, STROKE_MS, durationOf, planMove } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { H, LINES, initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const through = (lines) => lines.reduce((state, line) => play(state, line, state.next).state, initial());

function context(lines, extra = {}) {
  const state = through(lines);
  return {
    state,
    view: { round: { moves: lines } },
    mySide: turn(state),
    canPlay: !result(state),
    last: lines.at(-1) ?? null,
    pending: false,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    sound: { play: vi.fn() },
    ...extra,
  };
}

function rig(lines, extra) {
  let clock = 1000;
  const ctx = context(lines, extra);
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock });
  return { scene, ctx, tick: (ms) => (clock += ms), at: () => clock };
}

const marked = (scene, mark) =>
  scene
    .buttons({ size: 352 })
    .filter((button) => (button.data.mark ?? "").split(" ").includes(mark))
    .map((button) => button.key)
    .sort((a, b) => a - b);
const open = (scene) =>
  scene
    .buttons({ size: 352 })
    .filter((button) => !button.disabled)
    .map((button) => button.key)
    .sort((a, b) => a - b);
const paint = (scene, now, still = false) => scene.draw(recorder(), { size: 352, theme: themeFor(null), now, still });

describe("the dots and boxes scene", () => {
  it("lays a named button over each line, row by row, each on its own touch area inside the board", () => {
    const { scene } = rig([]);
    const buttons = scene.buttons({ size: 352 });
    expect(buttons).toHaveLength(LINES);
    expect(buttons.slice(0, 9).map((button) => button.key)).toEqual([0, 1, 2, 3, H, H + 1, H + 2, H + 3, H + 4]);
    expect(buttons[0]).toMatchObject({ key: 0, label: "Line across, row 1, box 1: free", data: { line: 0 } });
    expect(buttons.find((one) => one.key === 21).label).toBe("Line down, box 1, column 2: free");
    for (const { box } of buttons) {
      expect(Math.min(box.x, box.y)).toBeGreaterThanOrEqual(0);
      expect(Math.max(box.x + box.w, box.y + box.h)).toBeLessThanOrEqual(1);
    }
    expect(scene.label()).toBe("Board: 0 boxes to 0");
  });

  it("opens every free line to the side to play and draws one on a press, and nothing out of turn", () => {
    const { scene, ctx } = rig([0]);
    expect(open(scene)).toHaveLength(LINES - 1);
    expect(open(scene)).not.toContain(0);
    scene.press(5);
    expect(ctx.play).toHaveBeenCalledWith(5);
    scene.press(0);
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const waiting = rig([0], { canPlay: false });
    expect(open(waiting.scene)).toEqual([]);
    waiting.scene.press(5);
    expect(waiting.ctx.play).not.toHaveBeenCalled();
  });

  it("names who drew each line, counts the boxes, and marks the last line and one still on its way to the other phone", () => {
    const { scene, ctx } = rig([0, 4, 20, 21]);
    const buttons = scene.buttons({ size: 352 });
    expect(buttons.find((one) => one.key === 0).label).toBe("Line across, row 1, box 1: X");
    expect(buttons.find((one) => one.key === 4).label).toBe("Line across, row 2, box 1: O");
    expect(marked(scene, "d0")).toEqual([0, 20]);
    expect(marked(scene, "d1")).toEqual([4, 21]);
    expect(marked(scene, "last")).toEqual([21]);
    expect(marked(scene, "pending")).toEqual([]);
    expect(scene.label()).toBe("Board: 0 boxes to 1");
    scene.update({ ...ctx, pending: true });
    expect(marked(scene, "pending")).toEqual([21]);
    expect(scene.view(1000).pending).toBe(21);
  });

  it("draws the other side's line from its middle out, then pops the box it closes with its sound, then rests", () => {
    const { scene, ctx, at } = rig([0, 4, 20], { canPlay: false });
    scene.update({ ...context([0, 4, 20, 21]), sound: ctx.sound });
    const drawing = scene.view(at() + STROKE_MS / 2);
    expect(drawing.moving).toEqual({ line: 21, progress: 0.5 });
    expect(drawing.popping).toEqual({ 0: 0 });
    expect(paint(scene, at() + STROKE_MS / 2)).toBe(0);
    expect(ctx.sound.play).not.toHaveBeenCalled();
    expect(paint(scene, at() + STROKE_MS + POP_MS / 2)).toBe(0);
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["collect"]);
    const done = at() + durationOf(planMove(through([0, 4, 20]), through([0, 4, 20, 21]), 21));
    expect(scene.view(done).moving).toBeNull();
    expect(paint(scene, done)).toBeNull();
    expect(ctx.sound.play).toHaveBeenCalledTimes(1);
  });

  it("turns the arrow of another turn on the box just closed while its side plays again, and drops it with the next line", () => {
    const { scene, at } = rig([0, 4, 20, 21]);
    expect(scene.view(at()).extra).toEqual([{ box: 0, side: 1, progress: 1 }]);
    scene.update(context([0, 4, 20, 21, 1]));
    expect(scene.view(at() + 1000).extra).toEqual([]);
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig([0, 4, 20], { canPlay: false });
    scene.update({ ...context([0, 4, 20, 21]), sound: ctx.sound });
    const still = scene.view(at(), { still: true });
    expect(still.moving).toBeNull();
    expect(still.popping).toEqual({});
    expect(paint(scene, at(), true)).toBeNull();
  });
});
