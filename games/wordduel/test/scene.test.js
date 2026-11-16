import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { FLIP_MS, STAGGER_MS } from "../src/moves.js";
import { createScene } from "../src/scene.js";
import { commitText, commitTextSecond, honestAnswer, initial, play, turn } from "../src/rules.js";
import { themeFor } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const SALT = new Uint8Array(24).fill(0x5a);
const PLACED = [commitText("en", SALT, "crane"), commitTextSecond(SALT, "eagle")];
const answerB = (s) => honestAnswer(s, 1, "eagle");
const answerA = (s) => honestAnswer(s, 0, "crane");

function after(moves) {
  let state = initial();
  for (const move of moves) state = play(state, typeof move === "function" ? move(state) : move, turn(state)).state;
  return state;
}

function context(moves, extra = {}) {
  const state = after(moves);
  return { state, view: { index: 0 }, mySide: 0, canPlay: true, last: null, pending: false, lang: "en", t: (key, vars) => translate("en", key, vars), play: vi.fn(), own: { typed: "", word: "crane" }, ...extra };
}

function rig(moves, extra) {
  let clock = 1000;
  const scene = createScene(context(moves, extra), { now: () => clock });
  return { scene, tick: (ms) => (clock += ms), at: () => clock };
}

const buttons = (scene, grid) => scene.buttons({ size: 352 }).filter((one) => one.data.grid === grid);
const labels = (scene, grid) => buttons(scene, grid).map((one) => one.label);
const theme = themeFor(null, { dark: false });
const paint = (scene, now, still = false) => {
  const ctx = recorder();
  const next = scene.draw(ctx, { size: 352, theme, now, still });
  return { ctx, next, texts: ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text) };
};
const faces = (ctx, colour) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === colour).length;

