// The board of Sea Battle: the user's sea with the fleet to place (shuffle, ready: the fleet and
// salt kept in the plugin's store, the commitment handed to the kit), then the other side's sea
// fired at in two taps with the honest answer attached, the user's own sea small with the other
// side's shots, the answer that sinks the last ship and the reveal sent on their own.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { MARKS, board, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { DEFAULT_FLEET, commitText, initial, play, result, revealText, shipCells, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, move, turn(state)).state;
  const over = result(state);
  return {
    state,
    view: { me: "me-1", round: { moves } },
    mySide: turn(state),
    canPlay: !over,
    last: moves.at(-1) ?? null,
    pending: false,
    result: over ? { k: "rules", winner: over.winner, result: over } : null,
    lang: "en",
    t: (key, vars) => translate("en", key, vars),
    play: vi.fn(),
    ...extra,
  };
}

const SALT_B = new Uint8Array(24).fill(0x5a);
const OTHER = DEFAULT_FLEET.map((ship) => ({ ...ship, start: ship.start + 10 }));
const cell = (host, index) => host.querySelector(`[data-cell="${index}"]`);

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = {
    store: {
      get: vi.fn(async (key) => store.get(key) ?? null),
      set: vi.fn(async (key, value) => (store.set(key, value), true)),
    },
  };
});

describe("placing the fleet", () => {
  it("shows the user's sea with the five ships, shuffles them, and hands the kit a commitment on Ready", async () => {
    const host = document.createElement("div");
    const ctx = context([]);
    board.mount(host, ctx);
    await tick();
    expect(host.querySelectorAll(".fsb-cell.ship")).toHaveLength(17);
    expect(host.textContent).toContain("Place your five ships");
    const before = [...host.querySelectorAll(".fsb-cell.ship")].map((one) => one.getAttribute("aria-label"));
    host.querySelector('[data-act="shuffle"]').click();
    await tick();
    expect(host.querySelectorAll(".fsb-cell.ship")).toHaveLength(17);
    const after = [...host.querySelectorAll(".fsb-cell.ship")].map((one) => one.getAttribute("aria-label"));
    expect(after).not.toEqual(before);
    host.querySelector('[data-act="ready"]').click();
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const move = ctx.play.mock.calls[0][0];
    expect(move).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    // The fleet and its salt are kept under this participant's id, and hash to the commitment.
    expect(globalThis.ft.store.set).toHaveBeenCalledWith(storeKey("me-1"), expect.any(String));
    const kept = JSON.parse(store.get(storeKey("me-1")));
    expect(kept.fleet).toHaveLength(20);
    const { parseFleet } = await import("../src/rules.js");
    expect(commitText(fromBase64url(kept.salt), parseFleet(kept.fleet))).toBe(move);
  });

  it("waits for the other fleet once the user has committed, and keeps the buttons closed off turn", async () => {
    const host = document.createElement("div");
    const committed = context([commitText(SALT_B, DEFAULT_FLEET)], { mySide: 0, canPlay: false });
    board.mount(host, committed);
    await tick();
    expect(host.textContent).toContain("Waiting for the other fleet");
    expect(host.querySelector('[data-act="ready"]')).toBeNull();
    const other = document.createElement("div");
    board.mount(other, context([], { canPlay: false }));
    expect(other.querySelector('[data-act="ready"]').disabled).toBe(true);
  });

  it("says so when the fleet it committed is no longer on this phone", async () => {
    const host = document.createElement("div");
    // Side 1 committed (as this phone) but the store has nothing: the board cannot answer.
    const ctx = context([commitText(SALT_B, DEFAULT_FLEET), commitText(SALT_B, OTHER)], { mySide: 1, canPlay: false });
    const mounted = board.mount(host, ctx);
    await tick();
    mounted.update({ ...ctx, canPlay: true, state: play(ctx.state, ">21", 0).state, mySide: 1 });
    expect(host.textContent).toContain("no longer on this phone");
    expect(ctx.play).not.toHaveBeenCalled();
  });
});

