import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, seeded, settle, within } from "../../../kit/test/helpers.js";
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

const LIVE = 'button[data-suit], button[data-card]:not([disabled]), button[data-key="stock"]:not([disabled])';
const table = (element) => element.querySelector('.ftg-board [role="group"]').getAttribute("aria-label");

async function move(element) {
  await touch(element, LIVE);
  if (element.querySelector("button[data-suit]")) await touch(element, LIVE);
}

async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  for (let at = 0; at < 30 && (one.table.record?.game.moves.length ?? 0) < 3; at += 1) await tick();
  const [d, n] = one.table.view.mySide === 0 ? [one, two] : [two, one];
  return { a, b, one, two, d, n };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

const randomBytes = (random) => () => Uint8Array.from({ length: 32 }, () => Math.floor(random() * 256));

async function alone(records) {
  const core = fakeCore({ records });
  const element = await phone(core, { live: false, solo: true });
  return { core, element };
}

async function think(element) {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
}

describe("Crazy Eights against the phone", () => {
  it("deals with the phone, which still reveals its seed after the game is closed and opened again, and plays the round out", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const records = new Map();
    const first = await alone(records);
    first.element.table.timing.unseen = TIMING.think;
    first.element.table.random = () => new Uint8Array(32).fill(1);
    await touch(first.element, '[data-kit="new"]');
    first.element.table.random = randomBytes(seeded(21));
    await think(first.element);
    await tick();
    const moves = first.element.table.record.game.moves;
    expect(moves.map((one) => one[0])).toEqual(["c", "s"]);
    expect(first.element.table.view.myTurn).toBe(false);
    first.element.table.stopTimers();
    first.element.remove();

    const second = await alone(records);
    second.element.table.random = randomBytes(seeded(22));
    await touch(second.element, '[data-kit="enter"]');
    await think(second.element);
    expect(second.element.table.view.state.phase).toBe("play");
    expect(second.element.table.record.game.moves[2]).toBe(`r${second.element.table.record.solo.memory.seed}`);
    for (let step = 0; step < 300 && second.element.table.view.phase === "play"; step += 1) {
      if (second.element.table.view.myTurn) await move(second.element);
      else await think(second.element);
    }
    const { phase, result } = second.element.table.view;
    expect(phase).toBe("over");
    expect(["out", "stuck"]).toContain(result.result.reason);
    expect(text(second.element)).toMatch(/You won|You lost|draw/i);
    expect(second.element.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    for (const core of [first.core, second.core]) expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

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
    expect(n.querySelectorAll("button[data-card]")).toHaveLength(7);
    expect(table(d)).toMatch(/^Crazy Eights: 7 cards · /);
    await move(n);
    expect(n.table.record.game.moves).toHaveLength(4);
    expect(d.table.record.game.moves).toEqual(n.table.record.game.moves);
    expect(text(d)).toContain("Your turn");
    const theirs = d.table.view.state.hands[1].length;
    expect(table(d)).toMatch(new RegExp(`^Crazy Eights: ${theirs} cards · `));
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
