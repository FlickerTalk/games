// What the user is told in a game: one line, drawn in the frame in a band of its own under the
// game's bar (the shell puts it there), on every app. Never the app's own toast (`ft.notify`): that
// one floats over the top of the frame, which is where the bar is, and on Android it covered the way
// back and the resignation and took their taps (Samsung, app 1.6.0, 2026-10-13). One note at a time
// (a new one takes the old one's place), the passing ones gone after a few seconds, the standing one
// ("your turn") there for as long as it holds.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLASH_MS, Toast } from "../src/toast.js";

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

const note = (text, more = {}) => ({ text, html: text, icon: "", ...more });

describe("the toast", () => {
  /** The band under the bar where the shell puts the toast. */
  const setup = (ft = {}) => {
    const band = document.createElement("div");
    document.body.append(band);
    const toast = new Toast({ ft });
    toast.attach(band);
    return { band, toast };
  };
  const shown = (band) => [...band.querySelectorAll(".ftg-toast")].filter((node) => !node.hidden);

  it("is drawn in the frame even when the app has a toast of its own, and never handed to it", () => {
    const ft = { notify: vi.fn() };
    const { band, toast } = setup(ft);
    toast.hold(note("Your turn"));
    toast.flash(note("That move is not allowed"));
    vi.advanceTimersByTime(FLASH_MS);
    toast.clear();
    expect(ft.notify).not.toHaveBeenCalled();
    expect(band.querySelectorAll(".ftg-toast")).toHaveLength(1);
  });

  it("puts one node where it is attached, announced politely, and asks for no room of its own", () => {
    const { band, toast } = setup();
    const node = band.querySelector(".ftg-toast");
    expect(node.parentElement).toBe(band);
    expect(band.hasAttribute("data-band")).toBe(false);
    expect(node.getAttribute("role")).toBe("status");
    expect(node.getAttribute("aria-live")).toBe("polite");
    expect(node.hidden).toBe(true);
    toast.hold(note("Your turn"));
    expect(shown(band)).toHaveLength(1);
    expect(node.textContent).toContain("Your turn");
  });

  it("moves to a new band when the page is drawn again", () => {
    const { band, toast } = setup();
    const again = document.createElement("div");
    document.body.append(again);
    toast.attach(again);
    toast.hold(note("Your turn"));
    expect(band.querySelector(".ftg-toast")).toBeNull();
    expect(again.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(again.textContent).toContain("Your turn");
  });

  it("shows one toast at a time: a new text takes the old one's place", () => {
    const { band, toast } = setup();
    toast.flash(note("Reaching the other phone…"));
    toast.flash(note("That move is not allowed", { warn: true }));
    expect(band.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(band.textContent).toContain("That move is not allowed");
    expect(band.textContent).not.toContain("Reaching");
    expect(band.querySelector(".ftg-toast").classList.contains("warn")).toBe(true);
  });

  it("lets a passing text go after a few seconds, back to the standing one", () => {
    const { band, toast } = setup();
    toast.hold(note("Your turn"));
    toast.flash(note("Already said"));
    vi.advanceTimersByTime(FLASH_MS - 1);
    expect(band.textContent).toContain("Already said");
    vi.advanceTimersByTime(1);
    expect(band.textContent).not.toContain("Already said");
    expect(band.textContent).toContain("Your turn");
  });

  it("keeps the standing text for as long as it holds, and hides once nothing does", () => {
    const { band, toast } = setup();
    toast.hold(note("Your turn"));
    vi.advanceTimersByTime(FLASH_MS * 10);
    expect(shown(band)).toHaveLength(1);
    toast.hold(null);
    expect(shown(band)).toHaveLength(0);
  });

  it("finds its node again when the frame's page is drawn over", () => {
    const { band, toast } = setup();
    band.innerHTML = "<p>the list</p>";
    toast.attach(band);
    toast.hold(note("Your turn"));
    expect(band.querySelectorAll(".ftg-toast")).toHaveLength(1);
    expect(band.textContent).toContain("Your turn");
  });

  it("ends a passing text early when asked", () => {
    const { band, toast } = setup();
    toast.flash(note("The other person left"));
    toast.flash(null);
    expect(shown(band)).toHaveLength(0);
  });
});
