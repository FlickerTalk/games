// The shell every game shares, driven by touch as the user would: the list of matches, a match
// between two phones from the coin to the result, the confirmations inside the plugin, the honest
// messages, the language and the colours. The toy game and its toy board stand in for a real one.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, defineGame } from "../src/index.js";
import { FRAME_START, PENDING_GRACE_MS } from "../src/shell.js";
import { FLASH_MS } from "../src/toast.js";
import { fakeCore, phones, settle, toy, within, words } from "./helpers.js";

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
  const target = within(element, selector);
  if (!target) throw new Error(`nothing matches ${selector}`);
  target.click();
  await tick();
};
const text = (element) => words(element).replace(/\s+/g, " ");
/** What the user reads now: the page, and the question asked over it (Ionic's alert, in the frame's body). */
const shown = (element) => `${text(element)} ${text(element.alert)}`;
/** A button's name for screen readers: Ionic hands it to the native button inside its own. */
const nameOf = (node) => node.getAttribute("aria-label") ?? node.shadowRoot?.querySelector("button")?.getAttribute("aria-label") ?? null;
/** What the toast at the top says (its words, without the icon), when the frame draws it (an app without `ft.notify`). */
const toastText = (element) => {
  const node = element.querySelector(".ftg-toast");
  return node && !node.hidden ? text(node.querySelector(".say")).trim() : "";
};

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

describe("the first paint", () => {
  /** The toy in the page, as the frame script puts it there, before the app opens it. */
  const unopened = (core) => {
    const element = document.createElement("ft-toy");
    element.ft = core.ft;
    document.body.append(element);
    return element;
  };

  it("draws nothing before the app says the language and the conversation, and keeps the frame at the height it opened with", async () => {
    const core = fakeCore();
    const element = unopened(core);
    // Something arriving from the other phone before the opening draws again: still nothing.
    await core.hear("not yet");
    await tick();
    expect(text(element).trim()).toBe("");
    expect(element.querySelector(".ftg-empty, .ftg-hero, .ftg-hint, svg, button")).toBeNull();
    expect(element.querySelector(".ftg").style.minHeight).toBe(`${FRAME_START}px`);
  });

  it("paints the shell already in the user's language, never in English first", async () => {
    const core = fakeCore();
    const element = unopened(core);
    // What is on the screen from the moment the element is in the page, and after every paint.
    const painted = [text(element).trim()];
    const paint = element.paint.bind(element);
    element.paint = () => {
      paint();
      painted.push(text(element).trim());
    };
    await core.open({ lang: "es" });
    await tick();
    const visible = painted.filter(Boolean);
    expect(visible.length).toBeGreaterThan(0);
    for (const seen of visible) {
      expect(seen).toContain("Partidas");
      expect(seen).not.toMatch(/Matches|No matches/);
    }
    expect(element.querySelector(".ftg").style.minHeight).toBe("");
  });

  it("still paints the shell, in the user's language, when the matches cannot be read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const core = fakeCore();
    core.ft.records.keys = async () => {
      throw new Error("records unavailable");
    };
    const element = await phone(core, { lang: "es" });
    expect(text(element)).toContain("Partidas");
  });
});

