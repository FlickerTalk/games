import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64 } from "../../../kit/src/envelope.js";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, seeded, settle, within } from "../../../kit/test/helpers.js";
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
  const node = within(element, selector);
  if (!node) throw new Error(`nothing to touch: ${selector}`);
  node.click();
  await tick();
  await tick();
}

async function say(element, word) {
  const path = pathOf(element.table.view.state.grid, word);
  for (const cell of path) await touch(element, `[data-cell="${cell}"]`);
  await touch(element, '[data-act="say"]');
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
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.ft;
});

const randomBytes = (random) => () => Uint8Array.from({ length: 32 }, () => Math.floor(random() * 256));

async function alone(records) {
  const core = fakeCore({ records });
  globalThis.ft = { store: { get: async () => null, set: async () => true } };
  const element = await phone(core, { live: false, solo: true, lang: "es" });
  return { core, element };
}

async function think(element) {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
}

describe("Letter Grid against the phone", () => {
  it("draws the letters with the phone in the user's language, the phone revealing its seed after the game is opened again, and plays the round out", async () => {
    const records = new Map();
    const first = await alone(records);
    first.element.table.timing.unseen = TIMING.think;
    first.element.table.random = () => new Uint8Array(32).fill(1);
    await touch(first.element, '[data-kit="new"]');
    first.element.table.random = randomBytes(seeded(51));
    await think(first.element);
    await tick();
    expect(first.element.table.record.game.moves.map((one) => one.slice(0, 3))).toEqual(["ces", expect.stringMatching(/^s/)]);
    expect(first.element.table.view.myTurn).toBe(false);
    first.element.table.stopTimers();
    first.element.remove();

    const second = await alone(records);
    second.element.table.random = randomBytes(seeded(52));
    await touch(second.element, '[data-kit="enter"]');
    await think(second.element);
    const { grid, lang } = second.element.table.view.state;
    expect(lang).toBe("es");
    expect(grid).toHaveLength(16);
    const words = wordsOn(grid, "es");
    await say(second.element, words[0]);
    for (let step = 0; step < 200 && second.element.table.view.phase === "play"; step += 1) {
      if (second.element.table.view.myTurn) await touch(second.element, '[data-act="pass"]');
      else await think(second.element);
    }
    const { phase, state, result, mySide } = second.element.table.view;
    expect(phase).toBe("over");
    expect(result.result.reason).toBe("passed");
    expect(state.said[mySide]).toEqual([words[0]]);
    for (const word of state.said[1 - mySide]) expect(words).toContain(word);
    for (const core of [first.core, second.core]) expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("plays a whole round against the phone to its end, the phone always Flick and never a word on the live channel", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toNotFake: ["Date"] });
    const { core, element } = await alone(new Map());
    element.table.random = () => new Uint8Array(32).fill(1);
    await touch(element, '[data-kit="new"]');
    let said = 0;
    for (let step = 0; step < 200 && element.table.view.phase !== "over"; step += 1) {
      const { myTurn, phase, state } = element.table.view;
      if (myTurn && phase === "play" && state.phase === "play") {
        const open = wordsOn(state.grid, state.lang).filter((word) => !state.said[0].includes(word) && !state.said[1].includes(word));
        if (said < 2 && open.length) {
          await say(element, open[0]);
          said += 1;
        } else await touch(element, '[data-act="pass"]');
      }
      await think(element);
    }
    expect(element.table.view.phase).toBe("over");
    expect(element.table.view.state.said[element.table.view.mySide]).toHaveLength(said);
    expect(text(element)).toMatch(/Has ganado|Has perdido|Empate/);
    expect(element.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(element.querySelector('[data-kit="send"]')).toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);
});

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
