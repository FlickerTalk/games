import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { HIT_MS, MOVE_MS, PASS_MS, ROLL_MS, SHAKE_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { POINTS, initial, play } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));

function position(places, { bar = [0, 0], off = [0, 0], next = 0, dice = null } = {}) {
  const state = initial();
  state.points = Array.from({ length: POINTS }, () => [0, 0]);
  for (const [point, side, count] of places) state.points[point][side] = count;
  Object.assign(state, { bar, off, next });
  if (dice) Object.assign(state, { dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice] });
  return state;
}

const OPENING = { ...initial(), dice: [3, 1], left: [3, 1], rolls: 1 };
const HITTING = position([[7, 0, 3], [4, 1, 1], [10, 0, 2], [20, 1, 14]], { dice: [3, 5] });
const ON_BAR = position([[5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] });
const BEARING = position([[0, 0, 13], [3, 0, 2], [18, 1, 15]], { dice: [6, 2] });
const STUCK = position([[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [4, 0, 2], [5, 0, 2], [20, 0, 3], [11, 1, 14]], { bar: [0, 1], next: 1, dice: [6, 2] });

function context(state, extra = {}) {
  return {
    state,
    view: { index: 0, round: { moves: [] } },
    mySide: state.next,
    canPlay: true,
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

const after = (state, move) => play(state, move, state.next).state;
const buttons = (scene) => scene.buttons({ size: 352 });
const marked = (scene, mark) => buttons(scene).filter((one) => (one.data.mark ?? "").split(" ").includes(mark)).map((one) => one.key);
const open = (scene) => buttons(scene).filter((one) => !one.disabled).map((one) => one.key);
const sorted = (keys) => [...keys].sort((a, b) => String(a).localeCompare(String(b), "en", { numeric: true }));
const drawAt = (scene, now, still = false) => scene.draw(recorder(), { size: 352, theme: themeFor(null), now, still });
const sounds = (ctx) => ctx.sound.play.mock.calls.map(([name]) => name);

describe("the backgammon scene", () => {
  it("lays a named button over each point, the bar and the trays, in reading order from the user's seat", () => {
    const { scene } = rig(OPENING);
    const all = buttons(scene);
    expect(all.map((one) => one.key)).toEqual([12, 13, 14, 15, 16, 17, "their-bar", 18, 19, 20, 21, 22, 23, "their-off", 11, 10, 9, 8, 7, 6, "bar", 5, 4, 3, 2, 1, 0, "off"]);
    expect(all[0]).toMatchObject({ label: "Point 13: 5 checkers yours", data: { point: 12 } });
    expect(all.find((one) => one.key === 0).label).toBe("Point 1: 2 checkers theirs");
    expect(all.find((one) => one.key === 1).label).toBe("Point 2: empty");
    expect(all.find((one) => one.key === "bar")).toMatchObject({ label: "Bar: 0 on it", data: { point: "b" } });
    expect(all.find((one) => one.key === "their-off")).toMatchObject({ label: "Borne off: 0", data: { tray: 1 }, disabled: true });
    for (const { box } of all) expect(box.x + box.w).toBeLessThanOrEqual(1);
    expect(all[0].box.y).toBeLessThan(all.at(-1).box.y);
    expect(scene.label()).toBe("Backgammon · Dice: 3 and 1");
  });

  it("opens the points a checker may leave, then where the chosen one may go, and plays the move", () => {
    const { scene, ctx } = rig(OPENING);
    expect(sorted(open(scene))).toEqual([5, 7, 12, 23]);
    expect(sorted(marked(scene, "can"))).toEqual([5, 7, 12, 23]);
    expect(sorted(buttons(scene).filter((one) => one.data.from !== undefined && one.data.from !== null).map((one) => one.key))).toEqual([5, 7, 12, 23]);
    scene.press(7);
    expect(marked(scene, "from")).toEqual([7]);
    expect(sorted(marked(scene, "to"))).toEqual([4, 6]);
    expect(buttons(scene).find((one) => one.key === 4)).toMatchObject({ label: "Move to point 5", data: { to: 4 } });
    expect(ctx.sound.play).toHaveBeenCalledWith("bg-pick");
    scene.press(4);
    expect(ctx.play).toHaveBeenCalledWith("m7-4");
  });

  it("puts a chosen checker back on a second tap, swaps it for another, and, once one is chosen, offers only where it may go", () => {
    const { scene } = rig(BEARING);
    scene.press(3);
    expect(buttons(scene).filter((one) => one.data.from !== undefined && one.data.from !== null)).toEqual([]);
    expect(buttons(scene).filter((one) => one.data.to !== undefined && one.data.to !== null).map((one) => one.key)).toEqual([1, "off"]);
    expect(buttons(scene).find((one) => one.key === "off")).toMatchObject({ label: "Bear off", disabled: false, data: { tray: 0, to: "o" } });
    scene.press(3);
    expect(marked(scene, "from")).toEqual([]);
    scene.press(3);
    scene.press("off");
    expect(scene.ctx.play).toHaveBeenCalledWith("m3-o");
  });

  it("enters a checker from the bar, onto a point where one of the user's own checkers waits", () => {
    const { scene, ctx } = rig(ON_BAR);
    expect(marked(scene, "can")).toEqual(["bar"]);
    expect(sorted(open(scene))).toEqual([5, "bar"]);
    expect(buttons(scene).find((one) => one.key === "bar")).toMatchObject({ label: "Bar: 1 on it", data: { point: "b", from: "b" } });
    scene.press("bar");
    expect(sorted(marked(scene, "to"))).toEqual([21, 23]);
    scene.press(21);
    expect(ctx.play).toHaveBeenCalledWith("mb-21");
    const waiting = rig(position([[21, 0, 1], [5, 0, 13], [11, 1, 14], [20, 1, 1]], { bar: [1, 0], dice: [3, 1] }));
    waiting.scene.press("bar");
    waiting.scene.press(21);
    expect(waiting.ctx.play).toHaveBeenCalledWith("mb-21");
    expect(waiting.scene.view(waiting.at()).shakes).toEqual([]);
  });

  it("answers a tap on a checker that cannot move now with one small shake of that checker, and nothing else", () => {
    const { scene, ctx, at } = rig(ON_BAR);
    const blocked = buttons(scene).find((one) => one.key === 5);
    expect(blocked.disabled).toBe(false);
    expect(blocked.data.from).toBeNull();
    scene.press(5);
    expect(ctx.play).not.toHaveBeenCalled();
    expect(marked(scene, "from")).toEqual([]);
    expect(sounds(ctx)).toEqual([]);
    expect(scene.view(at() + SHAKE_MS / 4).shakes).toEqual([{ place: 5, offset: expect.any(Number) }]);
    expect(scene.view(at() + SHAKE_MS / 4).shakes[0].offset).not.toBe(0);
    expect(drawAt(scene, at() + SHAKE_MS / 4)).toBe(0);
    expect(scene.view(at() + SHAKE_MS).shakes).toEqual([]);
    expect(scene.view(at() + SHAKE_MS / 4, { still: true }).shakes).toEqual([]);
  });

  it("turns the table for the side that moves the other way round, and opens nothing out of turn", () => {
    const { scene } = rig(OPENING, { mySide: 1, canPlay: false });
    const keys = buttons(scene).map((one) => one.key);
    expect(keys.slice(0, 6)).toEqual([11, 10, 9, 8, 7, 6]);
    expect(keys.at(-2)).toBe(23);
    expect(open(scene)).toEqual([]);
    expect(buttons(scene).filter((one) => one.data.drag)).toEqual([]);
  });

  it("offers a pass only when the dice allow no move", () => {
    const { scene, ctx } = rig(STUCK);
    const pass = buttons(scene).find((one) => one.key === "pass");
    expect(pass).toMatchObject({ label: "No move: pass", disabled: false, data: { act: "pass" } });
    scene.press("pass");
    expect(ctx.play).toHaveBeenCalledWith("x");
    expect(buttons(rig(OPENING).scene).find((one) => one.key === "pass")).toBeUndefined();
  });

  it("shows the other side's checker travelling, and the next roll only once it has landed", () => {
    const { scene, ctx, at } = rig(HITTING, { mySide: 1, canPlay: false });
    const moved = after(HITTING, "m10-5");
    scene.update({ ...ctx, state: moved, last: "m10-5" });
    const done = after(moved, "m10-7");
    scene.update({ ...ctx, state: done, last: "m10-7" });
    const rolled = { ...done, dice: [4, 2], left: [4, 2], rolls: 2 };
    scene.update({ ...ctx, state: rolled, last: "rAAAA", canPlay: true });
    const first = scene.view(at() + MOVE_MS / 2);
    expect(first.flying).toEqual([expect.objectContaining({ side: 0, from: expect.objectContaining({ place: 10 }), to: expect.objectContaining({ place: 5 }), progress: 0.5 })]);
    expect(first.dice).toMatchObject({ side: 0, faces: [3, 5], used: [false, true] });
    expect(first.sources).toEqual([]);
    const second = scene.view(at() + MOVE_MS * 1.5);
    expect(second.flying[0]).toMatchObject({ from: expect.objectContaining({ place: 10 }), to: expect.objectContaining({ place: 7 }) });
    expect(second.dice.used).toEqual([true, true]);
    const tumbling = scene.view(at() + MOVE_MS * 2 + ROLL_MS / 2);
    expect(tumbling.flying).toEqual([]);
    expect(tumbling.dice).toMatchObject({ side: 1, faces: [4, 2], tumble: 0.5 });
    expect(drawAt(scene, at() + MOVE_MS * 2 + ROLL_MS / 2)).toBe(0);
    const rested = scene.view(at() + MOVE_MS * 2 + ROLL_MS + 1);
    expect(rested.dice).toMatchObject({ faces: [4, 2], tumble: null });
    expect(rested.sources.length).toBeGreaterThan(0);
  });

  it("hits a lone checker, which goes to the bar once the mover has landed, each with its sound", () => {
    const { scene, ctx, at } = rig(HITTING, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(HITTING, "m7-4"), last: "m7-4" });
    const travelling = scene.view(at() + MOVE_MS / 2);
    expect(travelling.points[4]).toEqual([0, 1]);
    expect(travelling.bar).toEqual([0, 0]);
    drawAt(scene, at() + MOVE_MS / 2);
    expect(sounds(ctx)).toEqual([]);
    const hitting = scene.view(at() + MOVE_MS + HIT_MS / 2);
    expect(hitting.points[4]).toEqual([1, 0]);
    expect(hitting.flying).toEqual([expect.objectContaining({ side: 1, from: expect.objectContaining({ place: 4 }), to: expect.objectContaining({ place: "b" }) })]);
    expect(hitting.hitRing).toMatchObject({ place: 4, progress: 0.5 });
    drawAt(scene, at() + MOVE_MS + HIT_MS / 2);
    expect(sounds(ctx)).toEqual(["bg-hit"]);
    expect(scene.view(at() + MOVE_MS + HIT_MS).bar).toEqual([0, 1]);
  });

  it("holds the crossed dice of a side that cannot move for a moment before it passes", () => {
    const { scene, ctx, at } = rig(STUCK, { mySide: 0, canPlay: false });
    scene.update({ ...ctx, state: after(STUCK, "x"), last: "x" });
    expect(scene.view(at() + PASS_MS / 2).dice).toMatchObject({ side: 1, faces: [6, 2], used: [true, true] });
    expect(scene.view(at() + PASS_MS + 1).dice).toMatchObject({ waiting: true });
  });

  it("moves nothing, and sounds at once, for someone who asked the phone for less motion", () => {
    const ctx = context(HITTING, { mySide: 1, canPlay: false });
    const scene = createScene(ctx, { wake: vi.fn(), now: () => 1000, still: () => true });
    scene.update({ ...ctx, state: after(HITTING, "m7-4"), last: "m7-4" });
    expect(scene.view(1000, { still: true }).flying).toEqual([]);
    expect(sounds(ctx)).toEqual(["bg-hit"]);
    expect(drawAt(scene, 1000, true)).toBeNull();
  });

  it("starts a new round without walking its checkers, and drops what it cannot follow move by move", () => {
    const { scene, ctx, at } = rig(HITTING, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(HITTING, "m10-5"), last: "m10-5", view: { index: 1, round: { moves: [] } } });
    expect(scene.view(at()).flying).toEqual([]);
    scene.update({ ...ctx, state: after(after(HITTING, "m10-5"), "m10-7"), last: "m10-7", view: { index: 1, round: { moves: [] } } });
    scene.update({ ...ctx, state: OPENING, last: "m7-4", view: { index: 1, round: { moves: [] } } });
    expect(scene.view(at()).flying).toEqual([]);
    expect(scene.view(at()).points[12]).toEqual([5, 0]);
  });

  it("marks the checker moves of the last turn, and the one that waits for the other phone", () => {
    const moves = ["cA", "sB", "rC", "m7-4", "m5-4"];
    const state = after(after(OPENING, "m7-4"), "m5-4");
    const { scene } = rig(state, { mySide: 0, canPlay: false, pending: true, last: "m5-4", view: { index: 0, round: { moves } } });
    expect(sorted(marked(scene, "last"))).toEqual([4, 5, 7]);
    expect(marked(scene, "pending")).toEqual([4]);
    const shown = scene.view(1000);
    expect(shown.last).toEqual([{ from: 7, to: 4, side: 0 }, { from: 5, to: 4, side: 0 }]);
    expect(shown.pending).toBe(4);
  });

  it("lets a finger carry a checker, lands one dropped without walking it again, and sends back one let go elsewhere", () => {
    const { scene, ctx, at, tick } = rig(OPENING);
    expect(scene.canDrag(7)).toBe(true);
    expect(scene.canDrag(0)).toBe(false);
    expect(sorted(scene.dropTargets(7))).toEqual([4, 6]);
    scene.dragAt(7, { x: 200, y: 160 });
    expect(scene.view(at()).floating).toMatchObject({ side: 0, x: 200, y: 160 });
    expect(scene.view(at()).points[7]).toEqual([2, 0]);
    scene.dragAt(7, null);
    scene.drop(7, 4);
    expect(ctx.play).toHaveBeenCalledWith("m7-4");
    scene.update({ ...ctx, state: after(OPENING, "m7-4"), last: "m7-4" });
    expect(scene.view(at()).flying).toEqual([]);
    expect(scene.view(at()).floating).toBeNull();

    const other = rig(OPENING);
    other.scene.dragAt(12, { x: 100, y: 100 });
    other.scene.dragAt(12, null);
    expect(other.scene.view(other.at()).floating).toMatchObject({ x: 100, y: 100 });
    other.tick(1000);
    expect(other.scene.view(other.at()).floating).toBeNull();
    tick(0);
  });

  it("asks for frames while something moves or the chosen checker pulses, and rests otherwise", () => {
    const { scene, at } = rig(OPENING, { canPlay: false });
    expect(drawAt(scene, at())).toBeNull();
    const chosen = rig(OPENING);
    chosen.scene.press(7);
    expect(drawAt(chosen.scene, chosen.at())).toBeGreaterThan(0);
    expect(drawAt(chosen.scene, chosen.at())).toBeLessThanOrEqual(1000 / 6);
    const waiting = rig({ ...OPENING, dice: null, left: [] }, { canPlay: false });
    expect(drawAt(waiting.scene, waiting.at())).toBeGreaterThan(0);
  });
});
