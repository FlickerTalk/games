// Not the app's ft.notify, which floats over the top of the frame. On Android it stayed over the back
// and resign buttons for the whole match and took their taps.

export const FLASH_MS = 4000;

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

  attach(band) {
    if (this.node.parentNode !== band) band.append(this.node);
  }

  hold(note) {
    this.held = note ?? null;
    this.show();
  }

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
