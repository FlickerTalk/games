// The board of Word Duel: the secret word typed or suggested and set (kept in the store, the
// commitment handed to the kit), the guesses as rows of coloured tiles beside the other side's,
// a guess typed and sent with the honest answer attached, the closing answer and the reveal sent
// on their own, and the other side's word shown at the end.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { MARKS, STYLE, board, cleaned, storeKey } from "../src/board.js";
import { TEXTS } from "../src/texts.js";
import { commitHash, commitText, commitTextSecond, feedback, honestAnswer, initial, play, result, revealText, turn } from "../src/rules.js";
import { fromBase64url } from "../src/sha256.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const SALT = new Uint8Array(24).fill(0x5a);
const PLACED = [commitText("en", SALT, "crane"), commitTextSecond(SALT, "eagle")];

function context(moves, extra = {}) {
  let state = initial();
  for (const move of moves) state = play(state, typeof move === "function" ? move(state) : move, turn(state)).state;
  const over = result(state);
  return {
    state,
    view: { me: "me-1", index: 0, round: { moves } },
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

const type = (host, name, value) => {
  const field = host.querySelector(`[name="${name}"]`);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
};

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});

describe("the secret word", () => {
  it("is typed or suggested, checked against the word list, and set with a commitment the kit gets", async () => {
    const host = document.createElement("div");
    const ctx = context([]);
    board.mount(host, ctx);
    await tick();
    expect(host.textContent).toContain("Five letters");
    expect(host.querySelector('[data-act="commit"]').disabled).toBe(true);
    type(host, "secret", "ZZZZZ");
    expect(host.textContent).toContain("Not in the word list");
    expect(host.querySelector('[data-act="commit"]').disabled).toBe(true);
    type(host, "secret", "Crane");
    expect(host.querySelector('[data-act="commit"]').disabled).toBe(false);
    host.querySelector('[data-act="commit"]').click();
    await tick();
    await tick();
    expect(ctx.play).toHaveBeenCalledTimes(1);
    const move = ctx.play.mock.calls[0][0];
    expect(move).toMatch(/^cen[A-Za-z0-9_-]{43}$/);
    const kept = JSON.parse(store.get(storeKey("me-1", 0)));
    expect(kept.word).toBe("crane");
    expect(`cen${commitHash(fromBase64url(kept.salt), "crane")}`).toBe(move);
  });

  it("suggests a common word, in Spanish for a Spanish phone, and side 1 commits without the language", async () => {
    const host = document.createElement("div");
    const ctx = context([PLACED[0]], { lang: "es", t: (key, vars) => translate("es", key, vars) });
    board.mount(host, ctx);
    await tick();
    host.querySelector('[data-act="suggest"]').click();
    const typed = host.querySelector('[name="secret"]').value;
    expect(typed).toMatch(/^[a-z]{5}$/);
    // The words follow side 0's language (English here), whatever this phone speaks.
    const { accepted } = await import("../src/rules.js");
    expect(accepted("en", typed)).toBe(true);
    host.querySelector('[data-act="commit"]').click();
    await tick();
    await tick();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const spanish = document.createElement("div");
    board.mount(spanish, context([], { lang: "es", t: (key, vars) => translate("es", key, vars) }));
    await tick();
    spanish.querySelector('[data-act="suggest"]').click();
    expect(accepted("es", spanish.querySelector('[name="secret"]').value)).toBe(true);
    expect(spanish.textContent).toContain("Cinco letras");
  });

  it("cleans what is typed: lower case, accents off, ñ kept, letters only", () => {
    expect(cleaned("SEÑOR")).toBe("señor");
    expect(cleaned("árbol")).toBe("arbol");
    expect(cleaned("c r-a1ne")).toBe("crane");
    expect(cleaned("abcdefgh")).toBe("abcde");
  });

  it("says so when the word it committed is no longer on this phone", async () => {
    const host = document.createElement("div");
    const ctx = context(PLACED, { mySide: 0, canPlay: true });
    board.mount(host, ctx);
    await tick();
    await tick();
    expect(host.textContent).toContain("no longer on this phone");
    expect(ctx.play).not.toHaveBeenCalled();
  });
});

