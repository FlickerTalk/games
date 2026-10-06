// What the user is told in a game, as one toast at the top that never moves the page (Ioan's rule,
// 2026-10-06: a line appearing above the board pushed the board and the back button down). The app
// draws it when it can (`ft.notify`, a Plugin API capability since app 1.4.1: one `ion-toast` at
// the top, the last one replacing the one before); an older app gets one drawn in the frame, floating
// in a band the shell keeps at the top from the first paint. Either way: one toast at a time, the
// standing text (whose turn it is) for as long as it holds, a passing one gone after a few seconds.

/** How long a passing text stays up, in milliseconds. */
export const FLASH_MS = 4000;

/**
 * A note: `{ text, html, icon, warn }` — the plain text the app's toast shows, and what the frame's
 * own toast draws (the text with its icons, the leading icon, and whether it warns).
 */
export class Toast {
  constructor({ ft, ms = FLASH_MS } = {}) {
    this.ft = ft;
    this.ms = ms;
    this.native = typeof ft?.notify === "function";
    this.held = null;
    this.passing = null;
    this.timer = null;
    this.shown = "";
    this.node = null;
    if (!this.native) {
      this.node = document.createElement("div");
      this.node.className = "ftg-toast";
      this.node.setAttribute("role", "status");
      this.node.setAttribute("aria-live", "polite");
      this.node.hidden = true;
    }
  }

  /** Puts the frame's toast in the kit's root (again, after the root was drawn over), with its band. */
  attach(root) {
    root.toggleAttribute("data-band", !this.native);
    if (this.node && this.node.parentNode !== root) root.append(this.node);
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
    const sticky = Boolean(note) && !this.passing;
    if (this.native) {
      const said = note ? `${sticky}\n${note.text}` : "";
      if (said === this.shown) return;
      this.shown = said;
      this.ft.notify(note?.text ?? "", { sticky });
      return;
    }
    const drawn = note ? `${note.warn ? "warn" : ""}\n${note.icon ?? ""}\n${note.html ?? ""}` : "";
    if (drawn === this.shown) return;
    this.shown = drawn;
    this.node.hidden = !note;
    this.node.className = `ftg-toast${note?.warn ? " warn" : ""}`;
    this.node.innerHTML = note ? `${note.icon ? `<span class="icon" aria-hidden="true">${note.icon}</span>` : ""}<span class="say">${note.html}</span>` : "";
  }
}
