import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { ENTER_MS, LINE_MS, POP_MS, durationOf, planMove } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const after = (state, move) => play(state, move, turn(state)).state;
const playing = (moves) => moves.reduce(after, initial());
const FOUR = [112, 113, 97, 114, 96, 130, 98, 145, 95, 160];

function context(state, extra = {}) {
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: null,
    pending: false,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    sound: { play: vi.fn() },
    ...extra,
  };
}

function rig(state, extra) {
  let clock = 1000;
  const ctx = context(state, extra);
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock });
  return { scene, ctx, tick: (ms) => (clock += ms), at: () => clock };
}

const crossings = (scene) => scene.buttons({ size: 352 }).filter((button) => button.data.cell !== undefined);
const ghost = (scene) => scene.buttons({ size: 352 }).find((button) => button.key === "ghost");
const marked = (scene, mark) =>
  crossings(scene)
    .filter((button) => (button.data.mark ?? "").split(" ").includes(mark))
    .map((button) => button.key);
const sounds = (ctx) => ctx.sound.play.mock.calls.map(([name]) => name);
const paint = (scene, now, still = false) => scene.draw(recorder(), { size: 352, theme: themeFor(null), now, still });

describe("the Five in a Row scene", () => {
  it("lays a named button over each crossing in reading order, all inside the board", () => {
    const { scene } = rig(playing([112, 113]));
    const buttons = crossings(scene);
    expect(buttons).toHaveLength(225);
    expect(buttons.map((one) => one.key)).toEqual([...Array(225).keys()]);
    expect(buttons[0]).toMatchObject({ label: "Row 1, column 1: empty", data: { cell: 0 } });
    expect(buttons[112].label).toBe("Row 8, column 8: black");
    expect(buttons[113].label).toBe("Row 8, column 9: white");
    for (const { box } of buttons) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.y + box.h).toBeLessThanOrEqual(1);
    }
    expect(buttons[0].box.x).toBeLessThan(buttons[1].box.x);
    expect(buttons[0].box.y).toBeLessThan(buttons[15].box.y);
    expect(scene.label()).toBe("Board");
    expect(ghost(scene)).toBeUndefined();
  });

  it("chooses a crossing on the first tap, with a sound, and places the stone on a second tap there or on the button that confirms it", () => {
    const { scene, ctx } = rig(initial());
    scene.press(112);
    expect(marked(scene, "chosen")).toEqual([112]);
    expect(ghost(scene)).toMatchObject({ label: "Place the stone at row 8, column 8", data: { ghost: 112 } });
    expect(ghost(scene).box.w * 352).toBeGreaterThanOrEqual(44);
    expect(scene.view(1000).chosen).toEqual({ cell: 112, side: 0 });
    expect(sounds(ctx)).toEqual(["tap"]);
    expect(ctx.play).not.toHaveBeenCalled();
    scene.press(112);
    expect(ctx.play).toHaveBeenCalledWith(112);

    const other = rig(initial());
    other.scene.press(112);
    other.scene.press("ghost");
    expect(other.ctx.play).toHaveBeenCalledWith(112);
  });

  it("moves the choice to another crossing, and answers a tap on a stone with a shake and a soft sound, keeping the choice", () => {
    const { scene, ctx, at } = rig(playing([112, 113]));
    scene.press(97);
    scene.press(80);
    expect(marked(scene, "chosen")).toEqual([80]);
    scene.press(112);
    expect(marked(scene, "chosen")).toEqual([80]);
    expect(scene.view(at()).miss).toEqual({ cell: 112, progress: 0 });
    expect(sounds(ctx)).toEqual(["tap", "tap", "error-soft"]);
    expect(ctx.play).not.toHaveBeenCalled();
    expect(paint(scene, at() + 100)).toBe(0);
    expect(scene.view(at() + 1000).miss).toBeNull();
  });

  it("opens nothing out of turn, and lets go of a choice when the turn ends or a stone arrives", () => {
    const waiting = rig(initial(), { mySide: 1, canPlay: false });
    expect(crossings(waiting.scene).filter((one) => !one.disabled)).toEqual([]);

    const { scene, ctx } = rig(initial());
    scene.press(112);
    scene.update({ ...ctx, canPlay: false });
    expect(marked(scene, "chosen")).toEqual([]);
    expect(ghost(scene)).toBeUndefined();
    scene.update({ ...ctx, canPlay: true });
    scene.press(97);
    scene.update({ ...ctx, state: after(initial(), 112), last: 112, mySide: 1 });
    expect(marked(scene, "chosen")).toEqual([]);
  });

  it("grows the other side's stone onto its crossing with a pop, then rests", () => {
    const { scene, ctx, at, tick } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(initial(), 112), last: 112, canPlay: true });
    const going = scene.view(at() + ENTER_MS / 2);
    expect(going.entering).toEqual({ cell: 112, progress: 0.5 });
    expect(going.pop.cell).toBe(112);
    expect(paint(scene, at() + ENTER_MS / 2)).toBe(0);
    tick(POP_MS + 1);
    expect(scene.view(at())).toMatchObject({ entering: null, pop: null, last: 112 });
    expect(paint(scene, at())).toBeNull();
  });

  it("joins the winning five and lets it cheer, then rests, and shows the line at once on a board opened after the round", () => {
    const before = playing(FOUR);
    const { scene, ctx, at } = rig(before, { mySide: 1, canPlay: false });
    const won = after(before, 99);
    scene.update({ ...ctx, state: won, last: 99 });
    const growing = scene.view(at() + ENTER_MS + LINE_MS / 2);
    expect(growing.won).toEqual({ cells: [95, 96, 97, 98, 99], progress: 0.5, cheer: 1 });
    expect(marked(scene, "won")).toEqual([95, 96, 97, 98, 99]);
    expect(paint(scene, at() + ENTER_MS + LINE_MS / 2)).toBe(0);
    const end = at() + durationOf(planMove(before, won, 99));
    expect(paint(scene, end)).toBeNull();
    expect(scene.view(end).won).toEqual({ cells: [95, 96, 97, 98, 99], progress: 1, cheer: 0 });
    expect(rig(won).scene.view(1000).won).toEqual({ cells: [95, 96, 97, 98, 99], progress: 1, cheer: 0 });
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const before = playing(FOUR);
    const { scene, ctx, at } = rig(before, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(before, 99), last: 99 });
    expect(scene.view(at(), { still: true })).toMatchObject({ entering: null, pop: null, won: { progress: 1, cheer: 0 } });
    expect(paint(scene, at(), true)).toBeNull();
  });

  it("marks the last stone and the square of a stone that waits for the other phone", () => {
    const { scene, ctx } = rig(initial());
    scene.update({ ...ctx, state: after(initial(), 112), last: 112, mySide: 0, canPlay: false, pending: true });
    expect(marked(scene, "last")).toEqual([112]);
    expect(marked(scene, "pending")).toEqual([112]);
    expect(scene.view(1000).pending).toBe(112);
    scene.update({ ...ctx, state: after(initial(), 112), last: 112, mySide: 0, canPlay: false, pending: false });
    expect(marked(scene, "pending")).toEqual([]);
  });

  it("breathes slowly while a crossing is chosen, and rests otherwise", () => {
    const { scene, at } = rig(initial());
    expect(paint(scene, at())).toBeNull();
    scene.press(112);
    expect(paint(scene, at())).toBeGreaterThan(30);
  });
});
