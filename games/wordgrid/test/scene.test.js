import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { HOP_MS, SHAKE_MS, STEP_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { commitText, initial, play, revealText, seedText, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);

function onGrid(letters) {
  let state = initial();
  for (const move of [commitText("en", A), seedText(B), revealText(A)]) state = play(state, move, turn(state)).state;
  return { ...state, grid: [...letters] };
}

const GRID = onGrid("catsoxeetnrfdlmp");
const after = (state, move) => play(state, move, turn(state)).state;

function context(state, extra = {}) {
  return {
    state,
    mySide: turn(state),
    canPlay: state.phase === "play",
    last: null,
    pending: false,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    notify: vi.fn(),
    sound: { play: vi.fn() },
    ...extra,
  };
}

function rig(state, extra) {
  let clock = 1000;
  const ctx = context(state, extra);
  const changed = vi.fn();
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock, changed });
  return { scene, ctx, changed, tick: (ms) => (clock += ms), at: () => clock };
}

const buttons = (scene) => scene.buttons({ size: 343 });
const marked = (scene, mark) =>
  buttons(scene)
    .filter((button) => (button.data.mark ?? "").split(" ").includes(mark))
    .map((button) => button.key);
const open = (scene) =>
  buttons(scene)
    .filter((button) => !button.disabled)
    .map((button) => button.key);
const frame = (scene, now, still = false) => scene.draw(recorder(), { size: 343, theme: themeFor(null), now, still });

describe("the Letter Grid scene", () => {
  it("lays a named button over each tile in reading order, and none while the letters are being drawn", () => {
    const { scene } = rig(GRID);
    const all = buttons(scene);
    expect(all).toHaveLength(16);
    expect(all[0]).toMatchObject({ key: 0, label: "C, row 1, column 1", data: { cell: 0 } });
    expect(all[15].label).toBe("P, row 4, column 4");
    expect(all[0].box.y).toBeLessThan(all[15].box.y);
    for (const { box } of all) expect(box.x >= 0 && box.y >= 0 && box.x + box.w <= 1 && box.y + box.h <= 1).toBe(true);
    expect(scene.label()).toBe("Grid");
    expect(buttons(rig(initial(), { mySide: 0 }).scene)).toEqual([]);
  });

  it("opens every tile to start a word, then only the free tiles touching the last one, and says the word", () => {
    const { scene, ctx, changed } = rig(GRID);
    expect(open(scene)).toHaveLength(16);
    expect(scene.canSay()).toBe(false);
    scene.press(0);
    expect(ctx.sound.play).toHaveBeenCalledWith("tap");
    expect(changed).toHaveBeenCalled();
    expect(marked(scene, "path")).toEqual([0]);
    expect(open(scene)).toEqual([0, 1, 4, 5]);
    expect(marked(scene, "can")).toEqual([1, 4, 5]);
    scene.press(1);
    scene.press(2);
    expect(scene.word()).toBe("cat");
    expect(scene.canSay()).toBe(true);
    scene.say();
    expect(ctx.play).toHaveBeenCalledWith("wcat");
    expect(scene.word()).toBe("");
  });

  it("takes a letter back, and cuts the word back to before a tile tapped again", () => {
    const { scene } = rig(GRID);
    for (const cell of [0, 1, 2]) scene.press(cell);
    scene.undo();
    expect(scene.word()).toBe("ca");
    scene.press(0);
    expect(scene.word()).toBe("");
    expect(scene.canUndo()).toBe(false);
  });

  it("keeps a word that will not do, says why, shakes its tiles and sounds softly", () => {
    const { scene, ctx, at, tick } = rig(GRID);
    for (const cell of [2, 1, 0]) scene.press(cell);
    scene.say();
    expect(ctx.notify).toHaveBeenCalledWith("Not in the word list");
    expect(ctx.sound.play).toHaveBeenCalledWith("error-soft");
    expect(ctx.play).not.toHaveBeenCalled();
    expect(scene.word()).toBe("tac");
    expect(scene.view(at()).shake).toMatchObject({ cells: [2, 1, 0] });
    expect(frame(scene, at())).toBe(0);
    tick(SHAKE_MS);
    expect(scene.view(at()).shake).toBeNull();
    expect(frame(scene, at())).toBeNull();
  });

  it("opens nothing off turn, and passes on its turn", () => {
    const { scene } = rig(GRID, { canPlay: false });
    expect(open(scene)).toEqual([]);
    expect(scene.canPass()).toBe(false);
    const mine = rig(GRID);
    mine.scene.press(5);
    mine.scene.pass();
    expect(mine.ctx.play).toHaveBeenCalledWith("x");
    expect(mine.scene.word()).toBe("");
  });

  it("traces the other side's word letter by letter, hops its tiles, then marks it as the last word", () => {
    const { scene, ctx, at, tick } = rig(GRID, { mySide: 0, canPlay: false });
    scene.update({ ...ctx, state: after(GRID, "wcat"), last: "wcat", canPlay: true });
    expect(scene.view(at() + STEP_MS * 1.5).trace).toEqual({ side: 1, path: [0, 1] });
    expect(scene.view(at() + STEP_MS * 1.5).last).toEqual([]);
    expect(frame(scene, at() + STEP_MS)).toBe(0);
    const hopping = scene.view(at() + STEP_MS * 3 + HOP_MS / 2);
    expect(hopping.hops.length).toBeGreaterThan(0);
    tick(5000);
    expect(frame(scene, at())).toBeNull();
    expect(scene.view(at()).trace).toBeNull();
    expect(scene.view(at()).last).toEqual([0, 1, 2]);
    expect(marked(scene, "last")).toEqual([0, 1, 2]);
  });

  it("shows the user's own tracing at once, even while the other side's word is still being shown", () => {
    const { scene, ctx, at } = rig(GRID, { mySide: 0, canPlay: false });
    scene.update({ ...ctx, state: after(GRID, "wcat"), last: "wcat", canPlay: true });
    scene.press(12);
    const view = scene.view(at() + STEP_MS);
    expect(view.trace).toEqual({ side: 0, path: [12] });
    expect(view.hops).toEqual([]);
    expect(view.last).toEqual([0, 1, 2]);
  });

  it("hops the user's own word at once, without tracing it again, and marks it waiting for the other phone", () => {
    const { scene, ctx, at } = rig(GRID);
    for (const cell of [0, 1, 2]) scene.press(cell);
    scene.say();
    scene.update({ ...ctx, state: after(GRID, "wcat"), last: "wcat", canPlay: false, pending: true });
    const hopping = scene.view(at() + HOP_MS / 2);
    expect(hopping.trace).toEqual({ side: 1, path: [0, 1, 2] });
    expect(hopping.hops[0].progress).toBeGreaterThan(0);
    expect(marked(scene, "pending")).toEqual([2]);
    expect(scene.view(at() + 5000).pending).toBe(2);
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(GRID, { mySide: 0, canPlay: false });
    scene.update({ ...ctx, state: after(GRID, "wcat"), last: "wcat", canPlay: true });
    const still = scene.view(at(), { still: true });
    expect(still.trace).toBeNull();
    expect(still.hops).toEqual([]);
    expect(still.last).toEqual([0, 1, 2]);
    expect(frame(scene, at(), true)).toBeNull();
  });

  it("starts each round with nothing traced", () => {
    const { scene, ctx } = rig(GRID);
    scene.press(0);
    scene.update({ ...ctx, state: initial(), mySide: 0, canPlay: true });
    expect(scene.word()).toBe("");
    expect(buttons(scene)).toEqual([]);
  });
});
