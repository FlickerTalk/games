import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { seeded } from "../../../kit/test/helpers.js";
import { Fleet, storeKey } from "../src/keeper.js";
import { BURST_AT, SPLASH_MS, TIP_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { DEFAULT_FLEET, commitText, honestAnswer, initial, parseFleet, play, result, revealText, shipCells, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const SALT = new Uint8Array(24).fill(0x5a);
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));
const PLACED = [commitText(SALT, DEFAULT_FLEET), commitText(SALT, DEFAULT_FLEET)];

function replay(moves, start = initial()) {
  return moves.reduce((state, move) => {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    return played.state;
  }, start);
}

function shooting(fleets, cells, start) {
  let state = start;
  for (const cell of cells) {
    const side = turn(state);
    state = replay([`${honestAnswer(state, side, fleets[side])}>${cell}`], state);
  }
  return state;
}

function keeper({ salt = SALT, ships = DEFAULT_FLEET, loaded = true } = {}) {
  const kept = new Map();
  const fleet = new Fleet({ get: async (key) => kept.get(key) ?? null, set: async (key, value) => (kept.set(key, value), true) });
  Object.assign(fleet, { salt, ships: ships.map((ship) => ({ ...ship })), loaded, kept });
  return fleet;
}

function context(state, extra = {}) {
  const over = result(state);
  return {
    state,
    view: { me: "me-1", round: { moves: [] } },
    mySide: turn(state),
    canPlay: !over,
    last: null,
    pending: false,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    notify: vi.fn(),
    sound: { play: vi.fn() },
    fleet: keeper(),
    ...extra,
  };
}

function rig(state, extra) {
  let clock = 1000;
  const ctx = context(state, extra);
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock, random: seeded(5) });
  return { scene, ctx, tick: (ms) => (clock += ms), at: () => clock };
}

const buttons = (scene) => scene.buttons({ size: 352 });
const sea = (scene) => buttons(scene).filter((one) => one.data.cell !== undefined);
const own = (scene) => buttons(scene).filter((one) => one.data.own !== undefined);
const keyed = (scene, key) => buttons(scene).find((one) => one.key === key);
const marked = (list, mark) => list.filter((one) => (one.data.mark ?? "").split(" ").includes(mark)).map((one) => one.data.cell ?? one.data.own);
const open = (scene) => sea(scene).filter((one) => !one.disabled).map((one) => one.key);
const sounds = (ctx) => ctx.sound.play.mock.calls.map(([name]) => name);
const painting = (scene, now, still = false) => {
  const pen = recorder();
  const next = scene.draw(pen, { size: 352, theme: themeFor(null), now, still });
  return { pen, next };
};
const hulls = (pen) => pen.calls.filter((call) => call.op === "quadraticCurveTo").length / 2;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("placing the fleet", () => {
  it("shows the user's own sea with its five ships, named for a screen reader, with shuffle and ready below", () => {
    const { scene, ctx } = rig(initial());
    expect(sea(scene)).toHaveLength(0);
    expect(own(scene)).toHaveLength(100);
    expect(marked(own(scene), "ship")).toHaveLength(17);
    expect(own(scene).every((one) => one.disabled)).toBe(true);
    expect(own(scene)[11].label).toBe("Row 2, column 2: ship");
    expect(own(scene)[0].label).toBe("Row 1, column 1: water");
    expect(keyed(scene, "shuffle")).toMatchObject({ label: "Shuffle", disabled: false, data: { act: "shuffle" } });
    expect(keyed(scene, "ready")).toMatchObject({ label: "Ready", disabled: false, data: { act: "ready" } });
    expect(scene.label()).toBe("Your sea: Place your five ships, then tap Ready. Your fleet stays on this phone.");
    expect(ctx.notify).toHaveBeenCalledWith("Place your five ships, then tap Ready. Your fleet stays on this phone.");
  });

  it("shuffles the fleet with a sound, then seals it, keeps it on this phone and hands the kit its commitment", async () => {
    const { scene, ctx } = rig(initial(), { fleet: keeper({ salt: null }) });
    const before = marked(own(scene), "ship");
    scene.press("shuffle");
    expect(marked(own(scene), "ship")).toHaveLength(17);
    expect(marked(own(scene), "ship")).not.toEqual(before);
    expect(sounds(ctx)).toEqual(["tap"]);
    scene.press("ready");
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const move = ctx.play.mock.calls[0][0];
    const kept = JSON.parse(ctx.fleet.kept.get(storeKey("me-1")));
    expect(commitText(fromBase64url(kept.salt), parseFleet(kept.fleet))).toBe(move);
    expect(ctx.notify).toHaveBeenLastCalledWith("Place your five ships, then tap Ready. Your fleet stays on this phone.");
    scene.update({ ...ctx, state: replay([move]), mySide: 0, canPlay: false });
    expect(ctx.notify).toHaveBeenLastCalledWith(null);
    scene.update({ ...ctx, state: replay([move]), mySide: 0, canPlay: false });
    expect(ctx.notify).toHaveBeenCalledTimes(2);
  });

  it("waits for the other fleet once sealed, the buttons gone, and closes them off turn or before the fleet is read back", () => {
    const sealed = rig(replay([PLACED[0]]), { mySide: 0, canPlay: false });
    expect(keyed(sealed.scene, "ready")).toBeUndefined();
    expect(sealed.scene.label()).toBe("Your sea: Waiting for the other fleet");
    expect(sealed.scene.view(1000).place.controls).toBeNull();
    expect(keyed(rig(initial(), { canPlay: false }).scene, "ready").disabled).toBe(true);
    const unread = rig(initial(), { fleet: keeper({ loaded: false }) });
    expect(keyed(unread.scene, "ready").disabled).toBe(true);
    unread.scene.press("ready");
    expect(unread.ctx.play).not.toHaveBeenCalled();
  });
});

