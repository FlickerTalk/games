import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { CAPTURE_MS, SEED_MS, SPARKLE_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, result, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function stateAfter(moves, from = initial()) {
  return moves.reduce((state, move) => play(state, move, turn(state)).state, from);
}

function context(moves, extra = {}) {
  const state = stateAfter(moves, extra.from);
  return {
    state,
    mySide: turn(state),
    canPlay: !result(state),
    last: moves.at(-1) ?? null,
    pending: false,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    sound: { play: vi.fn() },
    view: { round: { moves } },
    ...extra,
  };
}

function rig(moves, extra) {
  let clock = 1000;
  const ctx = context(moves, extra);
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock });
  const move = (more, change = {}) => scene.update(context(more, { mySide: ctx.mySide, canPlay: false, sound: ctx.sound, play: ctx.play, ...change }));
  return { scene, ctx, move, tick: (ms) => (clock += ms), at: () => clock };
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
const sounds = (ctx) => ctx.sound.play.mock.calls.map(([name]) => name);

describe("the mancala scene", () => {
  it("lays a named button over every pit and store, the user's pits along the bottom from the left", () => {
    const { scene } = rig([]);
    const buttons = scene.buttons({ size: 352 });
    expect(buttons.map((one) => one.key)).toEqual([13, 12, 11, 10, 9, 8, 7, 0, 1, 2, 3, 4, 5, 6]);
    const find = (key) => buttons.find((one) => one.key === key);
    expect(find(0)).toMatchObject({ label: "Your pit 1: 4 seeds", disabled: false, data: { pit: 0, move: 0, mark: "can" } });
    expect(find(7)).toMatchObject({ label: "Their pit 1: 4 seeds", disabled: true, data: { pit: 7, move: null, mark: null } });
    expect(find(6)).toMatchObject({ label: "Your store: 0 seeds", disabled: true, data: { store: 0 } });
    expect(find(13)).toMatchObject({ label: "Their store: 0 seeds", disabled: true, data: { store: 1 } });
    expect(find(0).box.y).toBeGreaterThan(find(7).box.y);
    for (const { box } of buttons) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.y + box.h).toBeLessThanOrEqual(1);
    }
    expect(scene.label()).toBe("Board: 0 seeds to 0");
  });

  it("opens the user's pits that hold seeds on their turn, and sows one with a single tap", () => {
    const { scene, ctx } = rig([5], { mySide: 1 });
    const again = rig([2]);
    expect(open(again.scene)).toEqual([0, 1, 3, 4, 5]);
    again.scene.press(2);
    expect(again.ctx.play).not.toHaveBeenCalled();
    again.scene.press(3);
    expect(again.ctx.play).toHaveBeenCalledWith(3);
    expect(open(scene)).toEqual([7, 8, 9, 10, 11, 12]);
    scene.press(9);
    expect(ctx.play).toHaveBeenCalledWith(2);
  });

  it("turns the board for the second side, its pits along the bottom and its store on the right, and opens nothing out of turn", () => {
    const { scene } = rig([], { mySide: 1, canPlay: false });
    const buttons = scene.buttons({ size: 352 });
    expect(buttons.map((one) => one.key)).toEqual([6, 5, 4, 3, 2, 1, 0, 7, 8, 9, 10, 11, 12, 13]);
    expect(buttons.find((one) => one.key === 7)).toMatchObject({ label: "Your pit 1: 4 seeds", data: { move: 0 } });
    expect(buttons.find((one) => one.key === 0).label).toBe("Their pit 1: 4 seeds");
    expect(open(scene)).toEqual([]);
    scene.press(7);
    expect(scene.ctx.play).not.toHaveBeenCalled();
  });

  it("sows the other side's move seed by seed, its pits counting as they land, then rests", () => {
    const { scene, move, at } = rig([], { mySide: 1, canPlay: false });
    move([0], { canPlay: true });
    const going = scene.view(at() + SEED_MS * 1.5);
    expect(going.hop).toEqual({ from: 1, to: 2, progress: 0.5 });
    expect(going.pits.slice(0, 5)).toEqual([0, 5, 4, 4, 4]);
    expect(going.counts.slice(0, 2)).toEqual(["0", "5"]);
    expect(going.open).toEqual([]);
    expect(going.active).toBe(0);
    expect(going.last).toBeNull();
    expect(paint(scene, at() + SEED_MS * 1.5)).toBe(0);
    const rested = scene.view(at() + SEED_MS * 4);
    expect(rested).toMatchObject({ hop: null, last: 0, active: 1, open: [7, 8, 9, 10, 11, 12] });
    expect(paint(scene, at() + SEED_MS * 4)).toBeNull();
  });

  it("lets a move that arrives while seeds are still travelling wait for them", () => {
    const { scene, move, at } = rig([], { mySide: 1, canPlay: false });
    move([2]);
    move([2, 0]);
    expect(scene.view(at() + SEED_MS * 0.5).hop).toMatchObject({ from: 2, to: 3 });
    const second = at() + SEED_MS * 4 + SPARKLE_MS;
    const waiting = scene.view(second - 1);
    expect(waiting.hop).toBeNull();
    expect(waiting.pits.slice(0, 7)).toEqual([4, 4, 0, 5, 5, 5, 1]);
    expect(scene.view(second + SEED_MS * 0.5)).toMatchObject({ hop: { from: 0, to: 1 }, pits: [0, 4, 0, 5, 5, 5, 1, 4, 4, 4, 4, 4, 4, 0] });
  });

  it("flies a capture into the store and sounds each seed, the store, an extra turn and a capture", () => {
    const from = { pits: [0, 0, 0, 0, 0, 10, 0, 1, 1, 1, 1, 1, 1, 0], next: 0 };
    const { scene, ctx, move, at } = rig([], { from, mySide: 1, canPlay: false });
    move([5], { from });
    const travel = SEED_MS * 10;
    expect(scene.view(at() + travel + CAPTURE_MS / 2).capture).toEqual({ landing: 2, across: 10, store: 6, seeds: 3, side: 0, progress: 0.5 });
    paint(scene, at() + travel + CAPTURE_MS / 2);
    expect(sounds(ctx)).toEqual(["pick", "tick", "tick", "tick", "tick", "tick", "tick", "tick", "tick", "tick", "collect"]);
    const extra = rig([], { mySide: 1, canPlay: false });
    extra.move([2]);
    paint(extra.scene, extra.at() + SEED_MS * 4 + 10);
    expect(sounds(extra.ctx)).toEqual(["tick", "tick", "tick", "pick", "success"]);
    expect(extra.scene.view(extra.at() + SEED_MS * 4 + SPARKLE_MS / 2).sparkle).toMatchObject({ store: 6, side: 0 });
  });

  it("moves nothing for someone who asked the phone for less motion, and never repeats a sound", () => {
    const { scene, ctx, move, at } = rig([], { mySide: 1, canPlay: false });
    move([0]);
    expect(scene.view(at() + SEED_MS, { still: true }).hop).toBeNull();
    expect(paint(scene, at() + SEED_MS, true)).toBeNull();
    const twice = rig([], { mySide: 1, canPlay: false });
    twice.move([0]);
    paint(twice.scene, twice.at() + SEED_MS * 2);
    paint(twice.scene, twice.at() + SEED_MS * 2);
    expect(sounds(twice.ctx)).toEqual(["tick", "tick"]);
    expect(sounds(ctx)).toEqual([]);
  });

  it("marks the pit last sown from, whoever sowed it, and a move that waits for the other phone", () => {
    const { scene, move } = rig([], { mySide: 0 });
    move([2], { mySide: 0, pending: true });
    expect(marked(scene, "last")).toEqual([2]);
    expect(marked(scene, "pending")).toEqual([2]);
    move([2, 0], { mySide: 0 });
    expect(marked(scene, "last")).toEqual([0]);
    expect(marked(scene, "pending")).toEqual([]);
    move([2, 0, 3], { mySide: 0 });
    expect(marked(scene, "last")).toEqual([10]);
  });

  it("writes the counts in the user's own digits, and keeps the labels' numbers", () => {
    const { scene } = rig([], { lang: "ar", t: (key, vars) => translate("ar", key, vars) });
    expect(scene.view(1000).counts[0]).toBe(new Intl.NumberFormat("ar").format(4));
  });
});
