import { describe, expect, it, vi } from "vitest";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { card } from "../src/card.js";
import { initial, play, turn } from "../src/rules.js";
import { createScene } from "../src/scene.js";
import { playing, spy, t, theme } from "./rig.js";

const SIZE = 343;
const RUMMY = { hands: [[1, 2, 3, 30, 31, 32, 40], [card(0, 4), card(0, 5), card(0, 6), 20, 21, 35, 50]], stock: [44, 45, 46], discard: [10], melds: [], step: "draw", took: null, turns: 0 };

function rig(state, extra = {}) {
  let clock = 1000;
  const ctx = { state, view: { me: "me", index: 0 }, mySide: 1, canPlay: turn(state) === 1 && !state.end, last: null, pending: false, t, play: vi.fn(), sound: { play: vi.fn() }, ...extra };
  const sprites = spy();
  const scene = createScene(ctx, { wake: vi.fn(), now: () => clock, sprites });
  const move = (text) => {
    const played = play(scene.ctx.state, text, turn(scene.ctx.state));
    scene.update({ ...scene.ctx, state: played.state, last: text, canPlay: turn(played.state) === 1 && !played.state.end });
  };
  const draw = (now = clock, still = false) => {
    sprites.drawn.length = 0;
    const pen = recorder();
    return { pen, next: scene.draw(pen, { size: SIZE, theme, now, still }), keys: sprites.drawn.map((one) => one.key) };
  };
  return { scene, ctx, sprites, move, draw, tick: (ms) => (clock += ms) };
}

describe("the scene of Card Corner", () => {
  it("shows the chooser until the cards are dealt, then the table of the chosen game", () => {
    const { scene } = rig(initial(), { mySide: 0, canPlay: true });
    expect(scene.label()).toBe("Card Corner: Choose a game");
    expect(scene.buttons({ size: SIZE }).map((one) => one.key)).toEqual(["pairs", "war", "rummy", "fish"]);
    scene.press("war");
    expect(scene.ctx.play).toHaveBeenCalledWith("gw");
    const table = rig(playing("rummy", RUMMY));
    expect(table.scene.label()).toMatch(/^Card Corner, Rummy: /);
    expect(table.scene.buttons({ size: SIZE }).some((one) => one.key === "stock")).toBe(true);
  });

  it("sets each game on its own table and draws it inside the board, the saves and restores balanced", () => {
    const felt = (state) => rig(state).draw().pen.calls.filter((call) => call.op === "set" && call.name === "fillStyle").map((call) => call.value);
    expect(felt(playing("rummy", RUMMY))).toContain(theme.tables.cloth.felt);
    expect(felt(playing("war", { piles: [[1], [2]], pot: [[], []], open: [[], []], up: [null, null], war: false, battles: 0, last: null }))).toContain(theme.tables.slate.felt);
    expect(felt(initial())).toContain(theme.tables.cloth.felt);
    expect(rig(playing("rummy", RUMMY)).draw().pen.depth).toBe(0);
  });

  it("keeps drawing while a card is on its way, with its sound, and rests when it has landed", () => {
    const { scene, move, draw, tick } = rig(playing("rummy", RUMMY));
    expect(draw().next).toBeNull();
    move("ds");
    expect(scene.ctx.sound.play).toHaveBeenCalledWith("cards-draw", { delay: 0 });
    const flying = draw();
    expect(flying.next).toBe(0);
    expect(flying.keys.filter((key) => key === "f46")).toHaveLength(0);
    tick(1000);
    const landed = draw();
    expect(landed.next).toBeNull();
    expect(landed.keys).toContain("f46");
  });

  it("shows the move at once where motion is reduced", () => {
    const { move, draw } = rig(playing("rummy", RUMMY));
    move("ds");
    const still = draw(undefined, true);
    expect(still.next).toBeNull();
    expect(still.keys).toContain("f46");
  });

  it("keeps the cards the player selected while they think, and forgets them when the table changes or the turn is not theirs", () => {
    const { scene, move } = rig(playing("rummy", { ...RUMMY, step: "play" }));
    scene.press(card(0, 4));
    scene.press("sort");
    expect(scene.local).toMatchObject({ selected: [card(0, 4)], order: "rank" });
    expect(scene.wake).toHaveBeenCalled();
    move(`x${card(0, 4)}`);
    expect(scene.local.selected).toEqual([]);
    expect(scene.local.order).toBe("rank");
  });

  it("puts a clock on the table while the user's move has not reached the other phone", () => {
    const quiet = rig(playing("rummy", RUMMY)).draw().pen.calls.length;
    const waiting = rig(playing("rummy", RUMMY), { pending: true }).draw().pen.calls.length;
    expect(waiting).toBeGreaterThan(quiet);
  });

  it("draws no card at all for someone who has no seat at the table", () => {
    const { draw, scene } = rig(playing("rummy", RUMMY), { mySide: null, canPlay: false });
    expect(draw().keys).toEqual([]);
    expect(scene.buttons({ size: SIZE })).toEqual([]);
    expect(scene.label()).toBe("Card Corner");
  });
});
