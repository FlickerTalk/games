import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { BURST_MS, CHEER_MS, MISS_MS, PLACE_MS, RIBBON_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function after(...cells) {
  let state = initial();
  for (const cell of cells) state = play(state, cell, turn(state)).state;
  return state;
}

function context(state, extra = {}) {
  const over = result(state);
  return {
    state,
    mySide: turn(state),
    canPlay: !over,
    last: null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
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

describe("the Tic-Tac-Toe scene", () => {
  it("lays a named button over each of the nine cells, in reading order", () => {
    const { scene } = rig(after(4, 0));
    const buttons = scene.buttons({ size: 352 });
    expect(buttons.map((one) => one.key)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(buttons[0]).toMatchObject({ label: "Row 1, column 1: O", data: { cell: 0 } });
    expect(buttons[4].label).toBe("Row 2, column 2: X");
    expect(buttons[8].label).toBe("Row 3, column 3: empty");
    expect(buttons[2].box.x).toBeGreaterThan(buttons[0].box.x);
    expect(buttons[6].box.y).toBeGreaterThan(buttons[0].box.y);
    for (const { box } of buttons) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.y + box.h).toBeLessThanOrEqual(1);
    }
    expect(scene.label()).toBe("Board");
  });

  it("opens the board on the user's turn, the free cells marked to play, and plays a free cell", () => {
    const { scene, ctx } = rig(after(4, 0));
    expect(open(scene)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(marked(scene, "can")).toEqual([1, 2, 3, 5, 6, 7, 8]);
    scene.press(2);
    expect(ctx.play).toHaveBeenCalledWith(2);
  });

  it("shakes a taken cell that is tapped, with a soft sound, plays nothing, then rests", () => {
    const { scene, ctx, at } = rig(after(4, 0));
    expect(paint(scene, at())).toBeNull();
    scene.press(4);
    expect(ctx.play).not.toHaveBeenCalled();
    expect(ctx.sound.play).toHaveBeenCalledWith("error-soft");
    expect(scene.view(at() + MISS_MS / 4).miss).toMatchObject({ cell: 4 });
    expect(paint(scene, at() + MISS_MS / 4)).toBe(0);
    expect(paint(scene, at() + MISS_MS)).toBeNull();
    expect(scene.view(at() + MISS_MS).miss).toBeNull();
  });

  it("opens nothing out of turn", () => {
    const { scene } = rig(after(4), { mySide: 0, canPlay: false });
    expect(open(scene)).toEqual([]);
    expect(marked(scene, "can")).toEqual([]);
    scene.press(2);
    expect(scene.view(1000).miss).toBeNull();
  });

  it("pops in the other side's piece where it was played, then rests", () => {
    const { scene, ctx, at } = rig(after(4), { mySide: 0, canPlay: false, last: 4 });
    scene.update({ ...ctx, state: after(4, 0), last: 0, canPlay: true });
    const popping = scene.view(at() + PLACE_MS / 2);
    expect(popping.placing).toMatchObject({ cell: 0, side: 1, grow: 0.5 });
    expect(popping.last).toBe(0);
    expect(paint(scene, at() + PLACE_MS / 2)).toBe(0);
    expect(paint(scene, at() + BURST_MS)).toBeNull();
    expect(scene.view(at() + BURST_MS).placing).toBeNull();
    expect(marked(scene, "last")).toEqual([0]);
  });

  it("marks a move that waits for the other phone", () => {
    const { scene, ctx } = rig(after(4), { mySide: 1, canPlay: true });
    scene.update({ ...ctx, state: after(4, 0), last: 0, mySide: 1, canPlay: false, pending: true });
    expect(marked(scene, "pending")).toEqual([0]);
    expect(scene.view(1000).pending).toBe(true);
  });

  it("draws the winning ribbon once the last piece has landed, the winner's pieces cheering, then rests", () => {
    const won = after(0, 3, 1, 4, 2);
    const { scene, ctx, at } = rig(after(0, 3, 1, 4), { mySide: 1, canPlay: false });
    scene.update({ ...context(won, { mySide: 1, last: 2 }), play: ctx.play, sound: ctx.sound });
    expect(marked(scene, "win")).toEqual([0, 1, 2]);
    expect(scene.view(at() + PLACE_MS / 2).win).toMatchObject({ line: [0, 1, 2], winner: 0, ribbon: 0 });
    const cheering = scene.view(at() + PLACE_MS + RIBBON_MS);
    expect(cheering.win.ribbon).toBe(1);
    expect(paint(scene, at() + PLACE_MS + RIBBON_MS)).toBe(0);
    expect(paint(scene, at() + PLACE_MS + CHEER_MS + 1)).toBeNull();
  });

  it("opens a finished round with its ribbon drawn and nothing moving", () => {
    const { scene, at } = rig(after(0, 3, 1, 4, 2), { mySide: 0, last: 2 });
    expect(scene.view(at()).win).toMatchObject({ ribbon: 1, cheer: 0 });
    expect(paint(scene, at())).toBeNull();
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(after(4), { mySide: 0, canPlay: false, last: 4 });
    scene.update({ ...ctx, state: after(4, 0), last: 0 });
    expect(scene.view(at(), { still: true }).placing).toBeNull();
    expect(paint(scene, at(), true)).toBeNull();
  });
});
