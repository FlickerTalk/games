import { describe, expect, it, vi } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { mountRows } from "../src/rows.js";
import { ART } from "../src/theme.js";
import { TEXTS } from "../src/texts.js";

const translate = translator(joinTexts(KIT_TEXTS, TEXTS));
const t = (key, vars) => translate("en", key, vars);

function board() {
  const host = document.createElement("div");
  const canvas = document.createElement("canvas");
  const layer = document.createElement("div");
  layer.className = "ftt-layer";
  host.append(canvas, layer);
  document.body.append(host);
  return { host, canvas, layer };
}

const model = (extra = {}) => ({ t, phase: "play", mySide: 1, score: [1, 3], said: [["sex"], ["cat", "coats"]], word: "", canUndo: false, canSay: false, canPass: true, ...extra });

describe("the rows around the Letter Grid", () => {
  it("sit over the board's square, the scores before the board's buttons, the word row and the lists after", () => {
    const { host, canvas, layer } = board();
    mountRows(host, { act: vi.fn() });
    expect([...host.children].map((one) => one.className)).toEqual([canvas.className, "fwg fwg-top", layer.className, "fwg fwg-bottom"]);
  });

  it("show the points and the words of each side under its mark, the user's first, and the word being traced", () => {
    const { host } = board();
    const rows = mountRows(host, { act: vi.fn() });
    rows.paint(model({ word: "tea" }));
    const scores = host.querySelector(".fwg-scores");
    expect(scores.textContent.replace(/\s+/g, " ").trim()).toBe("3 your words (2) their words (1) 1");
    expect([...scores.querySelectorAll("svg")].map((mark) => mark.outerHTML.includes(ART.sides[1].body))).toEqual([true, false]);
    const [mine, theirs] = host.querySelectorAll(".fwg-lists p");
    expect(mine.textContent).toBe("cat 1, coats 2");
    expect(theirs.textContent).toBe("sex 1");
    expect(host.querySelector(".fwg-word b").textContent).toBe("tea");
    expect(host.querySelector(".fwg-word b").getAttribute("aria-live")).toBe("polite");
    expect(host.querySelector(".fwg-bottom").classList.contains("play")).toBe(true);
  });

  it("say the letters are being drawn while they are, in place of the scores", () => {
    const { host } = board();
    const rows = mountRows(host, { act: vi.fn() });
    rows.paint(model({ phase: "shuffle", said: [[], []], score: [0, 0], canPass: false }));
    expect(host.querySelector(".fwg-note").textContent).toBe("Drawing the letters…");
    expect(host.querySelector(".fwg-bottom").classList.contains("shuffle")).toBe(true);
    rows.paint(model());
    expect(host.querySelector(".fwg-note")).toBeNull();
  });

  it("open undo, say and pass as the board allows, named, and hand a touch on them to the board", () => {
    const { host } = board();
    const act = vi.fn();
    const rows = mountRows(host, { act });
    rows.paint(model({ word: "cat", canUndo: true, canSay: true }));
    const button = (name) => host.querySelector(`[data-act="${name}"]`);
    expect([button("undo").disabled, button("say").disabled, button("pass").disabled]).toEqual([false, false, false]);
    expect(button("undo").getAttribute("aria-label")).toBe("Take a letter back");
    expect(button("pass").getAttribute("aria-label")).toBe("Pass");
    expect(button("say").textContent).toBe("Say it");
    button("say").click();
    expect(act).toHaveBeenCalledWith("say");
    rows.paint(model({ canPass: false }));
    expect([button("undo").disabled, button("say").disabled, button("pass").disabled]).toEqual([true, true, true]);
    button("pass").click();
    expect(act).toHaveBeenCalledTimes(1);
  });

  it("keep the same buttons from one paint to the next, so a finger or the focus on one stays", () => {
    const { host } = board();
    const rows = mountRows(host, { act: vi.fn() });
    rows.paint(model());
    const pass = host.querySelector('[data-act="pass"]');
    rows.paint(model({ word: "ca", canUndo: true }));
    expect(host.querySelector('[data-act="pass"]')).toBe(pass);
    expect(host.querySelector(".fwg-nop")).not.toBeNull();
  });

  it("leave the board's square as they found it", () => {
    const { host, canvas, layer } = board();
    const rows = mountRows(host, { act: vi.fn() });
    rows.destroy();
    expect([...host.children]).toEqual([canvas, layer]);
  });
});
