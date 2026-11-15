import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILES } from "../../src/avatars/cast.js";
import { drawBadge } from "../../src/avatars/badge.js";
import { PORTRAIT_SIZE, portraitFaces, portraitSize, standIn, withPortraits } from "../../src/avatars/portraits.js";
import { contains, draw, recorder, shapes } from "./recorder.js";

const playing = (myTurn) => ({ phase: "play", me: "m", peer: "p", myTurn, result: null });
const over = (winner) => ({ phase: "over", me: "m", peer: "p", myTurn: false, result: { winner } });

function page({ solo = false, stored = null } = {}) {
  document.body.innerHTML =
    '<ft-x><div class="ftg"><ion-header><ion-toolbar class="ftg-bar"><ion-title><div class="ftg-score" data-part="score">1–0</div></ion-title></ion-toolbar></ion-header><div data-part="board"></div></div></ft-x>';
  const element = document.querySelector("ft-x");
  const store = { get: vi.fn(async () => stored), set: vi.fn(async () => true) };
  element.table = { solo };
  element.ft = { store };
  return { element, host: element.querySelector('[data-part="board"]'), title: element.querySelector("ion-title"), store };
}

function harness() {
  const frames = [];
  const drawn = new Map();
  const options = {
    frame: (callback) => frames.push(callback),
    cancel: vi.fn(),
    context: (canvas) => {
      const ctx = recorder();
      drawn.set(canvas.dataset.side, ctx);
      return ctx;
    },
  };
  return { frames, drawn, options };
}

const board = () => ({ mount: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn() })) });

describe("the faces of the two players", () => {
  it("say whose turn it is: the one to move thinks, unless it is the user", () => {
    expect(portraitFaces(playing(true))).toEqual({ me: { face: "focused", thinking: false }, them: { face: "neutral", thinking: false } });
    expect(portraitFaces(playing(false))).toEqual({ me: { face: "neutral", thinking: false }, them: { face: "thinking", thinking: true } });
  });

  it("cheer for the winner of a round and say oops for the other, and smile at a draw", () => {
    expect(portraitFaces(over("m"))).toEqual({ me: { face: "cheering", thinking: false }, them: { face: "oops", thinking: false } });
    expect(portraitFaces(over("p"))).toEqual({ me: { face: "oops", thinking: false }, them: { face: "cheering", thinking: false } });
    expect(portraitFaces(over(null))).toEqual({ me: { face: "happy", thinking: false }, them: { face: "happy", thinking: false } });
  });

  it("wait calmly while there is no round to play", () => {
    for (const phase of ["invite", "toss", "ended", "broken"]) {
      expect(portraitFaces({ phase, me: "m", myTurn: false, result: null }), phase).toEqual({ me: { face: "neutral", thinking: false }, them: { face: "neutral", thinking: false } });
    }
    expect(portraitFaces(null)).toEqual({ me: { face: "neutral", thinking: false }, them: { face: "neutral", thinking: false } });
  });

  it("stand in for a person whose choice this phone does not know with another profile, never Flick", () => {
    for (const profile of PROFILES) {
      const other = standIn({ who: profile.id });
      expect(other.who).not.toBe(profile.id);
      expect(PROFILES.map((one) => one.id)).toContain(other.who);
    }
  });
});

describe("the size of the portraits", () => {
  it("is the full size when the bar has room, smaller when it is short, and none below 32 px", () => {
    expect(portraitSize(200, 70)).toBe(PORTRAIT_SIZE);
    expect(portraitSize(159, 70)).toBe(36);
    expect(portraitSize(150, 70)).toBe(32);
    expect(portraitSize(149, 70)).toBe(0);
    expect(portraitSize(111, 70)).toBe(0);
  });

  it("is the full size while the bar has not been laid out", () => {
    for (const room of [0, Number.NaN, undefined]) expect(portraitSize(room, 0), String(room)).toBe(PORTRAIT_SIZE);
  });
});

