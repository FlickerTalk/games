import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { HOP_MS, STEP_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function fromRows(rows, next) {
  const marks = { d: 0, l: 1, D: 2, L: 3 };
  return { cells: rows.join("").split("").map((mark) => (mark in marks ? marks[mark] : null)), next, quiet: 0 };
}

const JUMPS = fromRows(["........", "........", ".....d..", "....l...", "........", "..l.....", "........", "........"], 0);
const CROWNING = fromRows(["........", "........", "........", "........", "...l....", "........", ".d......", "........"], 0);

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
const after = (state, move) => play(state, move, state.next).state;

describe("the checkers scene", () => {
  it("lays a named button over each dark square, the user's own pieces at the bottom", () => {
    const { scene } = rig(initial());
    const buttons = scene.buttons({ size: 352 });
    expect(buttons).toHaveLength(32);
    expect(buttons[0]).toMatchObject({ key: 62, label: "Row 8, column 7: light piece", data: { cell: 62 } });
    expect(buttons.at(-1).key).toBe(1);
    expect(buttons.find((one) => one.key === 28).label).toBe("Row 4, column 5: empty");
    expect(buttons[0].box.y).toBeLessThan(buttons.at(-1).box.y);
    for (const { box } of buttons) expect(box.x + box.w).toBeLessThanOrEqual(1);
    expect(scene.label()).toBe("Board: 12 dark, 12 light");
  });

  it("opens the pieces that may move, then where the chosen one may go, and plays the whole move", () => {
    const { scene, ctx } = rig(initial());
    expect(open(scene)).toEqual([17, 19, 21, 23]);
    expect(marked(scene, "can")).toEqual([17, 19, 21, 23]);
    scene.press(21);
    expect(marked(scene, "from")).toEqual([21]);
    expect(marked(scene, "to")).toEqual([28, 30]);
    expect(ctx.sound.play).toHaveBeenCalledWith("tap");
    scene.press(30);
    expect(ctx.play).toHaveBeenCalledWith("21-30");
  });

  it("chains the jumps of a capture, marks the pieces that must take, and starts over on a second tap", () => {
    const { scene, ctx } = rig(JUMPS);
    expect(marked(scene, "forced")).toEqual([21]);
    scene.press(21);
    expect(marked(scene, "forced")).toEqual([]);
    scene.press(35);
    expect(marked(scene, "from")).toEqual([21, 35]);
    expect(marked(scene, "to")).toEqual([49]);
    expect(scene.view(1000).targets).toEqual([{ cell: 49, capture: true }]);
    scene.press(21);
    expect(marked(scene, "from")).toEqual([]);
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("keeps the light side's own numbering, and opens nothing out of turn", () => {
    const { scene } = rig(initial(), { mySide: 1, canPlay: false });
    const buttons = scene.buttons({ size: 352 });
    expect(buttons[0].key).toBe(1);
    expect(open(scene)).toEqual([]);
    expect(buttons.filter((one) => one.data.drag)).toEqual([]);
  });

  it("shows the other side's move travelling, then rests", () => {
    const { scene, ctx, tick, at } = rig(initial(), { mySide: 1, canPlay: false });
    const moved = after(initial(), "21-30");
    scene.update({ ...ctx, state: moved, last: "21-30", canPlay: true });
    const going = scene.view(at() + STEP_MS / 2);
    expect(going.moving).toMatchObject({ path: [21, 30], progress: 0.5 });
    expect(going.hidden).toContain(30);
    expect(scene.draw(recorder(), { size: 352, theme: themeFor(null), now: at() + STEP_MS / 2, still: false })).toBe(0);
    tick(STEP_MS + 1);
    expect(scene.view(at()).moving).toBeNull();
    expect(scene.view(at()).last).toEqual([21, 30]);
    expect(scene.draw(recorder(), { size: 352, theme: themeFor(null), now: at(), still: false })).toBeNull();
  });

  it("bursts each piece taken and crowns a man that reaches the far row, with their sounds", () => {
    const { scene, ctx, at } = rig(JUMPS, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(JUMPS, "21-35-49"), last: "21-35-49" });
    scene.draw(recorder(), { size: 352, theme: themeFor(null), now: at() + HOP_MS * 2, still: false });
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["tick", "tick"]);
    const crowning = rig(CROWNING, { mySide: 1, canPlay: false });
    crowning.scene.update({ ...crowning.ctx, state: after(CROWNING, "49-56"), last: "49-56" });
    const landed = crowning.scene.view(crowning.at() + STEP_MS + 100);
    expect(landed.moving.crown).toBeGreaterThan(0);
    expect(landed.sparkle).toMatchObject({ cell: 56 });
    crowning.scene.draw(recorder(), { size: 352, theme: themeFor(null), now: crowning.at() + STEP_MS + 100, still: false });
    expect(crowning.ctx.sound.play).toHaveBeenCalledWith("success");
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(initial(), "21-30"), last: "21-30" });
    expect(scene.view(at(), { still: true }).moving).toBeNull();
  });

  it("marks the last move, and the square of a move that waits for the other phone", () => {
    const { scene, ctx } = rig(initial());
    scene.update({ ...ctx, state: after(initial(), "21-30"), last: "21-30", mySide: 0, canPlay: false, pending: true });
    expect(marked(scene, "last")).toEqual([21, 30]);
    expect(marked(scene, "pending")).toEqual([30]);
  });

  it("lets a finger carry a piece, lands a move where it is dropped without walking it again, and sends back a piece let go elsewhere", () => {
    const { scene, ctx, at, tick } = rig(initial());
    expect(scene.canDrag(21)).toBe(true);
    expect(scene.canDrag(1)).toBe(false);
    expect(scene.dropTargets(21).sort((a, b) => a - b)).toEqual([28, 30]);
    scene.dragAt(21, { x: 200, y: 160 });
    expect(scene.view(at()).floating).toMatchObject({ piece: 0, x: 200, y: 160 });
    expect(scene.view(at()).hidden).toContain(21);
    scene.dragAt(21, null);
    scene.drop(21, 30);
    expect(ctx.play).toHaveBeenCalledWith("21-30");
    expect(scene.view(at()).floating).toMatchObject({ x: 200, y: 160 });
    scene.update({ ...ctx, state: after(initial(), "21-30"), last: "21-30", canPlay: false });
    expect(scene.view(at()).moving).toBeNull();
    expect(scene.view(at()).floating).toBeNull();

    const other = rig(initial());
    other.scene.dragAt(23, { x: 100, y: 100 });
    other.scene.dragAt(23, null);
    expect(other.scene.view(other.at()).floating).toMatchObject({ x: 100, y: 100 });
    other.tick(1000);
    expect(other.scene.view(other.at()).floating).toBeNull();
  });
});
