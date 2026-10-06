// Two phones playing Letter Grid against the fake core, by touch, as people would: the coin, the
// letters drawn by both on their own, a word built and said and seen the same on both sides, a
// word said with no connection that goes with the next hello, two passes, and a resignation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { phones, settle } from "../../../kit/test/helpers.js";
import { pathOf, wordsOn } from "../src/rules.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-wordgrid")].map((element) => element.table));
const kinds = (core) => core.sent.map((data) => JSON.parse(new TextDecoder().decode(fromBase64(data))).k);
const text = (element) => element.textContent.replace(/\s+/g, " ");

async function phone(core, opening = {}) {
  const element = document.createElement("ft-wordgrid");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

async function touch(element, selector) {
  const node = element.querySelector(selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
  await tick();
}

/** Says a word the grid has: its tiles tapped in order, then the button. */
async function say(element, word) {
  const path = pathOf(element.table.view.state.grid, word);
  for (const cell of path) await touch(element, `[data-cell="${cell}"]`);
  await touch(element, '[data-act="say"]');
}

/** Two phones in a match, the coin tossed and the letters drawn: `d` drew (it started), `n` moves first. */
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

describe("Letter Grid between two phones", () => {
  it("tosses the coin, draws the letters between the two phones on its own, and shows a word the same on both", async () => {
    const { a, b, d, n } = await match();
    expect(kinds(a).slice(0, 3)).toEqual(["hello", "commit", "reveal"]);
    expect(kinds(b).slice(0, 3)).toEqual(["sync", "seed", "sync"]);
    const moves = d.table.record.game.moves;
    expect(moves.map((move) => move[0])).toEqual(["c", "s", "r"]);
    expect(n.table.record.game.moves).toEqual(moves);
    expect(d.table.view.state.grid).toHaveLength(16);
    expect(text(n)).toContain("Your turn");
    const found = wordsOn(n.table.view.state.grid, "en");
    if (found.length) {
      await say(n, found[0]);
      expect(n.table.record.game.moves.at(-1)).toBe(`w${found[0]}`);
      expect(d.table.record.game.moves).toEqual(n.table.record.game.moves);
      expect(text(d)).toContain(found[0]);
      expect(text(d)).toContain("Your turn");
    } else {
      await touch(n, '[data-act="pass"]');
      expect(n.table.record.game.moves.at(-1)).toBe("x");
    }
  });

  it("keeps a pass made without a connection pending, and sends it with the next hello", async () => {
    const { d, n } = await match();
    const send = n.ft.live.send;
    n.ft.live.send = vi.fn(async () => false);
    await touch(n, '[data-act="pass"]');
    expect(text(n)).toContain("The other phone cannot be reached right now.");
    expect(d.table.record.game.moves).toHaveLength(3);
    n.ft.live.send = send;
    await touch(n, '[data-kit="back"]');
    await touch(n, '[data-kit="enter"]');
    await tick();
    expect(d.table.record.game.moves).toHaveLength(4);
  });

  it("ends the round after two passes, the points deciding, and the winner sends the result", async () => {
    const { d, n } = await match();
    const found = wordsOn(n.table.view.state.grid, "en");
    if (found.length) await say(n, found[0]);
    else await touch(n, '[data-act="pass"]');
    await touch(d, '[data-act="pass"]');
    await touch(n, '[data-act="pass"]');
    if (!found.length) {
      expect(text(d)).toMatch(/draw|Draw/);
      return;
    }
    expect(text(n)).toContain("You won");
    expect(text(n)).toContain("Both passed");
    expect(text(d)).toContain("You lost");
    await touch(n, '[data-kit="send"]');
    expect(n.ft.say).toHaveBeenCalledWith(expect.stringContaining("🔠 Letter Grid"));
  });

  it("ends the round on a resignation", async () => {
    const { d, n } = await match();
    await touch(n, '[data-kit="resign"]');
    await touch(n, '[data-kit="yes"]');
    expect(text(n)).toContain("You lost");
    expect(text(d)).toContain("You won");
  });
});