describe("the portraits beside the score", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("put the user's avatar and Flick on either side of the score in a match against the phone", async () => {
    const { host, title, store } = page({ solo: true, stored: JSON.stringify({ who: "milo", hair: "quiff", hairColour: "copper", name: "Lia" }) });
    const { options } = harness();
    const inner = board();
    const shown = withPortraits(inner, options).mount(host, { view: playing(true) });
    await vi.advanceTimersByTimeAsync(0);
    expect(inner.mount).toHaveBeenCalledWith(host, { view: playing(true) });
    expect(store.get).toHaveBeenCalledWith("player");
    const row = title.firstElementChild;
    expect([...row.children].map((one) => one.dataset.side ?? one.dataset.part)).toEqual(["me", "score", "them"]);
    const [me, , them] = row.children;
    expect([me.dataset.who, me.dataset.face, them.dataset.who, them.dataset.face]).toEqual(["milo", "focused", "flick", "neutral"]);
    for (const canvas of [me, them]) {
      expect(canvas.getAttribute("aria-hidden")).toBe("true");
      expect(canvas.style.width).toBe(`${PORTRAIT_SIZE}px`);
    }
    shown.destroy();
  });

  it("draw the badges, thinking for the side to move, and keep them moving until the match leaves", async () => {
    const { host } = page({ solo: true, stored: JSON.stringify({ who: "sam", hair: "bun" }) });
    const { frames, drawn, options } = harness();
    const shown = withPortraits(board(), options).mount(host, { view: playing(false) });
    await vi.advanceTimersByTimeAsync(0);
    frames.shift()(2000);
    const expected = (who, extra) => shapes(draw((ctx) => drawBadge(ctx, PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2, PORTRAIT_SIZE, { ...who, ...extra, time: 2 })));
    expect(contains(shapes(drawn.get("them")), expected({ who: "flick" }, { face: "thinking", thinking: true }))).toBe(true);
    expect(contains(shapes(drawn.get("me")), expected({ who: "sam", hair: "bun", hairColour: "ink", name: "" }, { face: "neutral", thinking: false }))).toBe(true);
    expect(frames).toHaveLength(1);
    shown.update({ view: over("m") });
    expect(document.querySelector('[data-side="me"]').dataset.face).toBe("cheering");
    expect(document.querySelector('[data-side="them"]').dataset.face).toBe("oops");
    shown.destroy();
    expect(options.cancel).toHaveBeenCalled();
  });

  it("show the default avatar and a stand-in in a match with a person, and the default when the store says nothing in time", async () => {
    const { host, store } = page({ solo: false });
    store.get.mockImplementation(() => new Promise(() => {}));
    const { options } = harness();
    const shown = withPortraits(board(), options).mount(host, { view: playing(true) });
    expect(document.querySelector('[data-side="me"]').dataset.who).toBe("");
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.querySelector('[data-side="me"]').dataset.who).toBe("ari");
    expect(document.querySelector('[data-side="them"]').dataset.who).toBe(standIn({ who: "ari" }).who);
    shown.destroy();
  });

  it("give the score back to the bar when the match leaves, and let the board go too", async () => {
    const { host, title } = page();
    const inner = board();
    const shown = withPortraits(inner, harness().options).mount(host, { view: playing(true) });
    shown.update({ view: playing(false) });
    expect(inner.mount.mock.results[0].value.update).toHaveBeenCalledWith({ view: playing(false) });
    shown.destroy();
    expect(inner.mount.mock.results[0].value.destroy).toHaveBeenCalled();
    expect(title.innerHTML).toBe('<div class="ftg-score" data-part="score">1–0</div>');
    expect(document.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("shrink to the room the bar leaves them, and step aside when it leaves too little", async () => {
    const { host } = page({ solo: true, stored: JSON.stringify({ who: "rio" }) });
    const { options } = harness();
    let room = 159;
    const shown = withPortraits(board(), { ...options, measure: () => ({ room, score: 70 }) }).mount(host, { view: playing(true) });
    await vi.advanceTimersByTimeAsync(0);
    const sides = () => [...document.querySelectorAll("canvas")];
    for (const canvas of sides()) {
      expect(canvas.style.width).toBe("36px");
      expect(canvas.width).toBe(Math.round(36 * (globalThis.devicePixelRatio || 1)));
      expect(canvas.hidden).toBe(false);
    }
    room = 111;
    shown.update({ view: playing(false) });
    for (const canvas of sides()) expect(canvas.hidden).toBe(true);
    room = 400;
    shown.update({ view: playing(true) });
    for (const canvas of sides()) {
      expect(canvas.hidden).toBe(false);
      expect(canvas.style.width).toBe(`${PORTRAIT_SIZE}px`);
    }
    shown.destroy();
  });

  it("leave a page without a score alone, and still mount the board", () => {
    const host = document.createElement("div");
    const inner = board();
    const shown = withPortraits(inner, harness().options).mount(host, { view: playing(true) });
    expect(inner.mount).toHaveBeenCalled();
    expect(() => shown.update({ view: playing(false) })).not.toThrow();
    expect(() => shown.destroy()).not.toThrow();
  });
});