describe("the list", () => {
  it("opens empty, with a way to start a match, and says nothing to the other phone", async () => {
    const core = fakeCore();
    const element = await phone(core);
    expect(text(element)).toContain("No matches yet");
    expect(nameOf(element.querySelector('[data-kit="new"]'))).toBe("New match");
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
    expect(shown(element)).toContain("Delete this match? It is gone from this phone for good.");
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
    // With the line that says who won, in the toast at the top.
    expect(toastText(first)).toBe("You won · Toy won with w");
    expect(toastText(second)).toBe("You lost · Toy won with w");
    expect(built.destroyed).toBe(0);
    await press(first, '[data-kit="back"]');
    expect(built.destroyed).toBe(1);
    second.remove();
    expect(built.destroyed).toBe(2);
  });

  it("stays usable after the result went to the chat: the game room keeps the game open", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first, second] = one.table.view.myTurn ? [one, two] : [two, one];
    await press(first, '[data-move="w"]');
    await press(first, '[data-kit="send"]');
    expect(first.ft.say).toHaveBeenCalledTimes(1);
    expect(first.ft.close).not.toHaveBeenCalled();
    // Still the result, with everything still there to press.
    expect(first.isConnected).toBe(true);
    expect(text(first)).toContain("You won");
    for (const act of ["send", "again", "back"]) expect(first.querySelector(`[data-kit="${act}"]`).disabled, act).toBe(false);
    await press(first, '[data-kit="send"]');
    expect(first.ft.say).toHaveBeenCalledTimes(2);
    await press(first, '[data-kit="again"]');
    await tick();
    expect(text(second)).toContain("Round 2 · Your turn");
    await press(first, '[data-kit="back"]');
    expect(first.table.screen).toBe("list");
  });

  it("does not ask for the screen's height: the game room gives it the space between its bar and the composer", () => {
    const css = document.head.querySelector("style[data-ftg]")?.textContent ?? "";
    expect(css).not.toMatch(/\d+(?:\.\d+)?d?vh\b/);
    const root = css.match(/\.ftg\{[^}]*\}/)?.[0] ?? css.match(/\.ftg \{[^}]*\}/)?.[0] ?? "";
    expect(root).toContain("color");
    expect(root).not.toMatch(/(?:^|[;{\s])(?:min-)?height\s*:/);
  });

  it("resigns only after asking inside the plugin", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    await press(one, '[data-kit="resign"]');
    expect(shown(one)).toContain("Resign this round? The other person wins it.");
    await press(one, '[data-kit="no"]');
    expect(one.table.view.phase).toBe("play");
    await press(one, '[data-kit="resign"]');
    await press(one, '[data-kit="yes"]');
    await tick();
    expect(toastText(one)).toContain("You resigned");
    expect(toastText(two)).toContain("The other person resigned");
    expect(text(two)).toContain("You won");
  });

  it("says plainly that the other person is not there, and tries again when asked", async () => {
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    await press(one, '[data-kit="new"]');
    // Waiting for them, the toast says how to invite them (an app with its own toast says it is waiting).
    expect(toastText(one)).toContain("The other person has to open this game too.");
    await vi.advanceTimersByTimeAsync(8_100);
    // Nobody answered the invitation: the toast says how to invite them (the app's mail button
    // drawn in the sentence), and "try again" is in the bar.
    const notice = one.querySelector(".ftg-toast");
    expect(text(notice)).toContain("The other person has to open this game too. Tap above to invite them.");
    expect(notice.querySelector(".say svg.ftg-ico")).not.toBeNull();
    expect(one.querySelector('.ftg-bar [data-kit="retry"]')).not.toBeNull();
    const before = a.sent.length;
    await press(one, '[data-kit="retry"]');
    expect(a.sent.length).toBe(before + 1);
  });

  it("while nobody is on the other side, says what to do — and stops saying it once they are there", async () => {
    const HINT = "The other person has to open this game too. Tap above to invite them.";
    const { a, b } = phones();
    b.closed = true;
    const one = await phone(a);
    await press(one, '[data-kit="new"]');
    // Waiting for a person, not loading: the board ready in its own colours (only not playable),
    // nothing over it and nothing moving; the person who is missing is in the line read first.
    expect(toastText(one)).toContain(HINT);
    expect(one.querySelector(".ftg-stage").classList.contains("dim")).toBe(false);
    expect(one.querySelector('[data-part="overlay"]').children).toHaveLength(0);
    expect(one.querySelector(".ftg-toast svg.ftg-ico")).not.toBeNull();
    expect(one.querySelector('[data-move="p"]').disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(8_100);
    // Nobody answered: the toast still says how to invite them, once, and "try again" is in the bar.
    const count = (needle) => text(one).split(needle).length - 1;
    expect(count(HINT)).toBe(1);
    expect(one.querySelector('.ftg-bar [data-kit="retry"]')).not.toBeNull();
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
    expect(toastText(one)).toContain("The other person does not have “Toy” open in this conversation.");
    expect(one.querySelector('.ftg-bar [data-kit="retry"]')).not.toBeNull();
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
    one.table.record = { ...one.table.record, game: { ...one.table.record.game, b: "wother" }, fork: ["p"] };
    one.table.notice = { key: "notOpen" };
    one.paint();
    expect(text(one)).toContain("Your two phones disagree about this match. Which one goes on?");
    // A choice over the board, which cannot be played until it is made: nothing above it moves.
    expect(one.querySelector('[data-part="overlay"] [data-kit="fork-mine"]')).not.toBeNull();
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
    expect(two.querySelector('[data-part="overlay"] [data-kit="join"]')).not.toBeNull();
    await press(two, '[data-kit="join"]');
    await tick();
    expect(two.table.record.id).toBe(one.table.record.id);
    expect(one.table.view.phase).toBe("play");
  });
});

