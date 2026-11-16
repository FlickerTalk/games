import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { TABLETOP_STYLE } from "../../../kit/src/tabletop/board.js";
import { MARKS, STYLE, board } from "../src/board.js";
import { FORM_TOP, typingLine } from "../src/paint.js";
import { storeKey } from "../src/secret.js";
import { TEXTS } from "../src/texts.js";
import { ART } from "../src/theme.js";
import { accepted, commitHash, commitText, commitTextSecond, feedback, honestAnswer, initial, play, result, revealText, turn } from "../src/rules.js";
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
    notify: vi.fn(),
    ...extra,
  };
}

function mount(ctx) {
  const host = document.createElement("div");
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 352, height: 352, right: 352, bottom: 352 });
  document.body.append(host);
  return { host, mounted: board.mount(host, ctx) };
}

const type = (host, name, value) => {
  const field = host.querySelector(`[name="${name}"]`);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
};
const tiles = (host, grid) => [...host.querySelectorAll(`button[data-grid="${grid}"][data-row]`)];
const labels = (host, grid) => tiles(host, grid).map((one) => one.getAttribute("aria-label"));

let store;
beforeEach(() => {
  store = new Map();
  globalThis.ft = { store: { get: vi.fn(async (key) => store.get(key) ?? null), set: vi.fn(async (key, value) => (store.set(key, value), true)) } };
});
afterEach(() => {
  document.body.innerHTML = "";
  delete globalThis.ft;
});

describe("the board", () => {
  it("is drawn on a canvas, with the typing form under it and each letter named for a screen reader", async () => {
    const { host } = mount(context([]));
    await tick();
    expect(host.querySelector(".fwd canvas").getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector('.fwd [role="group"]').getAttribute("aria-label")).toBe("Your secret word");
    expect(host.querySelector('button[data-grid="secret"]:not([data-row])').getAttribute("aria-label")).toBe("Your secret word");
    expect(host.querySelector(".fwd").classList.contains("place")).toBe(true);
    expect(host.querySelector(".fwd .fwd-form input[name=secret]")).not.toBeNull();
    type(host, "secret", "Cra");
    expect(labels(host, "secret")).toEqual(["C: not answered yet", "R: not answered yet", "A: not answered yet"]);
    expect(host.querySelector(".fwd").classList.contains("empty")).toBe(false);
    expect(MARKS).toHaveLength(2);
  });

  it("carries the kit's look for a canvas board, the form where the drawing leaves room, and the turn outline in the sides' colours", () => {
    expect(STYLE).toContain(TABLETOP_STYLE);
    expect(STYLE).toContain(`.fwd-form{top:${Math.round(FORM_TOP.play * 100)}%}`);
    expect(STYLE).toContain(`.fwd.place .fwd-form{top:${Math.round(FORM_TOP.place * 100)}%}`);
    expect(STYLE).toContain(`.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}`);
  });
});

