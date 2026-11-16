import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { BURST_MS, START_ROW, WIN_MS, fallMs } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const dropped = (columns) => columns.reduce((state, column) => play(state, column, turn(state)).state, initial());
const SETTLED = fallMs(5) + BURST_MS;

function context(state, extra = {}) {
  return {
    state,
    mySide: turn(state),
    canPlay: !result(state),
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

const marked = (scene, mark) =>
  scene
    .buttons({ size: 352 })
    .filter((button) => (button.data.mark ?? "").split(" ").includes(mark))
    .map((button) => button.key);
const open = (scene) =>
  scene
    .buttons({ size: 352 })
    .filter((button) => !button.disabled)
    .map((button) => button.key);
const paint = (scene, now, still = false) => scene.draw(recorder(), { size: 352, theme: themeFor(null), now, still });

describe("the Four in a Row scene", () => {
  it("lays a named button over each column, left to right, from above the frame to its foot", () => {
    const { scene } = rig(initial());
    const buttons = scene.buttons({ size: 352 });
    expect(buttons.map((one) => one.key)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(buttons[0]).toMatchObject({ label: "Column 1: empty", disabled: false, data: { col: 0, mark: "can" } });
    for (const [at, { box }] of buttons.entries()) {
      if (at) expect(box.x).toBeCloseTo(buttons[at - 1].box.x + buttons[at - 1].box.w, 6);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.h).toBeGreaterThan(0.9);
    }
    expect(scene.label()).toBe("Board");
  });

  it("names each column's discs from the bottom up, in the user's language", () => {
    const { scene } = rig(dropped([3, 3, 0]));
    const labels = scene.buttons({ size: 352 }).map((one) => one.label);
    expect(labels.slice(0, 4)).toEqual(["Column 1: X", "Column 2: empty", "Column 3: empty", "Column 4: X, O"]);
    const spanish = rig(dropped([3]), { lang: "es", t: (key, vars) => translate("es", key, vars) });
    expect(spanish.scene.buttons({ size: 352 })[3].label).toBe("Columna 4: X");
  });

  it("drops a disc with one tap on a column with room, and never into a full one", () => {
    const { scene, ctx } = rig(dropped([0, 0, 0, 0, 0, 0]));
    expect(open(scene)).toEqual([1, 2, 3, 4, 5, 6]);
    scene.press(0);
    expect(ctx.play).not.toHaveBeenCalled();
    scene.press(4);
    expect(ctx.play).toHaveBeenCalledWith(4);
  });

  it("opens nothing out of turn and points no arrow then", () => {
    const { scene, at } = rig(initial(), { canPlay: false });
    expect(open(scene)).toEqual([]);
    expect(marked(scene, "can")).toEqual([]);
    expect(scene.view(at()).open).toEqual([]);
  });

  it("shows the other side's disc falling into its hole, with its sound as it lands, then rests", () => {
    const { scene, ctx, tick, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: dropped([3]), last: 3, canPlay: true });
    const half = scene.view(at() + fallMs(5) / 2);
    expect(half.falling).toMatchObject({ side: 0, column: 3 });
    expect(half.falling.row).toBeGreaterThan(START_ROW);
    expect(half.falling.row).toBeLessThan(5);
    expect(half.hidden).toContain(38);
    expect(half.chosen).toBeNull();
    expect(paint(scene, at() + fallMs(5) / 2)).toBe(0);
    expect(ctx.sound.play).not.toHaveBeenCalled();
    expect(paint(scene, at() + fallMs(5) + 20)).toBe(0);
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["tick"]);
    tick(SETTLED + 1);
    expect(scene.view(at())).toMatchObject({ falling: null, burst: null, last: 38, hidden: [] });
    expect(paint(scene, at())).toBeNull();
  });

  it("frames the column the user played while their own disc falls", () => {
    const { scene, ctx, at } = rig(initial());
    scene.press(2);
    scene.update({ ...ctx, state: dropped([2]), last: 2, canPlay: false });
    expect(scene.view(at() + 50).chosen).toBe(2);
    expect(scene.view(at() + SETTLED + 1).chosen).toBeNull();
  });

  it("drops nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: dropped([3]), last: 3 });
    expect(scene.view(at(), { still: true }).falling).toBeNull();
    expect(paint(scene, at(), true)).toBeNull();
  });

  it("does not drop again a disc that was already there when the board opened", () => {
    const { scene, at } = rig(dropped([3, 4]), { last: 4 });
    expect(scene.view(at()).falling).toBeNull();
    expect(marked(scene, "last")).toEqual([4]);
  });

  it("marks the column of the last disc, and of a disc that waits for the other phone", () => {
    const { scene, ctx } = rig(initial());
    scene.update({ ...ctx, state: dropped([2]), last: 2, canPlay: false, pending: true });
    expect(marked(scene, "last")).toEqual([2]);
    expect(marked(scene, "pending")).toEqual([2]);
    scene.update({ ...ctx, state: dropped([2]), last: 2, canPlay: false, pending: false });
    expect(marked(scene, "pending")).toEqual([]);
  });

  it("rings the winning four once the last disc has landed, pulses them for a few seconds, then rests", () => {
    const before = dropped([3, 4, 3, 4, 3, 4]);
    const { scene, ctx, tick, at } = rig(before, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: dropped([3, 4, 3, 4, 3, 4, 3]), last: 3, canPlay: false });
    expect(scene.view(at() + 10).line).toBeNull();
    tick(SETTLED + 1);
    expect(scene.view(at()).line).toEqual([17, 24, 31, 38]);
    expect(marked(scene, "win")).toEqual([3]);
    expect(scene.view(at() + 300).glow).not.toBe(0);
    expect(paint(scene, at() + 300)).toBeGreaterThan(0);
    expect(scene.view(at() + WIN_MS + 10).glow).toBe(0);
    expect(paint(scene, at() + WIN_MS + 10)).toBeNull();
    expect(scene.view(at() + 300, { still: true }).glow).toBe(0);
  });
});