/** A board for side `me` whose word is kept in the store already. */
async function kept(moves, me, word, extra = {}) {
  store.set(storeKey("me-1", 0), JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", word }));
  const host = document.createElement("div");
  const ctx = context(moves, { mySide: me, ...extra });
  const mounted = board.mount(host, ctx);
  await tick();
  await tick();
  return { host, ctx, mounted };
}

describe("guessing", () => {
  it("shows the guesses as coloured tiles, both sides', and sends a guess with the honest answer", async () => {
    // Side 1 (word eagle) to move: side 0 guessed "stare".
    const { host, ctx } = await kept([...PLACED, ">stare"], 1, "eagle");
    expect(host.querySelectorAll(".fwd-grid")).toHaveLength(2);
    // The other side's row shows the answer this phone will give: s t a r e against eagle.
    const theirRow = host.querySelectorAll(".fwd-grid.small .fwd-row")[0];
    expect([...theirRow.querySelectorAll(".fwd-tile")].map((tile) => tile.textContent)).toEqual(["S", "T", "A", "R", "E"]);
    expect([...theirRow.querySelectorAll(".fwd-tile")].map((tile) => tile.className.replace("fwd-tile", "").trim()).join("")).toBe(feedback("stare", "eagle"));
    expect(host.querySelector('[data-act="guess"]').disabled).toBe(true);
    type(host, "guess", "about");
    expect(host.querySelector('[data-act="guess"]').disabled).toBe(false);
    host.querySelector('[data-act="guess"]').click();
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(`${feedback("stare", "eagle")}>about`);
  });

  it("colours this side's guesses by the other side's answers, and names each tile", async () => {
    const moves = [...PLACED, ">stare", (s) => `${honestAnswer(s, 1, "eagle")}>about`];
    const { host } = await kept(moves, 0, "crane");
    const myRow = host.querySelectorAll(".fwd-grid:not(.small) .fwd-row")[0];
    const tiles = [...myRow.querySelectorAll(".fwd-tile")];
    expect(tiles.map((tile) => tile.textContent).join("")).toBe("STARE");
    expect(tiles[4].classList.contains("g")).toBe(true);
    expect(tiles[4].getAttribute("aria-label")).toBe("E: right place");
    expect(tiles[0].getAttribute("aria-label")).toBe("S: not in the word");
  });

  it("sends the closing answer on its own once the round is decided, then the reveal, and shows the other word", async () => {
    const answerB = (s) => honestAnswer(s, 1, "eagle");
    const answerA = (s) => honestAnswer(s, 0, "crane");
    const moves = [...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`];
    const { host, ctx, mounted } = await kept(moves, 0, "crane");
    expect(host.textContent).toContain("You have the word!");
    expect(ctx.play).toHaveBeenCalledTimes(1);
    expect(ctx.play.mock.calls[0][0]).toBe(feedback("other", "crane"));
    const revealPhase = context([...moves, answerA], { mySide: 0, play: ctx.play });
    ctx.play.mockClear();
    mounted.update(revealPhase);
    expect(ctx.play).toHaveBeenCalledWith(revealText(fromBase64url("WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa"), "crane"));
    const done = context([...moves, answerA, revealText(SALT, "crane"), revealText(SALT, "eagle")], { mySide: 0 });
    expect(done.result.winner).toBe(0);
    mounted.update(done);
    expect(host.textContent).toContain("Their word was EAGLE");
    expect(MARKS).toHaveLength(2);
  });
});

/** The selectors a container query of `STYLE` hides (`display: none`) when the board is small. */
function hiddenWhenSmall() {
  const selectors = [];
  for (const start of [...STYLE.matchAll(/@container[^{]*\{/g)].map((found) => found.index + found[0].length)) {
    let depth = 1;
    let end = start;
    while (depth) {
      if (STYLE[end] === "{") depth += 1;
      if (STYLE[end] === "}") depth -= 1;
      end += 1;
    }
    for (const [, selector, body] of STYLE.slice(start, end - 1).matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (/display:\s*none/.test(body)) selectors.push(...selector.split(",").map((one) => one.trim()));
    }
  }
  return selectors;
}

describe("the result", () => {
  // The other side's word is what the loser most wants to see; on a phone the result card leaves
  // the board small, and the small board used to hide it with the other notes.
  it("shows the other side's word to the side that lost, even on a small board", async () => {
    const answerB = (s) => honestAnswer(s, 1, "eagle");
    const answerA = (s) => honestAnswer(s, 0, "crane");
    const moves = [...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`, answerA, revealText(SALT, "crane"), revealText(SALT, "eagle")];
    const { host, ctx } = await kept(moves, 1, "eagle");
    expect(ctx.result.winner).toBe(0);
    const reveal = [...host.querySelectorAll("p")].find((one) => one.textContent.includes("Their word was CRANE"));
    expect(reveal).toBeTruthy();
    const hidden = hiddenWhenSmall();
    expect(hidden.length).toBeGreaterThan(0);
    for (const selector of hidden) expect(reveal.matches(selector), selector).toBe(false);
  });
});