describe("firing", () => {
  it("lays a button over each cell of the other side's sea, open where the user may still fire, and names what came back", () => {
    const state = shooting([DEFAULT_FLEET, DEFAULT_FLEET], [0, 11, 41, 12], replay(PLACED));
    const { scene } = rig(state);
    expect(sea(scene).map((one) => one.key)).toEqual([...Array(100).keys()]);
    expect(open(scene)).toHaveLength(98);
    expect(sea(scene)[0].label).toBe("Row 1, column 1: miss");
    expect(sea(scene)[41].label).toBe("Row 5, column 2: hit");
    expect(sea(scene)[5].label).toBe("Row 1, column 6: not fired at");
    expect(own(scene)[11].label).toBe("Row 2, column 2: hit");
    expect(marked(own(scene), "last")).toEqual([12]);
    expect(marked(sea(scene), "last")).toEqual([41]);
    expect(scene.label()).toBe("Their sea: 5 ships afloat · Your sea: 5 ships afloat");
    for (const { box } of buttons(scene)) expect(box.x >= 0 && box.y >= 0 && box.x + box.w <= 1 && box.y + box.h <= 1).toBe(true);
  });

  it("aims on the first tap, with a sound and a target to confirm, then fires with the honest answer to the other side's last shot", () => {
    const state = replay([...PLACED, ">11"]);
    const { scene, ctx } = rig(state);
    scene.press(45);
    expect(marked(sea(scene), "chosen")).toEqual([45]);
    expect(keyed(scene, "ghost")).toMatchObject({ label: "Fire at row 5, column 6", data: { ghost: 45 } });
    expect(keyed(scene, "ghost").box.w * 352).toBeGreaterThanOrEqual(44);
    expect(sounds(ctx)).toEqual(["tap"]);
    expect(ctx.play).not.toHaveBeenCalled();
    scene.press("ghost");
    expect(ctx.play).toHaveBeenCalledWith("h>45");
    const again = rig(state);
    again.scene.press(7);
    again.scene.press(7);
    expect(again.ctx.play).toHaveBeenCalledWith("h>7");
  });

  it("opens nothing off turn, before the fleet is read back, or when the fleet is no longer on this phone, and says so", () => {
    const state = replay([...PLACED, ">11"]);
    expect(open(rig(state, { canPlay: false }).scene)).toEqual([]);
    expect(open(rig(state, { fleet: keeper({ loaded: false }) }).scene)).toEqual([]);
    const lost = rig(state, { fleet: keeper({ salt: null }) });
    expect(open(lost.scene)).toEqual([]);
    lost.scene.press(45);
    expect(lost.ctx.play).not.toHaveBeenCalled();
    expect(lost.ctx.notify).toHaveBeenCalledWith(expect.stringContaining("no longer on this phone"));
  });

  it("marks a shot still on its way to the other phone", () => {
    const state = replay([...PLACED, ">11", "h>45"]);
    const { scene } = rig(state, { mySide: 1, canPlay: false, pending: true, last: "h>45" });
    expect(marked(sea(scene), "pending")).toEqual([45]);
    expect(marked(sea(scene), "last")).toEqual([45]);
  });
});