/** A board for side `me` whose fleet is kept in the store already. */
async function fired(moves, me, fleet, extra = {}) {
  store.set(storeKey("me-1"), JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", fleet: "11h531v436h358v273h3" }));
  const host = document.createElement("div");
  const ctx = context(moves, { mySide: me, ...extra });
  const mounted = board.mount(host, ctx);
  await tick();
  return { host, ctx, mounted };
}

describe("firing", () => {
  const placed = [commitText(SALT_B, DEFAULT_FLEET), commitText(SALT_B, DEFAULT_FLEET)];

  it("fires in two taps, with the honest answer to the other side's last shot attached", async () => {
    // Side 1 to move: side 0 fired at 11, a ship's cell.
    const { host, ctx } = await fired([...placed, ">11"], 1);
    expect(host.querySelector(".fsb-sea.big").getAttribute("aria-label")).toBe("Their sea");
    expect(host.querySelectorAll(".fsb-sea")).toHaveLength(2);
    // The user's own sea shows the shot that just landed, on a ship.
    expect(host.querySelector('.fsb-bottom .fsb-cell.ship.last')).not.toBeNull();
    cell(host, 45).click();
    expect(ctx.play).not.toHaveBeenCalled();
    const ghost = host.querySelector(".fsb-ghost");
    expect(ghost.getAttribute("aria-label")).toBe("Fire at row 5, column 6");
    ghost.click();
    expect(ctx.play).toHaveBeenCalledWith("h>45");
  });

  it("answers miss on water, and shows what came back from each shot", async () => {
    const { host, ctx } = await fired([...placed, ">0"], 1);
    cell(host, 7).click();
    cell(host, 7).click();
    expect(ctx.play).toHaveBeenCalledWith("m>7");
    const { host: later } = await fired([...placed, ">0", "m>11", "h>1", "m>12"], 1, DEFAULT_FLEET, { canPlay: true });
    expect(cell(later, 11).classList.contains("hit")).toBe(true);
    expect(cell(later, 11).disabled).toBe(true);
    expect(cell(later, 12).getAttribute("aria-label")).toBe("Row 2, column 3: not fired at");
    expect(later.textContent).toContain("5 ships afloat");
  });

  it("sends the answer that sinks its last ship on its own, then the reveal, and shows the other fleet at the end", async () => {
    // The other side (1) fires at every cell of this phone's fleet in turn; this phone fires at water.
    const { honestAnswer } = await import("../src/rules.js");
    const targets = DEFAULT_FLEET.flatMap(shipCells);
    const water = Array.from({ length: 100 }, (_, index) => 99 - index).filter((index) => !targets.includes(index));
    const moves = [...placed];
    let state = initial();
    const go = (move) => {
      const played = play(state, move, turn(state));
      if (played.error) throw new Error(`${move}: ${played.error}`);
      state = played.state;
    };
    go(placed[0]);
    go(placed[1]);
    let hits = 0;
    let misses = 0;
    go(`>${water[misses++]}`);
    moves.push(`>${water[0]}`);
    while (state.shots[1].length < targets.length) {
      const side = turn(state);
      const move = `${honestAnswer(state, side, DEFAULT_FLEET)}>${side === 1 ? targets[hits++] : water[misses++]}`;
      go(move);
      moves.push(move);
    }
    // Every cell of this phone's fleet has been fired at: it owes the answer that sinks its last ship.
    expect(turn(state)).toBe(0);
    const lastAnswer = honestAnswer(state, 0, DEFAULT_FLEET);
    expect(lastAnswer).toMatch(/^s/);
    const { ctx, mounted } = await fired(moves, 0);
    mounted.update({ ...ctx, state, canPlay: true, view: { me: "me-1", round: { moves } } });
    expect(ctx.play).toHaveBeenCalledWith(lastAnswer);

    // The kit comes back with the answer applied: side 1 reveals first (it is afloat), then us.
    go(lastAnswer);
    expect(state.phase).toBe("reveal");
    go(revealText(SALT_B, DEFAULT_FLEET));
    ctx.play.mockClear();
    mounted.update({ ...ctx, state, canPlay: true, view: { me: "me-1", round: { moves: [...moves, lastAnswer, "x"] } } });
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toBe(revealText(SALT_B, DEFAULT_FLEET));
    go(revealText(SALT_B, DEFAULT_FLEET));
    expect(result(state)).toEqual({ winner: 1, reason: "sunk" });

    // At the end, the other side's fleet is shown on its sea.
    const host = document.createElement("div");
    board.mount(host, context([], { state, mySide: 0, canPlay: false, result: { k: "rules", winner: 1, result: result(state) } }));
    await tick();
    expect(host.querySelectorAll(".fsb-sea.big .fsb-cell.ship").length).toBe(17);
    expect(MARKS).toHaveLength(2);
  });
});
