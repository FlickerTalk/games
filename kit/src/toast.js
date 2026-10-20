// What the user is told in a game, as one line that never moves the page (Ioan's rule, 2026-10-06:
// a line appearing above the board pushed the board and the back button down). The frame draws it,
// on every app, in a band of its own right under the game's bar (the shell keeps the band from the
// first screen on, always as tall). Not the app's own toast (`ft.notify`, app 1.4.1): that one floats
// over the top of the frame, which is where the bar is, and on Android it stayed over the way back
// and the resignation for the whole match and took their taps (Samsung, app 1.6.0, 2026-10-13). One
// line at a time: the standing text (whose turn it is) for as long as it holds, a passing one gone
// after a few seconds.

/** How long a passing text stays up, in milliseconds. */
export const FLASH_MS = 4000;

/**
 * A note: `{ text, html, icon, warn }` — the plain text, and what the line draws (the text with its
 * icons, the leading icon, and whether it warns).
 */
export class Toast {
  constructor({ ms = FLASH_MS } = {}) {
    this.ms = ms;
    this.held = null;
    this.passing = null;
    this.timer = null;
    this.shown = "";
    this.node = document.createElement("div");
    this.node.className = "ftg-toast";
    this.node.setAttribute("role", "status");
    this.node.setAttribute("aria-live", "polite");
    this.node.hidden = true;
  }

  /** Puts the line in its band (again, after the page was drawn over). */
  attach(band) {
    if (this.node.parentNode !== band) band.append(this.node);
  }

  /** The standing text, or `null` when nothing holds. */
  hold(note) {
    this.held = note ?? null;
    this.show();
  }

  /** A passing text, in the place of whatever is up; `null` ends the one up early. */
  flash(note) {
    if (note && this.passing?.text === note.text) return;
    clearTimeout(this.timer);
    this.passing = note ?? null;
    if (note) {
      this.timer = setTimeout(() => {
        this.passing = null;
        this.show();
      }, this.ms);
    }
    this.show();
  }

  /** Nothing up any more: the game left the screen. */
  clear() {
    clearTimeout(this.timer);
    this.passing = null;
    this.held = null;
    this.show();
  }

  show() {
    const note = this.passing ?? this.held;
    const drawn = note ? `${note.warn ? "warn" : ""}\n${note.icon ?? ""}\n${note.html ?? ""}` : "";
    if (drawn === this.shown) return;
    this.shown = drawn;
    this.node.hidden = !note;
    this.node.className = `ftg-toast${note?.warn ? " warn" : ""}`;
    this.node.innerHTML = note ? `${note.icon ? `<span class="icon" aria-hidden="true">${note.icon}</span>` : ""}<span class="say">${note.html}</span>` : "";
  }
}
