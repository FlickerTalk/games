import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMING } from "../../../kit/src/table.js";
import { fakeCore, phones, seeded, settle, within } from "../../../kit/test/helpers.js";
import "../src/index.js";

const tick = () => settle([...document.querySelectorAll("ft-cardcorner")].map((element) => element.table));
const text = (element) => element.textContent.replace(/\s+/g, " ");
const live = (element, selector) => element.querySelector(`.ftg-board ${selector}:not([disabled])`);
const label = (element) => element.querySelector('.ftg-board [role="group"]').getAttribute("aria-label");
const randomBytes = (random) => () => Uint8Array.from({ length: 32 }, () => Math.floor(random() * 256));

async function phone(core, opening = {}) {
  const element = document.createElement("ft-cardcorner");
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
}

async function press(element, selector) {
  const node = live(element, selector);
  if (!node) throw new Error(`nothing open to touch: ${selector} (${label(element)})`);
  node.click();
  await tick();
}

const CHOICES = { pairs16: ["pairs", "p16"], pairs24: ["pairs", "p24"], war: ["war"], rummy: ["rummy"], fish: ["fish"] };

async function act(element, choice) {
  const { state } = element.table.view;
  if (state.phase === "choose") {
    for (const key of CHOICES[choice]) await press(element, `button[data-key="${key}"]`);
  } else if (state.phase === "shuffle") await tick();
  else if (state.game === "pairs") await press(element, "button[data-cell]");
  else if (state.game === "war") await press(element, 'button[data-key="mine"]');
  else if (state.game === "fish") await press(element, 'button[data-card], button[data-key="pond"]');
  else if (state.table.step === "draw") await press(element, 'button[data-key="stock"]');
  else if (live(element, 'button[data-key="lay"]')) await press(element, 'button[data-key="lay"]');
  else {
    const held = [...element.querySelectorAll(".ftg-board button[data-card]")].find((one) => Number(one.dataset.card) !== state.table.took) ?? live(element, "button[data-card]");
    held.click();
    await tick();
    await press(element, 'button[data-key="discard"]');
  }
}

async function think() {
  await vi.advanceTimersByTimeAsync(TIMING.think);
  await tick();
}

beforeEach(() => {
  vi.useFakeTimers({ toNotFake: ["Date"] });
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

describe("Card Corner against the phone", () => {
  it.each(Object.keys(CHOICES).map((choice, at) => [choice, at]))("plays a whole round of %s with Flick, the player choosing the game, and never uses the live channel", async (choice, at) => {
    const core = fakeCore();
    const element = await phone(core, { live: false, solo: true });
    element.table.random = randomBytes(seeded(31 + at));
    await touch(element, '[data-kit="new"]');
    for (let step = 0; step < 1500 && element.table.view.phase === "play"; step += 1) {
      if (element.table.view.myTurn) await act(element, choice);
      else await think();
    }
    const { phase, result, state } = element.table.view;
    expect(phase).toBe("over");
    expect(state.game).toBe(choice.replace(/\d+/, ""));
    expect(["pairs", "all", "limit", "out", "stock", "books"]).toContain(result.result.reason);
    expect(text(element)).toMatch(/You won|You lost|draw/i);
    expect(element.querySelector('.ftg-bar canvas[data-side="them"]').dataset.who).toBe("flick");
    expect(core.ft.live.send).not.toHaveBeenCalled();
  }, 60_000);

  it("lets the player choose the game even when the coin gives Flick the first turn", async () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      document.body.innerHTML = "";
      const element = await phone(fakeCore(), { live: false, solo: true });
      element.table.random = randomBytes(seeded(seed));
      await touch(element, '[data-kit="new"]');
      for (let step = 0; step < 6 && !element.table.view.myTurn; step += 1) await think();
      expect(element.table.view.state.phase, `seed ${seed}`).toBe("choose");
      expect(label(element)).toBe("Card Corner: Choose a game");
    }
  });
});

describe("Card Corner between two phones", () => {
  async function match() {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await touch(one, '[data-kit="new"]');
    for (let at = 0; at < 30 && !one.table.view?.state; at += 1) await tick();
    for (let at = 0; at < 30 && one.table.view.mySide === null; at += 1) await tick();
    const [starter, other] = one.table.view.mySide === 0 ? [one, two] : [two, one];
    return { a, b, starter, other };
  }

  it("has the starter choose the game while the other waits, then shuffles between the two phones and deals the same cards to both", async () => {
    const { starter, other } = await match();
    expect(label(starter)).toBe("Card Corner: Choose a game");
    expect(label(other)).toBe("Card Corner: The other player is choosing the game");
    expect(live(other, "button[data-game]")).toBeNull();
    await press(starter, 'button[data-key="fish"]');
    for (let at = 0; at < 30 && starter.table.view.state.phase !== "play"; at += 1) await tick();
    const moves = starter.table.record.game.moves;
    expect(moves.map((one) => one[0])).toEqual(["g", "c", "s", "r"]);
    expect(other.table.record.game.moves).toEqual(moves);
    expect(other.table.view.state.table).toEqual(starter.table.view.state.table);
    expect(text(other)).toContain("Your turn");
    expect(other.querySelectorAll(".ftg-board button[data-card]")).toHaveLength(7);
  });

  it("plays a whole round of War to its end on both phones", async () => {
    const { starter, other } = await match();
    await press(starter, 'button[data-key="war"]');
    for (let at = 0; at < 30 && starter.table.view.state.phase !== "play"; at += 1) await tick();
    for (let at = 0; at < 400 && !starter.table.view.result; at += 1) await press(starter.table.view.myTurn ? starter : other, 'button[data-key="mine"]');
    const ended = starter.table.view.result;
    expect(["all", "limit"]).toContain(ended.result.reason);
    expect(other.table.view.result.result).toEqual(ended.result);
    expect(`${text(starter)} ${text(other)}`).toMatch(/You won|draw/i);
  }, 60_000);

  it("ends the round on a resignation", async () => {
    const { starter, other } = await match();
    await touch(other, '[data-kit="resign"]');
    await touch(other, '[data-kit="yes"]');
    expect(text(other)).toContain("You lost");
    expect(text(starter)).toContain("You won");
  });
});
