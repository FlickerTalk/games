// Two phones playing Word Duel against the fake core, by touch and by typing, as people would:
// the coin, each secret word set, guesses answered honestly and seen the same on both sides, a
// guess made with no connection that goes with the next hello, a whole round, and a resignation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle, within } from "../../../kit/test/helpers.js";
import { feedback } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-wordduel")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");

async function phone(core, opening = {}) {
  const element = document.createElement("ft-wordduel");
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

async function type(element, name, value) {
  const field = element.querySelector(`[name="${name}"]`);
  if (!field) throw new Error(`no field ${name}`);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

/** Two phones in a match, the coin tossed, `s` (the starter) keeping "crane" and `o` "eagle". */
async function match() {
  const { a, b } = phones();
  const one = await phone(a);
  const two = await phone(b);
  await touch(one, '[data-kit="new"]');
  await tick();
  const [s, o] = one.table.view.myTurn ? [one, two] : [two, one];
  await type(s, "secret", "crane");
  await touch(s, '[data-act="commit"]');
  expect(text(s)).toContain("Waiting for the other side's word");
  await type(o, "secret", "eagle");
  await touch(o, '[data-act="commit"]');
  return { a, b, one, two, s, o };
}

async function guess(element, word) {
  await type(element, "guess", word);
  await touch(element, '[data-act="guess"]');
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Word Duel between two phones", () => {
  it("tosses the coin, sets both words, and shows each guess with its answer the same on both phones", async () => {
    const { a, b, s, o } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    expect(s.table.record.game.moves).toHaveLength(2);
    expect(text(s)).toContain("Your turn");
    await guess(s, "stare");
    expect(text(o)).toContain("Your turn");
    await guess(o, "about");
    expect(o.table.record.game.moves.slice(2)).toEqual([">stare", `${feedback("stare", "eagle")}>about`]);
    expect(s.table.record.game.moves).toEqual(o.table.record.game.moves);
    const myRow = s.querySelectorAll(".fwd-grid:not(.small) .fwd-row")[0];
    expect([...myRow.querySelectorAll(".fwd-tile")].map((tile) => tile.className.includes(" g")).filter(Boolean)).toHaveLength(1);
  });

  it("keeps a guess made without a connection pending, and sends it with the next hello", async () => {
    const { s, o } = await match();
    const send = s.ft.live.send;
    s.ft.live.send = vi.fn(async () => false);
    await guess(s, "stare");
    expect(text(s)).toContain("The other phone cannot be reached right now.");
    expect(o.table.record.game.moves).toHaveLength(2);
    s.ft.live.send = send;
    await touch(s, '[data-kit="back"]');
    await touch(s, '[data-kit="enter"]');
    await tick();
    expect(o.table.record.game.moves).toHaveLength(3);
    expect(text(o)).toContain("Your turn");
  });

  it("plays a round to its end: the starter guesses in two, the other does not, both reveal", async () => {
    const { s, o } = await match();
    await guess(s, "stare");
    await guess(o, "about");
    await guess(s, "eagle");
    // The answer to it comes with the other side's next guess; then the starter knows.
    await guess(o, "other");
    await tick();
    await tick();
    expect(text(s)).toContain("You won");
    expect(text(s)).toContain("Guessed in fewer tries");
    expect(text(o)).toContain("You lost");
    expect(text(o)).toContain("Their word was CRANE");
    expect(text(s)).toContain("Their word was EAGLE");
    expect(s.table.record.game.moves.at(-1)).toMatch(/^r/);
    await touch(s, '[data-kit="send"]');
    expect(s.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔤 Word Duel"));
  });

  it("ends the round on a resignation", async () => {
    const { s, o } = await match();
    await touch(o, '[data-kit="resign"]');
    await touch(o, '[data-kit="yes"]');
    expect(text(o)).toContain("You lost");
    expect(text(s)).toContain("You won");
  });
});
