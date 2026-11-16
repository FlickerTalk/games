import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { FIRST_MS, FLIP_MS, PLACE_MS, durationOf, planMove, turnedBy } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function board(rows, next) {
  return { cells: rows.join("").split("").map((mark) => (mark === "d" ? 0 : mark === "l" ? 1 : null)), next };
}

const FORCED_PASS = board(["........", "........", "........", ".d..d...", "l.......", ".d...l..", "........", "........"], 1);
const after = (state, move) => play(state, move, state.next).state;

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
  const paint = (options = {}) => scene.draw(recorder(), { size: 352, theme: themeFor(null), now: clock, still: false, ...options });
  return { scene, ctx, paint, tick: (ms) => (clock += ms), at: () => clock };
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

describe("the Reversi scene", () => {
  it("lays a named button over each of the 64 cells, in reading order, and counts the discs for a screen reader", () => {
    const { scene } = rig(initial());
    const buttons = scene.buttons({ size: 352 });
    expect(buttons).toHaveLength(64);
    expect(buttons.map((one) => one.key)).toEqual([...Array(64).keys()]);
    expect(buttons[27]).toMatchObject({ label: "Row 4, column 4: light", data: { cell: 27 } });
    expect(buttons[28].label).toBe("Row 4, column 5: dark");
    expect(buttons[0].label).toBe("Row 1, column 1: empty");
    expect(buttons[0].box.y).toBeLessThan(buttons[63].box.y);
    for (const { box } of buttons) expect(box.x + box.w).toBeLessThanOrEqual(1);
    expect(scene.label()).toBe("Board: 2 dark, 2 light");
  });

  it("opens and rings only the cells the user may play, and plays one with a tap", () => {
    const { scene, ctx } = rig(initial());
    expect(open(scene)).toEqual([19, 26, 37, 44]);
    expect(marked(scene, "can")).toEqual([19, 26, 37, 44]);
    expect(scene.view(1000).targets).toEqual([19, 26, 37, 44]);
    scene.press(19);
    expect(ctx.play).toHaveBeenCalledWith(19);
    scene.press(0);
    expect(ctx.play).toHaveBeenCalledTimes(1);
  });

  it("opens nothing out of turn or before the coin", () => {
    expect(open(rig(initial(), { canPlay: false }).scene)).toEqual([]);
    expect(open(rig(initial(), { mySide: null }).scene)).toEqual([]);
    expect(rig(initial(), { canPlay: false }).scene.view(1000).targets).toEqual([]);
  });

  it("pops the other side's disc in, turns the bracketed discs, then rests and rings the user's moves", () => {
    const { scene, ctx, paint, tick, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(initial(), 19), last: 19, canPlay: true });
    const placing = scene.view(at() + PLACE_MS / 2);
    expect(placing.placed).toMatchObject({ cell: 19 });
    expect(placing.placed.pop).toBeLessThan(1);
    expect(placing.flips[27]).toBe(0);
    expect(placing.targets).toEqual([]);
    expect(placing.last).toBeNull();
    expect(paint()).toBe(0);
    tick(FIRST_MS + FLIP_MS / 2);
    expect(scene.view(at()).flips[27]).toBeCloseTo(0.5, 6);
    expect(scene.view(at()).last).toBe(19);
    tick(2000);
    const rested = scene.view(at());
    expect(rested).toMatchObject({ placed: null, flips: {}, last: 19 });
    expect(rested.targets.length).toBeGreaterThan(0);
    expect(marked(scene, "last")).toEqual([19]);
    expect(marked(scene, "turned")).toEqual([27]);
    expect(paint()).toBeGreaterThan(0);
    expect(paint({ still: true })).toBeNull();
  });

  it("sounds each step of the turn as it shows, and the pass", () => {
    const { scene, ctx, paint, tick } = rig(FORCED_PASS, { mySide: 0, canPlay: false });
    const moved = after(FORCED_PASS, 18);
    scene.update({ ...ctx, state: moved, last: 18 });
    tick(FIRST_MS + FLIP_MS / 2);
    paint();
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["tick"]);
    tick(5000);
    paint();
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["tick", "whoosh"]);
  });

  it("shows the side that has to pass once the discs have turned, while the other plays on", () => {
    const { scene, ctx, at } = rig(FORCED_PASS, { mySide: 0, canPlay: false });
    const moved = after(FORCED_PASS, 18);
    scene.update({ ...ctx, state: moved, last: 18 });
    const plan = planMove(FORCED_PASS, moved, 18);
    expect(scene.view(at()).pass).toBeNull();
    expect(scene.view(at() + durationOf(plan) - 100).pass).toMatchObject({ side: 0 });
    expect(scene.view(at() + durationOf(plan)).pass).toBeNull();
    expect(scene.view(at(), { still: true }).pass).toMatchObject({ side: 0 });
  });

  it("lets a move that arrives while another is still turning wait for it, then shows it", () => {
    const { scene, ctx, at } = rig(initial(), { mySide: 0 });
    const one = after(initial(), 19);
    const two = after(one, 18);
    scene.update({ ...ctx, state: one, last: 19, canPlay: false });
    scene.update({ ...ctx, state: two, last: 18, canPlay: true });
    const first = planMove(initial(), one, 19);
    const early = scene.view(at() + PLACE_MS / 2);
    expect(early.cells).toEqual(one.cells);
    expect(early.placed.cell).toBe(19);
    const later = scene.view(at() + durationOf(first) + 10);
    expect(later.cells).toEqual(two.cells);
    expect(later.placed.cell).toBe(18);
  });

  it("cuts the sign of a pass short when the side that plays on moves, and shows that move at once", () => {
    const { scene, ctx, at, tick } = rig(FORCED_PASS, { mySide: 1 });
    const moved = after(FORCED_PASS, 18);
    scene.update({ ...ctx, state: moved, last: 18 });
    const plan = planMove(FORCED_PASS, moved, 18);
    const passing = at() + turnedBy(plan) + 200;
    expect(scene.view(passing).pass).toMatchObject({ side: 0 });
    const again = after(moved, 50);
    tick(passing - at());
    scene.update({ ...ctx, state: again, last: 50 });
    const now = scene.view(passing + 10);
    expect(now.pass).toBeNull();
    expect(now.placed).toMatchObject({ cell: 50 });
    expect(now.cells).toEqual(again.cells);
  });

  it("says nothing of a pass that never showed because the next move came first", () => {
    const { scene, ctx, paint, tick } = rig(FORCED_PASS, { mySide: 1 });
    const moved = after(FORCED_PASS, 18);
    scene.update({ ...ctx, state: moved, last: 18 });
    const again = after(moved, 50);
    tick(FIRST_MS);
    paint();
    scene.update({ ...ctx, state: again, last: 50 });
    for (let step = 0; step < 100; step += 1) {
      tick(50);
      paint();
    }
    const whooshes = ctx.sound.play.mock.calls.filter(([name]) => name === "whoosh").length;
    expect(whooshes).toBe(planMove(moved, again, 50).passed ? 1 : 0);
  });

  it("shows a new round or a match caught up all at once, without turning anything", () => {
    const { scene, ctx, at } = rig(initial());
    scene.update({ ...ctx, state: after(after(initial(), 19), 18), last: 18 });
    expect(scene.view(at())).toMatchObject({ placed: null, flips: {}, last: 18 });
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(initial(), 19), last: 19 });
    expect(scene.view(at(), { still: true })).toMatchObject({ placed: null, flips: {}, sparks: [], last: 19 });
  });

  it("marks a disc that waits for the other phone", () => {
    const { scene, ctx, at, tick } = rig(initial());
    scene.update({ ...ctx, state: after(initial(), 19), last: 19, canPlay: false, pending: true });
    expect(marked(scene, "pending")).toEqual([19]);
    tick(3000);
    expect(scene.view(at()).pending).toBe(19);
    scene.update({ ...ctx, state: after(initial(), 19), last: 19, canPlay: false, pending: false });
    expect(marked(scene, "pending")).toEqual([]);
    expect(scene.view(at()).pending).toBeNull();
  });
});
