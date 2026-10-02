// The shell every game shares, driven by touch as the user would: the list of matches, a match
// between two phones from the coin to the result, the confirmations inside the plugin, the honest
// messages, the language and the colours. The toy game and its toy board stand in for a real one.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineGame } from "../src/index.js";
import { fakeCore, phones, settle, toy } from "./helpers.js";

/** A board with three buttons, one per toy move; it counts how often it was built and told. */
const built = { mounts: 0, updates: 0, destroyed: 0 };
const toyBoard = {
  mount(host, ctx) {
    built.mounts += 1;
    const paint = (next) => {
      host.innerHTML = `${["p", "w", "d"].map((move) => `<button data-move="${move}" ${next.canPlay ? "" : "disabled"}>${move}</button>`).join("")}<output>${next.state.moves.join("")}</output>`;
      host.onclick = (event) => {
        const move = event.target.closest("[data-move]")?.dataset.move;
        if (move) next.play(move);
      };
    };
    paint(ctx);
    return {
      update(next) {
        built.updates += 1;
        paint(next);
      },
      destroy() {
        built.destroyed += 1;
      },
    };
  },
};

defineGame({
  ...toy,
  tag: "ft-toy",
  app: "1.0.0",
  sides: ["🔺", "🔵"],
  board: toyBoard,
  // Why a round ended, in the game's words (optional).
  how: (result, t) => (result.winner === null ? `${t("name")} level` : `${t("name")} won with w`),
  texts: { en: { name: "Toy" }, es: { name: "Juguete" }, ar: { name: "لعبة" } },
});

const tick = () => settle([...document.querySelectorAll("ft-toy")].map((element) => element.table));

/** A phone with the toy open, as the app opens it. */
async function phone(core, opening = {}) {
  const element = document.createElement("ft-toy");
  element.ft = core.ft;
  document.body.append(element);
  await core.open(opening);
  await tick();
  return element;
}

const press = async (element, selector) => {
  const target = element.querySelector(selector);
  if (!target) throw new Error(`nothing matches ${selector}`);
  target.click();
  await tick();
};
const text = (element) => element.textContent.replace(/\s+/g, " ");

beforeEach(() => {
  vi.useFakeTimers();
  // Clearing the page lets the last test's boards go: count from after that.
  document.body.innerHTML = "";
  built.mounts = 0;
  built.updates = 0;
  built.destroyed = 0;
  globalThis.confirm = vi.fn(() => true);
  globalThis.alert = vi.fn();
  globalThis.prompt = vi.fn();
});
afterEach(() => {
  expect(globalThis.confirm).not.toHaveBeenCalled();
  expect(globalThis.alert).not.toHaveBeenCalled();
  expect(globalThis.prompt).not.toHaveBeenCalled();
  vi.useRealTimers();
});

describe("the list", () => {
  it("opens empty, with a way to start a match, and says nothing to the other phone", async () => {
    const core = fakeCore();
    const element = await phone(core);
    expect(text(element)).toContain("No matches yet");
    expect(element.querySelector('[data-kit="new"]').getAttribute("aria-label")).toBe("New match");
    expect(core.sent).toEqual([]);
  });

  it("outside a conversation, says where to open the game, and starts nothing", async () => {
    const core = fakeCore();
    const element = await phone(core, { live: false });
    expect(text(element)).toContain("Open “Toy” from a conversation to play with someone.");
    await press(element, '[data-kit="new"]');
    expect(core.records.size).toBe(0);
  });

  it("outside a conversation, shows a kept match without playing it or saying anything", async () => {
    const core = fakeCore();
    const first = await phone(core);
    await press(first, '[data-kit="new"]');
    first.remove();
    const sent = core.sent.length;
    const away = await phone(fakeCore({ records: core.records }), { live: false });
    await press(away, '[data-kit="enter"]');
    expect(away.table.screen).toBe("match");
    expect(text(away)).toContain("Open “Toy” from a conversation to play with someone.");
    expect(away.querySelector('[data-kit="resign"]').disabled).toBe(true);
    expect(away.table.ft.live.send).not.toHaveBeenCalled();
    expect(core.sent.length).toBe(sent);
  });

  it("deletes a match only after asking inside the plugin", async () => {
    const core = fakeCore();
    const element = await phone(core);
    await press(element, '[data-kit="new"]');
    await press(element, '[data-kit="back"]');
    expect(element.querySelectorAll(".ftg-row")).toHaveLength(1);
    await press(element, '[data-kit="delete"]');
    expect(text(element)).toContain("Delete this match? It is gone from this phone for good.");
    await press(element, '[data-kit="no"]');
    expect(core.records.size).toBe(1);
    await press(element, '[data-kit="delete"]');
    await press(element, '[data-kit="yes"]');
    expect(core.records.size).toBe(0);
    expect(text(element)).toContain("No matches yet");
  });
});