describe("what the user is told: a toast at the top, the board never moves", () => {
  /** Everything laid out above the board, as it is drawn: what would push the board down. */
  const above = (element) => {
    const stage = element.querySelector(".ftg-stage");
    const flow = [];
    for (let node = stage; node && node !== element.querySelector(".ftg"); node = node.parentElement) {
      for (let before = node.previousElementSibling; before; before = before.previousElementSibling) flow.push(before.outerHTML);
    }
    return flow;
  };
  /** A match on this phone whose other side never answers: a turn, then a notice. */
  const match = async (core) => {
    const one = await phone(core);
    await press(one, '[data-kit="new"]');
    return one;
  };
  const css = () => document.head.querySelector("style[data-ftg]").textContent.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
  const rule = (selector) => ` }${css()}`.match(new RegExp(`\\}\\s*${selector.replace(/[.[\]]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

  it("floats the toast over the page from a band kept at the top since the first paint, always as tall", async () => {
    const core = fakeCore();
    const element = document.createElement("ft-toy");
    element.ft = core.ft;
    document.body.append(element);
    const root = element.querySelector(".ftg");
    // Before the app opens the game, the band is already there.
    expect(root.hasAttribute("data-band")).toBe(true);
    expect(rule(".ftg")).toMatch(/position: relative/);
    expect(rule(".ftg")).toMatch(/--ftg-band: \d+px/);
    expect(rule(".ftg[data-band]")).toMatch(/padding-top: calc\(var\(--ftg-band\)/);
    expect(rule(".ftg-toast")).toMatch(/position: absolute/);
    await core.open();
    await tick();
    expect(root.hasAttribute("data-band")).toBe(true);
    // The toast is the root's own child, out of what is laid out above the board.
    await press(element, '[data-kit="new"]');
    expect(element.querySelector(".ftg-toast").parentElement).toBe(root);
    expect(element.querySelector(".ftg-main .ftg-toast, .ftg-status, .ftg-hint-under, .ftg-banners")).toBeNull();
  });

  it("shows a notice without changing anything above the board", async () => {
    const one = await match(fakeCore());
    const before = above(one);
    one.table.notice = { key: "badMove" };
    one.paint();
    expect(toastText(one)).toContain("breaks the rules");
    expect(above(one)).toEqual(before);
    vi.advanceTimersByTime(FLASH_MS);
    one.paint();
    expect(above(one)).toEqual(before);
  });

  it("shows one notice at a time: the next one takes the last one's place", async () => {
    const one = await match(fakeCore());
    one.table.notice = { key: "unreachable" };
    one.paint();
    one.table.notice = { key: "badMove" };
    one.paint();
    expect(one.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(toastText(one)).toContain("breaks the rules");
    expect(toastText(one)).not.toContain("cannot be reached");
  });

  it("lets a notice go after a few seconds, back to the line that says where the match stands", async () => {
    const one = await match(fakeCore());
    const standing = toastText(one);
    one.table.notice = { key: "badMove" };
    one.paint();
    vi.advanceTimersByTime(FLASH_MS - 1);
    expect(toastText(one)).toContain("breaks the rules");
    vi.advanceTimersByTime(1);
    expect(toastText(one)).toBe(standing);
  });

  it("keeps whose turn it is up for as long as it holds", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first] = one.table.view.myTurn ? [one, two] : [two, one];
    await press(first, '[data-move="p"]');
    await tick();
    const second = first === one ? two : one;
    await vi.advanceTimersByTimeAsync(FLASH_MS * 5);
    expect(toastText(second)).toBe("Your turn");
    expect(toastText(first)).toBe("Their turn");
  });

  // Seen on the phones (2026-10-06): after every move both showed "has not reached the other phone
  // yet" for a few seconds, both games open and the connection direct: a move on its way is not a
  // stuck one.
  it("never says a move has not arrived while it is only on its way, and acknowledged within the grace", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    // A slow but working connection: each message takes a second, so the answer comes in two.
    for (const [from, to] of [[a, b], [b, a]]) from.wire = (data) => setTimeout(() => to.hear(data), 1000);
    const [first, second] = one.table.view.myTurn ? [one, two] : [two, one];
    const told = [];
    const watch = new MutationObserver(() => told.push(toastText(first)));
    watch.observe(first, { subtree: true, childList: true, characterData: true, attributes: true });
    await press(first, '[data-move="p"]');
    expect(first.table.view.pending).toBeGreaterThan(0);
    for (let at = 0; at < PENDING_GRACE_MS - 500; at += 250) {
      await vi.advanceTimersByTimeAsync(250);
      told.push(toastText(first));
    }
    await tick();
    expect(first.table.view.pending).toBe(0);
    expect(second.querySelector("output").textContent).toBe("p");
    // And the next move counts its own wait, not from the first one's.
    await press(second, '[data-move="p"]');
    await vi.advanceTimersByTimeAsync(PENDING_GRACE_MS);
    await tick();
    await press(first, '[data-move="p"]');
    for (let at = 0; at < PENDING_GRACE_MS - 500; at += 250) {
      await vi.advanceTimersByTimeAsync(250);
      told.push(toastText(first));
    }
    watch.disconnect();
    expect(first.table.view.pending).toBe(0);
    expect(second.querySelector("output").textContent).toBe("ppp");
    expect(told.filter((one) => one.includes("has not reached"))).toEqual([]);
  });

  it("still says a move has not arrived once it has waited longer than the grace (the other phone closed)", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first] = one.table.view.myTurn ? [one, two] : [two, one];
    (first === one ? b : a).closed = true;
    await press(first, '[data-move="p"]');
    await vi.advanceTimersByTimeAsync(PENDING_GRACE_MS - 100);
    expect(toastText(first)).not.toContain("has not reached");
    await vi.advanceTimersByTimeAsync(200);
    expect(toastText(first)).toContain("Your move has not reached the other phone yet.");
  });

  it("hands every text to the app's own toast when it has one, and keeps no band for it", async () => {
    const { a, b } = phones();
    a.ft.notify = vi.fn();
    b.ft.notify = vi.fn();
    const one = await phone(a);
    const two = await phone(b);
    expect(one.querySelector(".ftg").hasAttribute("data-band")).toBe(false);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first, second] = one.table.view.myTurn ? [one, two] : [two, one];
    expect(first.ft.notify).toHaveBeenLastCalledWith("The coin says you start", { sticky: true });
    expect(second.ft.notify).toHaveBeenLastCalledWith("The coin says they start", { sticky: true });
    expect(one.querySelector(".ftg-toast")).toBeNull();
    // A notice goes to the app too, and nothing above the board moves.
    const before = above(first);
    first.table.notice = { key: "badMove" };
    first.paint();
    expect(first.ft.notify).toHaveBeenLastCalledWith("The other phone sent a move that breaks the rules. It was not applied.", { sticky: false });
    expect(above(first)).toEqual(before);
    vi.advanceTimersByTime(FLASH_MS);
    expect(first.ft.notify).toHaveBeenLastCalledWith("The coin says you start", { sticky: true });
    // Leaving the match takes the standing text away.
    await press(first, '[data-kit="back"]');
    expect(first.ft.notify).toHaveBeenLastCalledWith("", { sticky: false });
  });

  it("never hides the end of a round behind a passing notice", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first] = one.table.view.myTurn ? [one, two] : [two, one];
    first.boardContext(first.table.view).notify("Nice move");
    expect(toastText(first)).toBe("Nice move");
    await press(first, '[data-move="w"]');
    await tick();
    expect(toastText(first)).toBe("You won · Toy won with w");
  });

  it("passes on what a board has to say, as a passing notice", async () => {
    const one = await match(fakeCore());
    one.board = null;
    const ctx = one.boardContext(one.table.view);
    ctx.notify("Already said");
    expect(toastText(one)).toBe("Already said");
    vi.advanceTimersByTime(FLASH_MS);
    expect(toastText(one)).not.toBe("Already said");
  });
});

describe("the look", () => {
  it("speaks the phone's language, runs right to left in Arabic, and paints dark when the app is dark", async () => {
    const es = await phone(fakeCore(), { lang: "es" });
    expect(nameOf(es.querySelector('[data-kit="new"]'))).toBe("Nueva partida");
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

  it("knows whether the app gave its colours, on every repaint", async () => {
    const one = await phone(fakeCore());
    const root = () => one.querySelector(".ftg");
    expect(root().hasAttribute("data-themed")).toBe(false);
    document.documentElement.style.setProperty("--ion-background-color", "#0d0b0a");
    try {
      one.paint();
      expect(root().hasAttribute("data-themed")).toBe(true);
    } finally {
      document.documentElement.style.removeProperty("--ion-background-color");
    }
    one.paint();
    expect(root().hasAttribute("data-themed")).toBe(false);
  });

  it("takes the app's secondary-text colour only where it reads, and follows a theme switched live", async () => {
    const page = document.documentElement.style;
    const set = (vars) => Object.entries(vars).forEach(([name, value]) => page.setProperty(name, value));
    const vars = ["--ion-background-color", "--ion-text-color", "--ion-color-medium"];
    try {
      set({ "--ion-background-color": "#000000", "--ion-text-color": "#f5f5f5", "--ion-color-medium": "#8e8e8e" });
      const one = await phone(fakeCore());
      const root = () => one.querySelector(".ftg");
      expect(root().hasAttribute("data-medium")).toBe(true);
      // Mono light, switched with the game open: 4.47:1 on the surface, so not used.
      set({ "--ion-background-color": "#ffffff", "--ion-text-color": "#0a0a0a", "--ion-color-medium": "#6e6e6e" });
      await tick();
      expect(root().hasAttribute("data-medium")).toBe(false);
    } finally {
      for (const name of vars) page.removeProperty(name);
    }
  });

  it("gives every button a name in the user's language and a finger-sized target", async () => {
    const element = await phone(fakeCore(), { lang: "fr" });
    await press(element, '[data-kit="new"]');
    for (const button of element.querySelectorAll("[data-kit]")) {
      expect(nameOf(button) || text(button).trim(), button.outerHTML).toBeTruthy();
    }
    expect(nameOf(element.querySelector('[data-kit="resign"]'))).toBe("Abandonner");
    expect(document.head.querySelector("style[data-ftg]").textContent).toMatch(/min-height:\s*44px/);
  });
});

describe("Ionic's structure, lent by the app", () => {
  const ionic = (node) => [...node.children].map((one) => one.localName).filter((name) => name.startsWith("ion-"));

  it("lays the list out as a page: a header with its toolbar, then the content, and no footer", async () => {
    const element = await phone(fakeCore());
    const root = element.querySelector(".ftg");
    expect(ionic(root)).toEqual(["ion-header", "ion-content"]);
    const toolbar = root.querySelector(":scope > ion-header > ion-toolbar");
    expect(text(toolbar.querySelector(":scope > ion-title"))).toBe("Matches");
    expect(nameOf(toolbar.querySelector(':scope > ion-buttons > ion-button[data-kit="new"]'))).toBe("New match");
    const content = root.querySelector(":scope > ion-content");
    expect(content.getAttribute("scroll-y")).toBe("false");
    expect(content.querySelector(".ftg-empty")).not.toBeNull();
    expect(element.querySelector("ion-footer")).toBeNull();
  });

  it("lays a match out the same way: the way back, the score and the actions in the toolbar, the board in the content", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const root = one.querySelector(".ftg");
    expect(ionic(root)).toEqual(["ion-header", "ion-content"]);
    const toolbar = root.querySelector(":scope > ion-header > ion-toolbar.ftg-bar");
    expect(toolbar.querySelector(':scope > ion-buttons[slot="start"] > ion-button[data-kit="back"]')).not.toBeNull();
    expect(toolbar.querySelector(":scope > ion-title .ftg-score")).not.toBeNull();
    expect(toolbar.querySelector(':scope > ion-buttons[slot="end"] > ion-button[data-kit="resign"]')).not.toBeNull();
    const content = root.querySelector(":scope > ion-content");
    expect(content.getAttribute("scroll-y")).toBe("false");
    const main = content.querySelector(":scope > .ftg-main");
    for (const part of ["players", "result", "stage"]) expect(main.querySelector(`:scope > [data-part="${part}"]`), part).not.toBeNull();
    expect(main.querySelector('[data-part="stage"] > [data-part="board"]').getAttribute("dir")).toBe("ltr");
    expect(one.querySelector("ion-footer")).toBeNull();
  });

  it("draws every action as Ionic's button; the one hand-made button left opens a match from the list", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first] = one.table.view.myTurn ? [one, two] : [two, one];
    await press(first, '[data-move="w"]');
    await tick();
    const kinds = (element) => [...element.querySelectorAll(".ftg [data-kit]")].map((node) => `${node.localName}:${node.dataset.kit}`);
    // The result: send and another round, besides the bar.
    expect(kinds(first)).toEqual(expect.arrayContaining(["ion-button:back", "ion-button:resign", "ion-button:send", "ion-button:again"]));
    await press(first, '[data-kit="back"]');
    for (const kind of kinds(first)) expect(kind, kind).toMatch(/^ion-button:|^button:enter$/);
    expect(kinds(first)).toEqual(expect.arrayContaining(["ion-button:new", "button:enter", "ion-button:delete"]));
  });

  it("keeps the toolbar and its buttons across repaints, so nothing flashes while a match goes on", async () => {
    const { a, b } = phones();
    const one = await phone(a);
    const two = await phone(b);
    await press(one, '[data-kit="new"]');
    await tick();
    const [first] = one.table.view.myTurn ? [one, two] : [two, one];
    // The same nodes, not only alike: a node drawn again is a frame without it.
    const same = (element, selectors) => {
      const kept = selectors.map((selector) => element.querySelector(selector));
      for (const node of kept) expect(node).not.toBeNull();
      return () => selectors.forEach((selector, at) => expect(element.querySelector(selector) === kept[at], selector).toBe(true));
    };
    const still = same(first, ["ion-header", "ion-toolbar", "ion-content", '[data-kit="back"]', '[data-kit="resign"]']);
    await press(first, '[data-move="p"]');
    await tick();
    first.table.notice = { key: "badMove" };
    first.paint();
    still();
    // The resignation is still there, only not playable on the other side's turn.
    expect(first.querySelector('[data-kit="resign"]').disabled).toBe(false);
    await press(first, '[data-kit="back"]');
    const listed = same(first, ["ion-toolbar", '[data-kit="new"]', "ion-content"]);
    first.paint();
    listed();
  });

  it("asks with Ionic's alert, in the user's language and direction", async () => {
    const element = await phone(fakeCore(), { lang: "ar" });
    await press(element, '[data-kit="new"]');
    await press(element, '[data-kit="back"]');
    await press(element, '[data-kit="delete"]');
    // Shown by Ionic over the page, in the frame's body; one question at a time.
    const alert = document.querySelector("ion-alert");
    expect(alert).not.toBeNull();
    expect(document.querySelectorAll("ion-alert")).toHaveLength(1);
    await press(element, '[data-kit="no"]');
    await press(element, '[data-kit="delete"]');
    expect(document.querySelectorAll("ion-alert")).toHaveLength(1);
    expect(element.alert).toBe(document.querySelector("ion-alert"));
    expect(alert.getAttribute("dir")).toBe("rtl");
    expect(alert.message).toBe(KIT_TEXTS.ar.confirmDelete);
    expect(alert.buttons.map((one) => [one.role, one.htmlAttributes["data-kit"]])).toEqual([["cancel", "no"], ["destructive", "yes"]]);
    expect(element.querySelector(".ftg-dialog")).toBeNull();
  });

  it("gives the content the height of what it holds, so the frame still follows its content", async () => {
    const measured = HTMLElement.prototype.getBoundingClientRect;
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      const rect = measured.call(this);
      return this.classList.contains("ftg-main") || this.classList.contains("ftg-body") ? { ...rect, height: 432, bottom: rect.top + 432 } : rect;
    });
    try {
      const element = await phone(fakeCore());
      expect(element.querySelector("ion-content").style.height).toBe("432px");
      await press(element, '[data-kit="new"]');
      expect(element.querySelector("ion-content").style.height).toBe("432px");
    } finally {
      spy.mockRestore();
    }
  });
});
