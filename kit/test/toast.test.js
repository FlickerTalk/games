// What the user is told in a game, as a toast at the top: the app's own (`ft.notify`, a Plugin
// API capability since app 1.4.1) when it has it, otherwise one drawn in the frame. Either way one
// toast at a time (a new one takes the old one's place), the passing ones gone after a few seconds,
// the standing one ("your turn") there for as long as it holds — and nothing in the page moves.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASH_MS, Toast } from "../src/toast.js";

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

const note = (text, more = {}) => ({ text, html: text, icon: "", ...more });

describe("with the app's toast (ft.notify)", () => {
  const setup = () => {
    const ft = { notify: vi.fn() };
    const root = document.createElement("div");
    document.body.append(root);
    const toast = new Toast({ ft });
    toast.attach(root);
    return { ft, root, toast };
  };

  it("hands the text to the app and draws nothing in the frame, with no room kept for it", () => {
    const { ft, root, toast } = setup();
    toast.hold(note("Your turn"));
    expect(ft.notify).toHaveBeenCalledWith("Your turn", { sticky: true });
    expect(root.querySelector(".ftg-toast")).toBeNull();
    expect(root.hasAttribute("data-band")).toBe(false);
  });

  it("says a standing text once, however often it is held again", () => {
    const { ft, toast } = setup();
    toast.hold(note("Your turn"));
    toast.hold(note("Your turn"));
    expect(ft.notify).toHaveBeenCalledTimes(1);
  });

  it("shows a passing text in its place, then the standing one again once it has gone", () => {
    const { ft, toast } = setup();
    toast.hold(note("Your turn"));
    toast.flash(note("That move is not allowed"));
    expect(ft.notify).toHaveBeenLastCalledWith("That move is not allowed", { sticky: false });
    // Held again while the passing one is up: it waits for it.
    toast.hold(note("Your turn"));
    expect(ft.notify).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(FLASH_MS);
    expect(ft.notify).toHaveBeenLastCalledWith("Your turn", { sticky: true });
  });

  it("takes the standing text away with an empty one when nothing holds", () => {
    const { ft, toast } = setup();
    toast.hold(note("Your turn"));
    toast.hold(null);
    expect(ft.notify).toHaveBeenLastCalledWith("", { sticky: false });
    toast.clear();
    expect(ft.notify).toHaveBeenCalledTimes(2);
  });
});

describe("without it (an app before 1.4.1)", () => {
  const setup = () => {
    const root = document.createElement("div");
    root.className = "ftg";
    document.body.append(root);
    const toast = new Toast({ ft: {} });
    toast.attach(root);
    return { root, toast };
  };
  const shown = (root) => [...root.querySelectorAll(".ftg-toast")].filter((node) => !node.hidden);

  it("keeps a band at the top from the start, and one toast node in the frame, announced politely", () => {
    const { root, toast } = setup();
    expect(root.hasAttribute("data-band")).toBe(true);
    const node = root.querySelector(".ftg-toast");
    expect(node.getAttribute("role")).toBe("status");
    expect(node.getAttribute("aria-live")).toBe("polite");
    expect(node.hidden).toBe(true);
    toast.hold(note("Your turn"));
    expect(shown(root)).toHaveLength(1);
    expect(node.textContent).toContain("Your turn");
  });

  it("shows one toast at a time: a new text takes the old one's place", () => {
    const { root, toast } = setup();
    toast.flash(note("Reaching the other phone…"));
    toast.flash(note("That move is not allowed", { warn: true }));
    expect(root.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(root.textContent).toContain("That move is not allowed");
    expect(root.textContent).not.toContain("Reaching");
    expect(root.querySelector(".ftg-toast").classList.contains("warn")).toBe(true);
  });

  it("lets a passing text go after a few seconds, back to the standing one", () => {
    const { root, toast } = setup();
    toast.hold(note("Your turn"));
    toast.flash(note("Already said"));
    vi.advanceTimersByTime(FLASH_MS - 1);
    expect(root.textContent).toContain("Already said");
    vi.advanceTimersByTime(1);
    expect(root.textContent).not.toContain("Already said");
    expect(root.textContent).toContain("Your turn");
  });

  it("keeps the standing text for as long as it holds, and hides once nothing does", () => {
    const { root, toast } = setup();
    toast.hold(note("Your turn"));
    vi.advanceTimersByTime(FLASH_MS * 10);
    expect(shown(root)).toHaveLength(1);
    toast.hold(null);
    expect(shown(root)).toHaveLength(0);
  });

  it("finds its node again when the frame's page is drawn over", () => {
    const { root, toast } = setup();
    root.innerHTML = "<p>the list</p>";
    toast.attach(root);
    toast.hold(note("Your turn"));
    expect(root.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(root.textContent).toContain("Your turn");
  });

  it("ends a passing text early when asked", () => {
    const { root, toast } = setup();
    toast.flash(note("The other person left"));
    toast.flash(null);
    expect(shown(root)).toHaveLength(0);
  });
});