describe("a match between two phones", () => {
  it("goes from the coin to the result by touch, and the result goes to the chat", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    // The other phone, open on its list, is in the match now; the coin has said who starts.
    expect(two.table.screen).toBe("match");
    const [first, second] = one.table.view.myTurn ? [one, two] : [two, one];
    expect(text(first)).toContain("The coin says you start");
    expect(text(second)).toContain("The coin says they start");
    expect(first.querySelector('.ftg-player.me').classList.contains("turn")).toBe(true);
    expect(second.querySelector('.ftg-player.them').classList.contains("turn")).toBe(true);
    expect(second.querySelector('[data-move="p"]').disabled).toBe(true);

    await press(first, '[data-move="p"]');
    await tick();
    expect(second.querySelector("output").textContent).toBe("p");
    expect(text(second)).toContain("Your turn");
    await press(second, '[data-move="w"]');
    await tick();
    expect(text(second)).toContain("You won");
    expect(text(first)).toContain("You lost");
    expect(first.querySelector(".ftg-score").textContent.replace(/\s/g, "")).toBe("0–1");

    await press(second, '[data-kit="send"]');
    expect(second.ft.say).toHaveBeenCalledWith("🧸 Toy: I won, 1–0");

    // Either side may start the next round; the side that did not start the last one starts it.
    await press(first, '[data-kit="again"]');
    await tick();
    expect(text(second)).toContain("Round 2 · Your turn");
    expect(text(first)).toContain("Round 2 · Their turn");
    // The board was built once for the match and told of every change since.
    expect(built.mounts).toBe(2);
    expect(built.updates).toBeGreaterThan(3);
  });

  it("says why a round ended in the game's words, and lets the board go when it leaves the screen", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first, second] = one.table.view.myTurn ? [one, two] : [two, one];
    await press(first, '[data-move="w"]');
    await tick();
    expect(text(first)).toContain("Toy won with w");
    expect(text(second)).toContain("Toy won with w");
    expect(built.destroyed).toBe(0);
    await press(first, '[data-kit="back"]');
    expect(built.destroyed).toBe(1);
    second.remove();
    expect(built.destroyed).toBe(2);
  });

  it("resigns only after asking inside the plugin", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    await press(one, '[data-kit="resign"]');
    expect(text(one)).toContain("Resign this round? The other person wins it.");
    await press(one, '[data-kit="no"]');
    expect(one.table.view.phase).toBe("play");
    await press(one, '[data-kit="resign"]');
    await press(one, '[data-kit="yes"]');
    await tick();
    expect(text(one)).toContain("You resigned");
    expect(text(two)).toContain("The other person resigned");
    expect(text(two)).toContain("You won");
  });

  it("says plainly that the other person is not there, and tries again when asked", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    await press(one, '[data-kit="new"]');
    expect(text(one)).toContain("Waiting for the other person to open “Toy” in this conversation");
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(one)).toContain("The other person does not have “Toy” open in this conversation.");
    const before = a.sent.length;
    await press(one, '[data-kit="retry"]');
    expect(a.sent.length).toBe(before + 1);
  });

  it("while nobody is on the other side, says what to do — and stops saying it once they are there", async () => {
    const HINT = "The other person has to open this game too. To invite them, close the game and tap 🎮 and then 📨 in the chat.";
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    await press(one, '[data-kit="new"]');
    // Waiting for someone, not loading: a person and an hourglass that does not move.
    expect(text(one)).toContain(HINT);
    expect(one.querySelector(".ftg-hint-under")).not.toBeNull();
    expect(one.querySelector(".ftg-breathe, .ftg-coin")).toBeNull();
    expect(one.querySelector(".ftg-wait").textContent).toContain("👤");
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(one)).toContain("The other person does not have “Toy” open in this conversation.");
    expect(text(one)).toContain(HINT);
    // They open the game: the invitation goes again, they join, and the hint is gone.
    b.closed = false;
    const two = await phone(b);
    await press(one, '[data-kit="retry"]');
    await tick();
    expect(two.table.screen).toBe("match");
    expect(text(one)).not.toContain(HINT);
    // The same in a match both already play, when the other has closed the game.
    await press(one, '[data-kit="back"]');
    b.closed = true;
    two.remove();
    await press(one, '[data-kit="enter"]');
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(one)).toContain(HINT);
  });

  it("says it is reaching the other phone while the hello is on its way, until the answer or its absence", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    await press(one, '[data-kit="back"]');
    b.closed = true;
    two.remove();
    await press(one, '[data-kit="enter"]');
    expect(text(one)).toContain("Reaching the other phone…");
    await vi.advanceTimersByTimeAsync(8_100);
    expect(text(one)).not.toContain("Reaching the other phone…");
    expect(text(one)).toContain("The other person does not have “Toy” open in this conversation.");
  });

  it("says honestly which phone did not reveal the coin when a match is abandoned", async () => {
    const one = await phone(fakeCore());
    await press(one, '[data-kit="new"]');
    const record = one.table.record;
    one.table.record = { ...record, game: { ...record.game, b: "wother", end: { k: "abandoned", by: record.me } } };
    one.paint();
    expect(text(one)).toContain("This phone did not reveal the coin in time: this match was abandoned.");
    one.table.record = { ...record, me: "wother", game: { ...record.game, b: "wother", end: { k: "abandoned", by: record.game.a } } };
    one.table.notice = { key: "abandoned" };
    one.paint();
    expect(text(one)).toContain("The other person did not reveal the coin in time: this match was abandoned.");
  });

  it("always offers the choice when the two phones parted ways, whatever else it has to say", async () => {
    const core = fakeCore();
    const one = await phone(core);
    await press(one, '[data-kit="new"]');
    one.table.record = { ...one.table.record, fork: ["p"] };
    one.table.notice = { key: "notOpen" };
    one.paint();
    expect(text(one)).toContain("Your two phones disagree about this match. Which one goes on?");
    expect(one.querySelector('[data-kit="fork-mine"]')).not.toBeNull();
    expect(one.querySelector('[data-kit="fork-theirs"]')).not.toBeNull();
    expect(text(one)).toContain("The other person does not have “Toy” open in this conversation.");
  });

  it("asks before leaving one match for the one the other person started", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    await press(one, '[data-kit="back"]');
    await press(one, '[data-kit="new"]');
    await tick();
    expect(text(two)).toContain("The other person started a new match.");
    expect(text(one)).toContain("The other person is in another match.");
    await press(two, '[data-kit="join"]');
    await tick();
    expect(two.table.record.id).toBe(one.table.record.id);
    expect(one.table.view.phase).toBe("play");
  });
});

