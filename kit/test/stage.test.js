import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_BOARD, ROOM_CHROME, fitStage, watchStage } from "../src/stage.js";
import STYLE from "../src/style.css";
import { fakeFrame } from "./helpers.js";

let frame = null;

function shell({ result = false } = {}) {
  document.body.innerHTML = `<div class="ftg"><ion-header><ion-toolbar data-part="bar"></ion-toolbar><ion-toolbar data-part="notice"></ion-toolbar></ion-header><ion-content data-part="content"><div class="ftg-main" data-part="main"><div data-part="players"></div><div data-part="result">${
    result ? "<p>over</p>" : ""
  }</div><div data-part="stage"></div></div></ion-content></div>`;
  return document.querySelector(".ftg");
}

function fitted(options, least = 200, extra = {}) {
  frame = fakeFrame(options);
  const root = shell(extra);
  fitStage(root, least);
  return { root, board: root.style.getPropertyValue("--ftg-board"), compact: root.hasAttribute("data-compact"), beside: root.hasAttribute("data-beside") };
}

afterEach(() => {
  frame?.restore();
  frame = null;
  document.body.innerHTML = "";
});

describe("the board in the conversation's game room", () => {
  it("takes the room's height from the screen less the app's chrome, never from the frame, whose height follows the game", () => {
    const { root, board } = fitted({ width: 328, height: 5000, screen: 740 });
    expect(ROOM_CHROME).toBe(297);
    expect(board).toBe(`${740 - ROOM_CHROME - 120 - 64}px`);
    frame.resize({ height: 300 });
    fitStage(root, 200);
    expect(root.style.getPropertyValue("--ftg-board")).toBe("259px");
    expect(root.hasAttribute("data-beside")).toBe(false);
  });

  it("keeps the game's smallest board in a short room, the players going first, and lets the room scroll", () => {
    const { board, compact } = fitted({ width: 328, height: 5000, screen: 600 }, 308);
    expect(compact).toBe(true);
    expect(board).toBe("308px");
  });

  it("on a wide frame puts the board beside the players, as tall as the room under the bar and the band", () => {
    const { board, beside, compact } = fitted({ width: 1248, height: 5000, screen: 853, wide: true });
    expect(beside).toBe(true);
    expect(compact).toBe(false);
    expect(board).toBe(`${Math.max(240, 853 - ROOM_CHROME - 72 - 48)}px`);
  });
});

describe("the board when the app gives the game the whole window", () => {
  it("fills the width of a phone held upright, the frame being taller than it needs", () => {
    expect(fitted({ width: 360, height: 588, fill: true })).toMatchObject({ board: "360px", compact: false, beside: false });
    frame.restore();
    expect(fitted({ width: 390, height: 792, fill: true })).toMatchObject({ board: "390px", compact: false, beside: false });
  });

  it("measures the frame it was given, not the screen", () => {
    expect(fitted({ width: 360, height: 500, screen: 2000, fill: true }).board).toBe(`${500 - 120 - 64}px`);
  });

  it("hides the players before it takes the board under the game's smallest", () => {
    expect(fitted({ width: 360, height: 500, fill: true }, 352)).toMatchObject({ board: "360px", compact: true });
  });

  it("gives a board smaller than the game's smallest rather than one that spills out of a short frame", () => {
    const { root, board, compact } = fitted({ width: 360, height: 420, fill: true }, 352);
    expect(compact).toBe(true);
    expect(board).toBe("300px");
    expect(root.getBoundingClientRect().height).toBeLessThanOrEqual(420);
  });

  it("keeps a board of 120 px however short the frame", () => {
    expect(fitted({ width: 360, height: 200, fill: true }, 352).board).toBe("120px");
  });

  it("makes room above the board for the result's actions", () => {
    expect(fitted({ width: 360, height: 588, fill: true }, 120, { result: true }).board).toBe(`${588 - 120 - 64 - 56}px`);
  });

  it("puts the board beside the players in a frame wider than tall, as tall as the frame under the bar and the band", () => {
    expect(fitted({ width: 844, height: 338, fill: true }, 320)).toMatchObject({ board: `${338 - 120}px`, compact: false, beside: true });
    frame.restore();
    expect(fitted({ width: 1280, height: 748, fill: true }, 320)).toMatchObject({ board: `${748 - 120}px`, beside: true });
  });

  it("leaves the players their column beside the board on a narrow frame turned sideways", () => {
    expect(fitted({ width: 560, height: 420, fill: true })).toMatchObject({ board: `${560 - 340}px`, beside: true });
  });

  it("stops growing at its largest board, so pieces stay a sensible size on a big window", () => {
    expect(MAX_BOARD).toBe(720);
    expect(fitted({ width: 1920, height: 1080, fill: true })).toMatchObject({ board: "720px", beside: true });
    frame.restore();
    expect(fitted({ width: 800, height: 1232, fill: true })).toMatchObject({ board: "720px", beside: false });
  });

  it("goes back to the room's board when the app takes the window back", () => {
    const { root } = fitted({ width: 360, height: 588, screen: 740, fill: true });
    document.documentElement.removeAttribute("data-fill");
    frame.resize({ height: 323 });
    fitStage(root, 200);
    expect(root.style.getPropertyValue("--ftg-board")).toBe("259px");
  });
});

describe("the kit's stylesheet", () => {
  const css = STYLE.replace(/\/\*[\s\S]*?\*\//g, "");

  it("puts the board beside the players only when the kit says so, so a tall frame wider than 720 px can keep them above it", () => {
    expect(css).toMatch(/\.ftg\[data-beside\]\s+\.ftg-main\s*\{[^}]*grid-template-areas:\s*"stage players"\s*"stage result"/);
    expect(css).toMatch(/\.ftg\[data-beside\]\s+\.ftg-stage\s*\{[^}]*width:\s*min\(calc\(100vw - 340px\), var\(--ftg-board, 560px\)\)/);
    expect(css).toMatch(/\.ftg\[data-beside\]\s+\.ftg-players\s*\{[^}]*flex-direction:\s*column/);
    const wide = css.slice(css.indexOf("@media (min-width: 720px)"));
    expect(wide).not.toMatch(/\.ftg-main|\.ftg-stage|\.ftg-players/);
  });
});

describe("watching the frame", () => {
  it("says when the app gives the game the whole window and when it takes it back", async () => {
    const changed = vi.fn();
    const stop = watchStage(changed);
    document.documentElement.setAttribute("data-fill", "1");
    await Promise.resolve();
    expect(changed).toHaveBeenCalledTimes(1);
    document.documentElement.removeAttribute("data-fill");
    await Promise.resolve();
    expect(changed).toHaveBeenCalledTimes(2);
    document.documentElement.setAttribute("data-dark", "1");
    await Promise.resolve();
    expect(changed).toHaveBeenCalledTimes(2);
    document.documentElement.removeAttribute("data-dark");
    stop();
  });

  it("says when the frame is resized or turned", () => {
    const changed = vi.fn();
    const stop = watchStage(changed);
    dispatchEvent(new Event("resize"));
    expect(changed).toHaveBeenCalledTimes(1);
    stop();
  });

  it("says nothing once stopped", async () => {
    const changed = vi.fn();
    watchStage(changed)();
    dispatchEvent(new Event("resize"));
    document.documentElement.setAttribute("data-fill", "1");
    await Promise.resolve();
    document.documentElement.removeAttribute("data-fill");
    expect(changed).not.toHaveBeenCalled();
  });
});