describe("what the user may see of the other side", () => {
  it("draws the other side's waters only from the answers: two fleets that answered alike look alike", () => {
    const shots = [0, 0, 41, 41, 99, 99, 51, 51, 3];
    const one = rig(shooting([DEFAULT_FLEET, DEFAULT_FLEET], shots, replay(PLACED)), { mySide: 0, canPlay: false });
    const two = rig(shooting([DEFAULT_FLEET, OTHER], shots, replay(PLACED)), { mySide: 0, canPlay: false });
    expect(two.ctx.state.answers).toEqual(one.ctx.state.answers);
    expect(buttons(two.scene)).toEqual(buttons(one.scene));
    expect(painting(two.scene, 5000).pen.calls).toEqual(painting(one.scene, 5000).pen.calls);
    expect(hulls(painting(one.scene, 5000).pen)).toBe(5);
  });

  it("shows a boat of the other side once it is said to be sunk, and the rest of its fleet only when the round is done", () => {
    const targets = [21, 22, 23, 24, 25, 41, 51, 61, 71, 46, 47, 48, 68, 78, 83, 84, 85];
    const water = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21];
    const fired = shooting([OTHER, DEFAULT_FLEET], targets.flatMap((cell, at) => [water[at], cell]), replay([commitText(SALT, OTHER), PLACED[1]]));
    const ended = replay([honestAnswer(fired, 0, OTHER), revealText(SALT, DEFAULT_FLEET), revealText(SALT, OTHER)], fired);
    const winner = rig(ended, { mySide: 1, canPlay: false });
    expect(hulls(painting(winner.scene, 9000).pen)).toBe(10);
    expect(marked(sea(winner.scene), "sunk")).toHaveLength(17);
    const loser = rig(ended, { mySide: 0, canPlay: false, fleet: keeper({ ships: OTHER }) });
    expect(marked(sea(loser.scene), "ship")).toHaveLength(17);
    expect(sea(loser.scene)[11].label).toBe("Row 2, column 2: ship");
    const midway = rig(replay([honestAnswer(fired, 0, OTHER), revealText(SALT, DEFAULT_FLEET)], fired), { mySide: 0, canPlay: false, fleet: keeper({ ships: OTHER }) });
    expect(marked(sea(midway.scene), "ship")).toEqual([]);
    expect(hulls(painting(midway.scene, 9000).pen)).toBe(5);
  });
});

describe("the answers coming back", () => {
  it("splashes a miss, paints a hit and lets a found boat laugh, each with its sound, then rests", () => {
    const state = replay([...PLACED, ">58"]);
    const { scene, ctx, at, tick: wait } = rig(state, { mySide: 0, canPlay: false });
    const answered = replay(["h>0"], state);
    scene.update({ ...ctx, state: answered, mySide: 0, canPlay: true });
    expect(painting(scene, at() + SPLASH_MS / 2).next).toBe(0);
    expect(sounds(ctx)).toEqual(["tick"]);
    wait(SPLASH_MS + 1);
    expect(painting(scene, at()).next).toBeNull();

    const shot = replay(["m>68"], answered);
    scene.update({ ...ctx, state: shot, mySide: 0, canPlay: false });
    const sunk = replay(["s58v2>1"], shot);
    scene.update({ ...ctx, state: sunk, mySide: 0, canPlay: true });
    const view = scene.view(at() + BURST_AT + 100);
    expect(view.theirs.effects).toEqual([expect.objectContaining({ cell: 68, kind: "s", ship: { start: 58, o: "v", len: 2 } })]);
    expect(view.mine.effects).toEqual([expect.objectContaining({ cell: 1, kind: "m" })]);
    painting(scene, at() + 200);
    expect(sounds(ctx)).toEqual(["tick", "success"]);
    expect(painting(scene, at() + TIP_MS - 10).next).toBe(0);
    expect(painting(scene, at() + TIP_MS + 1000).next).toBeNull();
  });

  it("shows the result of the other side's shot on the user's own sea at once, and moves nothing for someone who asked for less motion", () => {
    const state = replay([...PLACED, ">0"]);
    const mine = rig(state, { mySide: 1, canPlay: false });
    mine.scene.update({ ...mine.ctx, state: replay(["m>11"], state), mySide: 1, canPlay: false });
    expect(mine.scene.view(mine.at()).mine.effects).toEqual([]);
    const theirs = rig(state, { mySide: 0, canPlay: false });
    theirs.scene.update({ ...theirs.ctx, state: replay(["m>11"], state), mySide: 0, canPlay: true });
    expect(theirs.scene.view(theirs.at()).mine.effects).toEqual([expect.objectContaining({ cell: 11, kind: "h" })]);
    expect(own(theirs.scene)[11].label).toBe("Row 2, column 2: hit");
    expect(painting(theirs.scene, theirs.at(), true).next).toBeNull();
    expect(theirs.scene.view(theirs.at(), { still: true }).mine.effects).toEqual([]);
  });
});

describe("the steps the board takes on its own", () => {
  it("answers the shot that sinks its last ship by itself, then reveals its fleet, each once", () => {
    const targets = DEFAULT_FLEET.flatMap(shipCells);
    const water = [...Array(100).keys()].reverse().filter((cell) => !targets.includes(cell));
    const fired = shooting([DEFAULT_FLEET, DEFAULT_FLEET], targets.flatMap((cell, at) => [water[at], cell]), replay(PLACED));
    expect(turn(fired)).toBe(0);
    const { scene, ctx } = rig(fired, { mySide: 0 });
    const last = honestAnswer(fired, 0, DEFAULT_FLEET);
    expect(ctx.play).toHaveBeenCalledWith(last);
    scene.update({ ...ctx });
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const revealing = replay([last, revealText(SALT, DEFAULT_FLEET)], fired);
    scene.update({ ...ctx, state: revealing, mySide: 0, canPlay: true });
    expect(ctx.play).toHaveBeenLastCalledWith(revealText(SALT, DEFAULT_FLEET));
    expect(ctx.play).toHaveBeenCalledTimes(2);
  });
});