describe("the look", () => {
  it("speaks the phone's language, runs right to left in Arabic, and paints dark when the app is dark", async () => {
    const es = await phone(fakeCore(), { lang: "es" });
    expect(es.querySelector('[data-kit="new"]').getAttribute("aria-label")).toBe("Nueva partida");
    expect(es.querySelector(".ftg").getAttribute("dir")).toBe("ltr");
    document.body.innerHTML = "";
    const ar = await phone(fakeCore(), { lang: "ar", dark: true });
    const root = ar.querySelector(".ftg");
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.getAttribute("lang")).toBe("ar");
    expect(root.hasAttribute("data-dark")).toBe(true);
    expect(text(ar)).toContain("لا توجد مباريات بعد");
    // Everything around it runs right to left; a board never does (its cells and lines are drawn left to right).
    await press(ar, '[data-kit="new"]');
    expect(ar.querySelector('[data-part="board"]').getAttribute("dir")).toBe("ltr");
  });

  it("gives every button a name in the user's language and a finger-sized target", async () => {
    const element = await phone(fakeCore(), { lang: "fr" });
    await press(element, '[data-kit="new"]');
    for (const button of element.querySelectorAll("button[data-kit]")) {
      expect(button.getAttribute("aria-label") || button.textContent.trim(), button.outerHTML).toBeTruthy();
    }
    expect(element.querySelector('[data-kit="resign"]').getAttribute("aria-label")).toBe("Abandonner");
    expect(document.head.querySelector("style[data-ftg]").textContent).toMatch(/min-height:\s*44px/);
  });
});