describe("typing with the phone's keyboard open", () => {
  const cq = (share) => `${(share * 100).toFixed(2)}cqh`;

  it("moves the field right under the secret row while it has the focus, and keeps that row in view with the field", async () => {
    const { host } = mount(context([]));
    await tick();
    const root = host.querySelector(".fwd");
    const line = typingLine(352, "place", 0);
    expect(root.style.getPropertyValue("--typing-top")).toBe(cq(line.top));
    expect(root.style.getPropertyValue("--typing-reach")).toBe(cq(line.reach));
    expect(STYLE).toMatch(/\.fwd:focus-within\s+\.fwd-form\s*\{[^}]*top:\s*var\(--typing-top\);[^}]*bottom:\s*auto;/);
    expect(STYLE).toMatch(/\.fwd-form input\s*\{[^}]*scroll-margin-top:\s*var\(--typing-reach\);/);
    const field = host.querySelector('[name="secret"]');
    const shown = vi.spyOn(field, "scrollIntoView");
    type(host, "secret", "cr");
    expect(shown).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("follows this side's next empty row once the words are set", async () => {
    const moves = [...PLACED, ">stare", (s) => `${honestAnswer(s, 1, "eagle")}>about`];
    const { host } = await kept(moves, 0, "crane");
    const line = typingLine(352, "play", 1);
    expect(host.querySelector(".fwd").style.getPropertyValue("--typing-top")).toBe(cq(line.top));
    expect(host.querySelector(".fwd").style.getPropertyValue("--typing-reach")).toBe(cq(line.reach));
  });
});

describe("the secret word", () => {
  it("is typed or suggested, checked against the word list, and set with a commitment the kit gets", async () => {
    const ctx = context([]);
    const { host } = mount(ctx);
    await tick();
    expect(host.textContent).toContain("Five letters");
    expect(host.querySelector('[data-act="commit"]').disabled).toBe(true);
    type(host, "secret", "ZZZ");
    expect(ctx.notify).not.toHaveBeenCalled();
    type(host, "secret", "ZZZZZ");
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("Not in the word list"));
    expect(host.textContent).not.toContain("Not in the word list");
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
    const ctx = context([PLACED[0]], { lang: "es", t: (key, vars) => translate("es", key, vars) });
    const { host } = mount(ctx);
    await tick();
    host.querySelector('[data-act="suggest"]').click();
    const typed = host.querySelector('[name="secret"]').value;
    expect(typed).toMatch(/^[a-z]{5}$/);
    expect(accepted("en", typed)).toBe(true);
    expect(labels(host, "secret").map((label) => label[0]).join("")).toBe(typed.toUpperCase());
    host.querySelector('[data-act="commit"]').click();
    await tick();
    await tick();
    expect(ctx.play.mock.calls[0][0]).toMatch(/^c[A-Za-z0-9_-]{43}$/);
    const { host: spanish } = mount(context([], { lang: "es", t: (key, vars) => translate("es", key, vars) }));
    await tick();
    spanish.querySelector('[data-act="suggest"]').click();
    expect(accepted("es", spanish.querySelector('[name="secret"]').value)).toBe(true);
    expect(spanish.textContent).toContain("Cinco letras");
  });

  it("does not commit a word the store would not keep, so it can always be revealed", async () => {
    globalThis.ft.store.set = vi.fn(async () => false);
    const ctx = context([]);
    const { host } = mount(ctx);
    await tick();
    type(host, "secret", "crane");
    host.querySelector('[data-act="commit"]').click();
    await tick();
    await tick();
    expect(ctx.play).not.toHaveBeenCalled();
  });

  it("says so when the word it committed is no longer on this phone", async () => {
    const ctx = context(PLACED, { mySide: 0, canPlay: true });
    const { host } = mount(ctx);
    await tick();
    await tick();
    expect(ctx.notify).toHaveBeenCalledWith(expect.stringContaining("no longer on this phone"));
    expect(host.textContent).not.toContain("no longer on this phone");
    expect(ctx.play).not.toHaveBeenCalled();
  });
});

async function kept(moves, me, word, extra = {}) {
  store.set(storeKey("me-1", 0), JSON.stringify({ salt: "WlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpa", word }));
  const ctx = context(moves, { mySide: me, ...extra });
  const { host, mounted } = mount(ctx);
  await tick();
  await tick();
  return { host, ctx, mounted };
}

describe("guessing", () => {
  it("shows both sides' guesses with their answers, and sends a guess with the honest answer", async () => {
    const { host, ctx } = await kept([...PLACED, ">stare"], 1, "eagle");
    expect(host.querySelector(".fwd").classList.contains("place")).toBe(false);
    expect(tiles(host, "theirs").map((tile) => tile.getAttribute("aria-label")[0]).join("")).toBe("STARE");
    expect(tiles(host, "theirs").map((tile) => tile.dataset.mark).join("")).toBe(feedback("stare", "eagle"));
    expect(host.querySelector('[data-act="guess"]').disabled).toBe(true);
    type(host, "guess", "about");
    expect(host.querySelector('[data-act="guess"]').disabled).toBe(false);
    host.querySelector('[data-act="guess"]').click();
    await tick();
    expect(ctx.play).toHaveBeenCalledWith(`${feedback("stare", "eagle")}>about`);
  });

  it("marks this side's guesses by the other side's answers, and names each tile as before", async () => {
    const moves = [...PLACED, ">stare", (s) => `${honestAnswer(s, 1, "eagle")}>about`];
    const { host } = await kept(moves, 0, "crane");
    expect(labels(host, "mine")).toEqual(["S: not in the word", "T: not in the word", "A: in the word, elsewhere", "R: not in the word", "E: right place"]);
    expect(tiles(host, "mine")[4].dataset.mark).toBe("g");
    expect(host.querySelector('button[data-grid="mine"]:not([data-row])').getAttribute("aria-label")).toBe("Your guesses");
    expect(host.querySelector('button[data-grid="theirs"]:not([data-row])').getAttribute("aria-label")).toBe("Their guesses");
  });

  it("sends the closing answer on its own once the round is decided, then the reveal, and shows the other word", async () => {
    const answerB = (s) => honestAnswer(s, 1, "eagle");
    const answerA = (s) => honestAnswer(s, 0, "crane");
    const moves = [...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`, (s) => `${answerB(s)}>other`];
    const { host, ctx, mounted } = await kept(moves, 0, "crane");
    expect(ctx.notify).toHaveBeenCalledWith("You have the word!");
    expect(host.textContent).not.toContain("You have the word!");
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
    expect(labels(host, "theirs").join(" ")).not.toContain("EAGLE");
  });
});

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
