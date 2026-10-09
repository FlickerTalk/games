// Two phones playing Crazy Eights against the fake core, by touch, as people would: the coin, the
// deck shuffled by both on its own, the same cards seen from each side, a move made with no
// connection that goes with the next hello, a whole round, and a resignation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-eights")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");

async function phone(core, opening = {}) {
  const element = document.createElement("ft-eights");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, selector) {
  const node = within(element, selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
  await tick();
}

/** The first thing the side may do, as the screenshots tap it: a suit, a playable card, the stock, pass. */
const LIVE = '.fce-pick [data-suit], .fce-hand [data-card]:not([disabled]), .fce [data-act="draw"]:not([disabled]), .fce [data-act="pass"]:not([disabled])';

/** One move by the side: a tap on the first thing it may do, and a suit when an eight asks for one. */
async function move(element) {
  await touch(element, LIVE);
  if (element.querySelector(".fce-pick [data-suit]")) await touch(element, LIVE);
}

/** Two phones in a match, the coin tossed and the deck shuffled: `d` dealt (it started), `n` plays first. */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  // The coin, then the three moves of the shuffle, each a message across: as long as it takes.
  for (let at = 0; at < 30 && (one.table.record?.game.moves.length ?? 0) < 3; at += 1) await tick();
  const [d, n] = one.table.view.mySide === 0 ? [one, two] : [two, one];
  return { a, b, one, two, d, n };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Crazy Eights between two phones", () => {
  it("tosses the coin, shuffles the deck between the two phones on its own, and deals the same cards to both", async () => {
    const { a, b, d, n } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    const moves = d.table.record.game.moves;
    expect(moves).toHaveLength(3);
    expect(moves[0]).toMatch(/^c/);
    expect(moves[1]).toMatch(/^s/);
    expect(moves[2]).toMatch(/^r/);
    expect(n.table.record.game.moves).toEqual(moves);
    expect(d.table.view.state.phase).toBe("play");
    expect(text(n)).toContain("Your turn");
    expect(n.querySelectorAll(".fce-hand [data-card]")).toHaveLength(7);
    expect(d.querySelectorAll(".fce-backs i")).toHaveLength(7);
    // The non-dealer moves: a card or a draw; the dealer sees it.
    await move(n);
    expect(n.table.record.game.moves).toHaveLength(4);
    expect(d.table.record.game.moves).toEqual(n.table.record.game.moves);
    expect(text(d)).toContain("Your turn");
    const theirs = d.table.view.state.hands[1].length;
    expect(d.querySelectorAll(".fce-backs i")).toHaveLength(Math.min(theirs, 12));
  });

  it("keeps a move made without a connection pending, and sends it with the next hello", async () => {
    const { d, n } = await match();
    const send = n.ft.live.send;
    n.ft.live.send = vi.fn(async () => false);
    await move(n);
    expect(text(n)).toContain("The other phone cannot be reached right now.");
    expect(d.table.record.game.moves).toHaveLength(3);
    n.ft.live.send = send;
    await touch(n, '[data-kit="back"]');
    await touch(n, '[data-kit="enter"]');
    await tick();
    expect(d.table.record.game.moves).toHaveLength(4);
    expect(text(d)).toContain("Your turn");
  });

  it("plays a whole round to its end, and the winner sends the result", async () => {
    const { d, n } = await match();
    for (let at = 0; at < 400 && !d.table.view.result; at += 1) {
      const side = d.table.view.myTurn ? d : n;
      await touch(side, LIVE);
    }
    const ended = d.table.view.result;
    expect(ended).not.toBeNull();
    expect(["out", "stuck"]).toContain(ended.result.reason);
    const winner = ended.winner === null ? d : ended.winner === d.table.view.me ? d : n;
    expect(text(winner)).toMatch(/You won|draw|Draw/);
    await touch(winner, '[data-kit="send"]');
    expect(winner.ft.say).toHaveBeenCalledWith(expect.stringContaining("🃏 Crazy Eights"));
  });

  it("ends the round on a resignation", async () => {
    const { d, n } = await match();
    await touch(n, '[data-kit="resign"]');
    await touch(n, '[data-kit="yes"]');
    expect(text(n)).toContain("You lost");
    expect(text(d)).toContain("You won");
  });
});
