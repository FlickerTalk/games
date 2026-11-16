import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { BURST_MS, MOVE_MS, SHAKE_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { initial, play, turn } from "../src/rules.js";
import { cellOf } from "../src/squares.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const after = (moves, from = initial()) => moves.reduce((state, move) => play(state, move, turn(state)).state, from);
const TO_PROMOTE = "a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" ");
const TO_CASTLE = "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5".split(" ");

function context(state, extra = {}) {
  return {
    state,
    mySide: turn(state),
    canPlay: !state.end,
    last: null,
    pending: false,
    result: null,
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
    .buttons({ size: 320 })
    .filter((button) => (button.data.mark ?? "").split(" ").includes(mark))
    .map((button) => button.key)
    .sort();
const open = (scene) =>
  scene
    .buttons({ size: 320 })
    .filter((button) => !button.disabled)
    .map((button) => button.key)
    .sort();
const paint = (scene, now) => scene.draw(recorder(), { size: 320, theme: themeFor(null), now, still: false });

describe("the chess scene", () => {
  it("lays a named button over each square in reading order, the user's own pieces at the bottom", () => {
    const { scene } = rig(initial());
    const buttons = scene.buttons({ size: 320 });
    expect(buttons).toHaveLength(64);
    expect(buttons[0]).toMatchObject({ key: "a8", label: "a8: Rook (black)", data: { square: "a8", piece: "br" } });
    expect(buttons.at(-1)).toMatchObject({ key: "h1", label: "h1: Rook (white)", data: { piece: "wr" } });
    expect(buttons.find((one) => one.key === "e4")).toMatchObject({ label: "e4: empty", data: { piece: null } });
    expect(buttons[0].box.y).toBeLessThan(buttons.at(-1).box.y);
    for (const { box } of buttons) {
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.y + box.h).toBeLessThanOrEqual(1);
    }
    expect(scene.label()).toBe("Chessboard");
  });

  it("turns the board for black, and opens nothing out of turn", () => {
    const { scene } = rig(initial(), { mySide: 1, canPlay: false });
    const buttons = scene.buttons({ size: 320 });
    expect(buttons[0].key).toBe("h1");
    expect(buttons.at(-1).key).toBe("a8");
    expect(open(scene)).toEqual([]);
    expect(buttons.filter((one) => one.data.drag)).toEqual([]);
  });

  it("opens the user's pieces, shows where the chosen one may go, and plays the move", () => {
    const { scene, ctx } = rig(initial());
    expect(marked(scene, "can")).toEqual(["a2", "b1", "b2", "c2", "d2", "e2", "f2", "g1", "g2", "h2"]);
    expect(open(scene)).toHaveLength(16);
    scene.press("e2");
    expect(marked(scene, "from")).toEqual(["e2"]);
    expect(marked(scene, "to")).toEqual(["e3", "e4"]);
    expect(open(scene)).toEqual(expect.arrayContaining(["e3", "e4"]));
    expect(ctx.sound.play).toHaveBeenCalledWith("chess-pick");
    scene.press("g1");
    expect(marked(scene, "to")).toEqual(["f3", "h3"]);
    scene.press("g1");
    expect(marked(scene, "from")).toEqual([]);
    scene.press("e2");
    scene.press("e4");
    expect(ctx.play).toHaveBeenCalledWith("e2e4");
  });

  it("shakes a piece that cannot move, briefly, and plays nothing", () => {
    const { scene, ctx, at, tick } = rig(initial());
    scene.press("a1");
    expect(ctx.play).not.toHaveBeenCalled();
    expect(scene.view(at() + SHAKE_MS / 4).shakes.map((one) => one.cell)).toEqual([cellOf("a1")]);
    expect(paint(scene, at() + SHAKE_MS / 4)).toBe(0);
    tick(SHAKE_MS + 1);
    expect(scene.view(at()).shakes).toEqual([]);
    expect(paint(scene, at())).toBeNull();
  });

  it("rings a piece that may be taken", () => {
    const { scene } = rig(after(["e2e4", "d7d5"]));
    scene.press("e4");
    expect(marked(scene, "take")).toEqual(["d5"]);
    expect(marked(scene, "to")).toEqual(["d5", "e5"]);
  });

  it("asks which piece a pawn becomes, in the user's language, plays the one picked, and lets the choice go", () => {
    const { scene, ctx } = rig(after(TO_PROMOTE), { lang: "es", t: (key, vars) => translate("es", key, vars) });
    scene.press("b7");
    scene.press("a8");
    expect(ctx.play).not.toHaveBeenCalled();
    const choice = scene.buttons({ size: 320 });
    expect(choice.map((one) => one.label)).toEqual(["Cancelar", "Dama", "Torre", "Alfil", "Caballo"]);
    expect(choice[0].box).toMatchObject({ x: 0, y: 0, w: 1, h: 1 });
    expect(scene.label()).toBe("Coronar el peón como");
    expect(scene.view(1000).promoting).toBe(0);
    scene.press("cancel");
    expect(scene.buttons({ size: 320 })).toHaveLength(64);
    expect(ctx.play).not.toHaveBeenCalled();
    scene.press("b7");
    scene.press("a8");
    scene.press(choice[4].key);
    expect(ctx.play).toHaveBeenCalledWith("b7a8n");
    expect(scene.buttons({ size: 320 })).toHaveLength(64);
  });

  it("shows the other side's move travelling, then rests", () => {
    const { scene, ctx, at, tick } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(["g1f3"]), last: "g1f3", canPlay: true });
    const going = scene.view(at() + MOVE_MS / 2);
    expect(going.moving).toEqual([{ piece: "N", from: cellOf("g1"), to: cellOf("f3"), progress: expect.closeTo(0.5, 6) }]);
    expect(going.hidden).toContain(cellOf("f3"));
    expect(paint(scene, at() + MOVE_MS / 2)).toBe(0);
    tick(MOVE_MS + 1);
    expect(scene.view(at()).moving).toEqual([]);
    expect(scene.view(at()).last).toEqual([cellOf("g1"), cellOf("f3")]);
    expect(paint(scene, at())).toBeNull();
  });

  it("castles the rook along with the king, along two thin paths", () => {
    const castling = after(TO_CASTLE);
    const { scene, ctx, at } = rig(castling, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(["e1g1"], castling), last: "e1g1" });
    const going = scene.view(at() + MOVE_MS / 2);
    expect(going.moving.map((one) => one.piece)).toEqual(["K", "R"]);
    expect(going.paths).toHaveLength(2);
    expect(going.hidden).toEqual(expect.arrayContaining([cellOf("g1"), cellOf("f1")]));
  });

  it("keeps a piece taken until the mover lands on it, then closes a ring on it with a dry knock", () => {
    const taking = after(["e2e4", "d7d5"]);
    const { scene, ctx, at } = rig(taking, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(["e4d5"], taking), last: "e4d5" });
    expect(scene.view(at() + MOVE_MS / 2).standing).toEqual([{ cell: cellOf("d5"), piece: "p" }]);
    paint(scene, at() + MOVE_MS + BURST_MS / 2);
    expect(scene.view(at() + MOVE_MS + BURST_MS / 2).bursts).toEqual([{ cell: cellOf("d5"), progress: 0.5 }]);
    expect(ctx.sound.play.mock.calls.map(([name]) => name)).toEqual(["chess-take"]);
  });

  it("rings a king in check, names the check for a screen reader, and shakes the king once the check lands", () => {
    const before = after(["e2e4", "f7f6"]);
    const { scene, ctx, at } = rig(before, { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(["d1h5"], before), last: "d1h5", canPlay: true });
    expect(marked(scene, "check")).toEqual(["e8"]);
    expect(scene.label()).toBe("Chessboard · Check");
    expect(scene.view(at() + MOVE_MS / 2).shakes).toEqual([]);
    expect(scene.view(at() + MOVE_MS + SHAKE_MS / 4).shakes.map((one) => one.cell)).toEqual([cellOf("e8")]);
    expect(paint(scene, at() + MOVE_MS + 1)).toBe(0);
    expect(paint(scene, at() + MOVE_MS + SHAKE_MS + 1)).toBeNull();
  });

  it("moves nothing for someone who asked the phone for less motion", () => {
    const { scene, ctx, at } = rig(initial(), { mySide: 1, canPlay: false });
    scene.update({ ...ctx, state: after(["e2e4"]), last: "e2e4" });
    const still = scene.view(at(), { still: true });
    expect(still.moving).toEqual([]);
    expect(still.shakes).toEqual([]);
  });

  it("marks the last move, and fades the piece of a move that waits for the other phone", () => {
    const { scene, ctx } = rig(initial());
    scene.update({ ...ctx, state: after(["e2e4"]), last: "e2e4", canPlay: false, pending: true });
    expect(marked(scene, "last")).toEqual(["e2", "e4"]);
    expect(marked(scene, "pending")).toEqual(["e4"]);
    expect(scene.view(1000).pending).toBe(cellOf("e4"));
  });

  it("lets a finger carry a piece to a square it may reach, lands it without walking it again, and sends back a piece let go elsewhere", () => {
    const { scene, ctx, at } = rig(initial());
    expect(scene.canDrag("g1")).toBe(true);
    expect(scene.canDrag("a1")).toBe(false);
    expect(scene.canDrag("e7")).toBe(false);
    expect(scene.dropTargets("g1").sort()).toEqual(["f3", "h3"]);
    scene.dragAt("g1", { x: 200, y: 160 });
    expect(scene.view(at()).floating).toMatchObject({ piece: "N", x: 200, y: 160 });
    expect(scene.view(at()).hidden).toContain(cellOf("g1"));
    scene.dragAt("g1", null);
    scene.drop("g1", "f3");
    expect(ctx.play).toHaveBeenCalledWith("g1f3");
    expect(scene.view(at()).floating).toMatchObject({ x: 200, y: 160 });
    scene.update({ ...ctx, state: after(["g1f3"]), last: "g1f3", canPlay: false });
    expect(scene.view(at()).moving).toEqual([]);
    expect(scene.view(at()).floating).toBeNull();

    const other = rig(initial());
    other.scene.dragAt("e2", { x: 100, y: 100 });
    other.scene.dragAt("e2", null);
    other.scene.drop("e2", "e5");
    expect(other.ctx.play).not.toHaveBeenCalled();
    expect(other.scene.view(other.at()).floating).toMatchObject({ x: 100, y: 100 });
    other.tick(1000);
    expect(other.scene.view(other.at()).floating).toBeNull();
  });

  it("asks which piece a pawn dropped on the last rank becomes", () => {
    const { scene, ctx } = rig(after(TO_PROMOTE));
    scene.dragAt("b7", { x: 50, y: 20 });
    scene.dragAt("b7", null);
    scene.drop("b7", "b8");
    expect(ctx.play).not.toHaveBeenCalled();
    expect(scene.buttons({ size: 320 }).map((one) => one.key)).toEqual(["cancel", "promote-q", "promote-r", "promote-b", "promote-n"]);
    scene.press("promote-q");
    expect(ctx.play).toHaveBeenCalledWith("b7b8q");
  });

  it("drops a pending choice when the turn ends", () => {
    const { scene, ctx } = rig(after(TO_PROMOTE));
    scene.press("b7");
    scene.press("a8");
    scene.update({ ...ctx, canPlay: false });
    expect(scene.buttons({ size: 320 })).toHaveLength(64);
    expect(scene.view(1000).promoting).toBeNull();
  });
});
