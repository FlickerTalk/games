import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { DEAL_MS, DRAW_MS, PLAY_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { commitText, initial, play, result, revealText, seedText, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const A = Uint8Array.from({ length: 24 }, (_, at) => at + 1);
const B = new Uint8Array(24).fill(0x5a);
const replay = (moves, start = initial()) => moves.reduce((state, move) => play(state, move, turn(state)).state, start);
const seeded = replay([commitText(A), seedText(B)]);
const dealt = replay([revealText(A)], seeded);
const TABLE = { ...dealt, hands: [[1, 2, 3, 30], [0, 20, 14, 35]], pile: [8], suit: 0, next: 1, stock: [40, 41, 42], passes: 0 };
const after = (state, move) => play(state, move, turn(state)).state;
const SIZE = 343;

function context(state, extra = {}) {
  const over = result(state);
  return {
    state,
    view: { me: "me-1", index: 0, round: { moves: [] } },
    mySide: 1,
    canPlay: !over && turn(state) === 1,
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

const buttons = (scene, size = SIZE) => scene.buttons({ size });
const keyed = (scene, key) => buttons(scene).find((one) => one.key === key);
const cards = (scene) => buttons(scene).filter((one) => typeof one.key === "number");
const open = (scene) => cards(scene).filter((one) => !one.disabled).map((one) => one.key);
const painting = (scene, now, still = false) => {
  const pen = recorder();
  const next = scene.draw(pen, { size: SIZE, theme: themeFor(null), now, still });
  return { pen, next };
};
const sounds = (ctx) => ctx.sound.play.mock.calls.map(([name, options]) => [name, options?.delay ?? 0]);

describe("the crazy eights scene", () => {
  it("lays named buttons over each card of the user's hand, the stock and the pile, open only where a card may go", () => {
    const { scene } = rig(TABLE);
    const all = buttons(scene);
    expect(all.map((one) => one.key)).toEqual([0, 14, 20, 35, "stock", "pile"]);
    expect(keyed(scene, "stock")).toMatchObject({ label: "Draw a card (3 left)", disabled: false, data: { act: "draw" } });
    expect(keyed(scene, "pile")).toMatchObject({ label: "On the table: 9 of spades", disabled: true });
    expect(cards(scene).map((one) => one.key)).toEqual([0, 14, 20, 35]);
    expect(cards(scene)[0]).toMatchObject({ label: "Play the ace of spades", data: { card: 0 } });
    expect(open(scene)).toEqual([0, 20]);
    expect(scene.label()).toBe("Crazy Eights: 4 cards · On the table: 9 of spades · Suit to follow: spades · Your hand: 4 cards");
    for (const { box } of all) expect(box.x + box.w).toBeLessThanOrEqual(1.0001);
  });

  it("plays a plain card at once, and asks for a suit on an eight, with a sound, closing again on a second tap", () => {
    const { scene, ctx } = rig(TABLE);
    scene.press(0);
    expect(ctx.play).toHaveBeenCalledWith("p0");
    scene.press(20);
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(sounds(ctx)).toEqual([["eights-pick", 0]]);
    const suits = buttons(scene).filter((one) => one.data.suit);
    expect(suits.map((one) => [one.key, one.label, one.data.suit])).toEqual([["s", "spades", "s"], ["h", "hearts", "h"], ["d", "diamonds", "d"], ["c", "clubs", "c"]]);
    expect(buttons(scene)[0].key).toBe("s");
    expect(keyed(scene, 20).data.mark).toBe("can chosen");
    expect(keyed(scene, "stock").disabled).toBe(true);
    scene.press("stock");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    scene.press(20);
    expect(buttons(scene).filter((one) => one.data.suit)).toEqual([]);
    scene.press(20);
    scene.press("d");
    expect(ctx.play).toHaveBeenLastCalledWith("p20d");
  });

  it("draws from the stock while it lasts, then passes, and opens nothing off turn", () => {
    const { scene, ctx } = rig(TABLE);
    scene.press("stock");
    expect(ctx.play).toHaveBeenCalledWith("d");
    const empty = rig({ ...TABLE, stock: [] });
    expect(keyed(empty.scene, "stock")).toMatchObject({ label: "Pass", disabled: false, data: { act: "pass" } });
    empty.scene.press("stock");
    expect(empty.ctx.play).toHaveBeenCalledWith("x");
    const waiting = rig({ ...TABLE, next: 0 });
    expect(open(waiting.scene)).toEqual([]);
    expect(keyed(waiting.scene, "stock").disabled).toBe(true);
    waiting.scene.press("stock");
    expect(waiting.ctx.play).not.toHaveBeenCalled();
  });

  it("shows the deck being shuffled before the cards are dealt, with nothing to touch", () => {
    const { scene } = rig(seeded, { mySide: 0, canPlay: true });
    expect(cards(scene)).toEqual([]);
    expect(keyed(scene, "stock")).toMatchObject({ label: "Shuffling the deck…", disabled: true });
    expect(scene.label()).toBe("Crazy Eights: Shuffling the deck…");
  });

  it("deals the cards one by one from the stock with a riffle, then turns up the first card, then rests", () => {
    const { scene, ctx, at } = rig(seeded, { mySide: 1 });
    scene.update({ ...ctx, state: dealt, last: revealText(A), canPlay: true });
    expect(sounds(ctx)[0]).toEqual(["eights-deal", 0]);
    const early = scene.view(at() + DEAL_MS * 0.3, { size: SIZE });
    expect(early.moving).toMatchObject({ card: null });
    expect(early.hidden.size).toBeGreaterThan(0);
    expect(early.theirs).toBeLessThan(7);
    const late = scene.view(at() + DEAL_MS + 1, { size: SIZE });
    expect(late.moving).toBeNull();
    expect(late.hidden.size).toBe(0);
    expect(late.theirs).toBe(7);
    expect(painting(scene, at() + DEAL_MS + 1).next).toBeNull();
  });

  it("flies the other side's card from its hand to the pile, then marks it and sounds it as it lands", () => {
    const theirs = { ...TABLE, next: 0 };
    const { scene, ctx, at } = rig(theirs);
    const moved = after(theirs, "p3");
    scene.update({ ...ctx, state: moved, last: "p3", canPlay: true });
    expect(sounds(ctx)).toEqual([["eights-card", PLAY_MS / 1000]]);
    const going = scene.view(at() + PLAY_MS / 2, { size: SIZE });
    expect(going.moving).toMatchObject({ card: 3, flip: true });
    expect(going.pile).toEqual([8]);
    expect(painting(scene, at() + PLAY_MS / 2).next).toBe(0);
    const landed = scene.view(at() + PLAY_MS + 1, { size: SIZE });
    expect(landed.moving).toBeNull();
    expect(landed.pile).toEqual([8, 3]);
    expect(keyed(scene, "pile").data.mark).toBe("last");
  });

  it("brings the user's drawn card from the stock face down, turning it over into its place", () => {
    const { scene, ctx, at } = rig(TABLE);
    scene.update({ ...ctx, state: after(TABLE, "d"), last: "d", canPlay: false });
    const going = scene.view(at() + DRAW_MS / 4, { size: SIZE });
    expect(going.moving).toMatchObject({ card: 42, flip: true });
    expect(going.hidden.has(42)).toBe(true);
    expect(scene.view(at() + DRAW_MS + 1, { size: SIZE }).hidden.has(42)).toBe(false);
    expect(sounds(ctx)).toEqual([["eights-draw", 0]]);
  });

  it("draws the other side's hand and the stock from their counts only: two different hands of a size look alike", () => {
    const one = { ...TABLE, next: 0, hands: [[1, 2, 3, 30], [0, 20, 14, 35]], stock: [40, 41, 42] };
    const two = { ...TABLE, next: 0, hands: [[44, 45, 46, 47], [0, 20, 14, 35]], stock: [42, 41, 40] };
    const [a, b] = [rig(one), rig(two)];
    expect(buttons(b.scene)).toEqual(buttons(a.scene));
    expect(b.scene.label()).toBe(a.scene.label());
    expect(painting(b.scene, 5000).pen.calls).toEqual(painting(a.scene, 5000).pen.calls);
    a.scene.update({ ...a.ctx, state: after(one, "d"), last: "d" });
    b.scene.update({ ...b.ctx, state: after(two, "d"), last: "d" });
    expect(painting(b.scene, a.at() + DRAW_MS / 2).pen.calls).toEqual(painting(a.scene, a.at() + DRAW_MS / 2).pen.calls);
  });

  it("lets a finger carry a playable card to the pile, where it lands without flying again, an eight asking for its suit", () => {
    const { scene, ctx, at } = rig(TABLE);
    expect(scene.canDrag(0)).toBe(true);
    expect(scene.canDrag(14)).toBe(false);
    expect(scene.dropTargets(0)).toEqual(["pile"]);
    scene.dragAt(0, { x: 200, y: 150 });
    expect(scene.view(at(), { size: SIZE }).floating).toMatchObject({ card: 0, x: 200, y: 150 });
    expect(scene.view(at(), { size: SIZE }).hidden.has(0)).toBe(true);
    scene.dragAt(0, null);
    scene.drop(0, "pile");
    expect(ctx.play).toHaveBeenCalledWith("p0");
    scene.update({ ...ctx, state: after(TABLE, "p0"), last: "p0", canPlay: false });
    expect(scene.view(at(), { size: SIZE }).moving).toBeNull();

    const eight = rig(TABLE);
    eight.scene.dragAt(20, { x: 200, y: 150 });
    eight.scene.dragAt(20, null);
    eight.scene.drop(20, "pile");
    expect(eight.ctx.play).not.toHaveBeenCalled();
    expect(buttons(eight.scene).filter((one) => one.data.suit)).toHaveLength(4);
  });

  it("marks a move still on its way to the other phone, and moves nothing for someone who asked for less motion", () => {
    const { scene, ctx, at } = rig(TABLE);
    scene.update({ ...ctx, state: after(TABLE, "p0"), last: "p0", canPlay: false, pending: true });
    expect(keyed(scene, "pile").data.mark).toBe("pending");
    const still = rig({ ...TABLE, next: 0 });
    still.scene.update({ ...still.ctx, state: after({ ...TABLE, next: 0 }, "p3"), last: "p3" });
    expect(still.scene.view(still.at(), { size: SIZE, still: true }).moving).toBeNull();
    expect(painting(still.scene, still.at(), true).next).toBeNull();
    expect(at()).toBe(1000);
  });

  it("leaves 44 px of every card to touch in a hand of fifteen on a phone", () => {
    const hand = [0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 15, 16, 17, 18, 19];
    const { scene } = rig({ ...TABLE, hands: [[30, 31], hand] });
    const list = cards(scene);
    expect(list).toHaveLength(15);
    for (const { box } of list) {
      expect(box.w * SIZE).toBeGreaterThanOrEqual(44);
      expect(box.h * SIZE).toBeGreaterThanOrEqual(40);
    }
  });
});