describe("the Word Duel scene", () => {
  it("shows the secret word as it is typed, named for a screen reader, then kept in green once it is set", () => {
    const { scene } = rig([], { own: { typed: "cra", word: null } });
    expect(scene.label()).toBe("Your secret word");
    expect(labels(scene, "secret")).toEqual(["Your secret word", "C: not answered yet", "R: not answered yet", "A: not answered yet"]);
    expect(paint(scene, 1000).texts).toEqual(["C", "R", "A"]);
    scene.update(context(PLACED.slice(0, 1), { mySide: 0, canPlay: false, own: { typed: "", word: "crane" } }));
    expect(labels(scene, "secret").slice(1)).toEqual(["C: right place", "R: right place", "A: right place", "N: right place", "E: right place"]);
    expect(buttons(scene, "secret").every((one) => one.disabled)).toBe(true);
  });

  it("keeps the word just set on the board while its commitment is on its way", () => {
    const { scene } = rig([], { own: { typed: "", word: "crane" } });
    expect(labels(scene, "secret").slice(1).map((label) => label[0]).join("")).toBe("CRANE");
    scene.update(context([], { own: { typed: "pl", word: "crane" } }));
    expect(labels(scene, "secret").slice(1).map((label) => label[0]).join("")).toBe("PL");
  });

  it("lays each side's guesses out under its badge, named as before and marked with their answers, nothing to press", () => {
    const { scene } = rig([...PLACED, ">stare", (s) => `${answerB(s)}>about`], { mySide: 0 });
    expect(scene.label()).toBe("Your guesses · Their guesses");
    expect(labels(scene, "mine")).toEqual(["Your guesses", "S: not in the word", "T: not in the word", "A: in the word, elsewhere", "R: not in the word", "E: right place"]);
    expect(labels(scene, "theirs")[0]).toBe("Their guesses");
    expect(labels(scene, "theirs").slice(1).map((label) => label[0]).join("")).toBe("ABOUT");
    expect(buttons(scene, "theirs").slice(1).map((one) => one.data.mark).join("")).toBe(honestAnswer(after([...PLACED, ">stare", (s) => `${answerB(s)}>about`]), 0, "crane"));
    const all = scene.buttons({ size: 352 });
    expect(all.every((one) => one.disabled)).toBe(true);
    for (const { box } of all) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.w).toBeLessThanOrEqual(1);
      expect(box.y + box.h).toBeLessThanOrEqual(1);
    }
    const mine = buttons(scene, "mine").slice(1);
    const theirs = buttons(scene, "theirs").slice(1);
    expect(mine[0].box.w).toBeGreaterThan(theirs[0].box.w);
    expect(mine[0].box.x).toBeLessThan(theirs[0].box.x);
  });

  it("draws the guess being typed in this side's next row, only while this side may guess", () => {
    const moves = [...PLACED, ">stare", (s) => `${answerB(s)}>about`];
    const { scene } = rig(moves, { own: { typed: "pl", word: "crane" } });
    expect(paint(scene, 1000).texts.join("")).toBe("STAREPLABOUT");
    expect(labels(scene, "mine")).toHaveLength(6);
    scene.update(context(moves, { canPlay: false, own: { typed: "pl", word: "crane" } }));
    expect(paint(scene, 1000).texts.join("")).toBe("STAREABOUT");
  });

  it("shows the answer it owes to the other side's last guess before it is sent, from this phone's own word", () => {
    const { scene } = rig([...PLACED, ">stare"], { mySide: 1, own: { typed: "", word: "eagle" } });
    expect(buttons(scene, "theirs").slice(1).map((one) => one.data.mark).join("")).toBe(honestAnswer(after([...PLACED, ">stare"]), 1, "eagle"));
    expect(buttons(scene, "mine")).toHaveLength(1);
  });

  it("never draws a word it was not given: the other side's secret stays off the board until the end", () => {
    const { scene } = rig([...PLACED, ">stare"], { mySide: 1, own: { typed: "", word: "eagle" } });
    const drawn = paint(scene, 1000).texts.join("");
    expect(drawn).toBe("STARE");
    expect(drawn).not.toContain("CRANE");
  });

  it("turns a row over tile by tile when its answer comes, and rests once it has turned", () => {
    const moves = [...PLACED, ">stare"];
    const { scene, tick, at } = rig(moves);
    expect(paint(scene, at()).next).toBeNull();
    scene.update(context([...moves, (s) => `${answerB(s)}>about`]));
    const start = paint(scene, at());
    expect(start.next).toBe(0);
    tick(FLIP_MS + STAGGER_MS);
    const half = paint(scene, at());
    expect(faces(half.ctx, theme.tiles.b.face)).toBeGreaterThan(0);
    tick(STAGGER_MS * 4 + FLIP_MS);
    expect(paint(scene, at()).next).toBeNull();
  });

  it("shows the answers at once, without turning, when motion is reduced", () => {
    const moves = [...PLACED, ">stare"];
    const { scene, at } = rig(moves);
    scene.update(context([...moves, (s) => `${answerB(s)}>about`]));
    expect(paint(scene, at(), true).next).toBeNull();
  });

  it("marks a guess still on its way to the other phone, and no longer once it is there", () => {
    const moves = [...PLACED, ">stare"];
    const { scene } = rig(moves, { pending: true, canPlay: false });
    expect(buttons(scene, "mine").slice(1).every((one) => one.data.mark === "pending")).toBe(true);
    scene.update(context(moves, { canPlay: false }));
    expect(buttons(scene, "mine").slice(1).every((one) => one.data.mark === null)).toBe(true);
  });

  it("starts a new round without turning the rows of the last one", () => {
    const moves = [...PLACED, ">stare", (s) => `${answerB(s)}>about`];
    const { scene, at } = rig(moves);
    scene.update(context([], { view: { index: 1 }, own: { typed: "", word: null } }));
    scene.update(context([...PLACED, ">stare", (s) => `${answerB(s)}>about`], { view: { index: 1 } }));
    expect(paint(scene, at()).next).toBe(0);
    scene.update(context([...PLACED, ">stare", (s) => `${answerB(s)}>about`, (s) => `${answerA(s)}>eagle`], { view: { index: 2 } }));
    expect(paint(scene, at()).next).toBeNull();
  });
});
