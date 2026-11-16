import FORM_CSS from "./form.css";
import { TABLETOP_STYLE, canvasBoard } from "../../../kit/src/tabletop/board.js";
import { formHtml } from "./form.js";
import { sideMark } from "./marks.js";
import { FORM_TOP } from "./paint.js";
import { dueMove, guessMove, secretMove } from "./picking.js";
import { LENGTH, MAX_GUESSES, SALT_BYTES, accepted, langFor, solvedAt, suggest } from "./rules.js";
import { createScene } from "./scene.js";
import { cleaned, keeper, storeKey } from "./secret.js";
import { ART, themeFor } from "./theme.js";

const percent = (share) => `${Math.round(share * 100)}%`;

export const STYLE = [
  TABLETOP_STYLE,
  FORM_CSS,
  `.fwd-form{top:${percent(FORM_TOP.play)}}.fwd.place .fwd-form{top:${percent(FORM_TOP.place)}}`,
  `.ftg{--hue-side-0:${ART.sides[0].body};--hue-side-1:${ART.sides[1].body}}`,
].join("\n");

export const MARKS = [sideMark(0), sideMark(1)];

const table = canvasBoard({ theme: themeFor, scene: createScene });

const refused = (lang, typed) => typed.length === LENGTH && !accepted(lang, typed);

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

class Desk {
  constructor(host, context) {
    this.ctx = context;
    this.local = { typed: "", word: null, salt: null, lost: false, loaded: false, auto: null, told: "" };
    host.innerHTML = '<div class="fwd empty"><div class="fwd-table"></div><div class="fwd-form"></div></div>';
    this.root = host.firstElementChild;
    this.form = this.root.lastElementChild;
    this.keep = keeper(coreOf(host));
    this.table = table.mount(this.root.firstElementChild, this.seen());
    this.listen();
    this.paint();
    this.recall();
  }

  lang() {
    return this.ctx.state.lang ?? langFor(this.ctx.lang);
  }

  key() {
    return storeKey(this.ctx.view?.me ?? "", this.ctx.view?.index ?? 0);
  }

  seen() {
    return { ...this.ctx, own: { typed: this.local.typed, word: this.local.word } };
  }

  tell(text) {
    if (text && text !== this.local.told) this.ctx.notify?.(text);
    this.local.told = text;
  }

  async recall() {
    const kept = await this.keep.recall(this.key(), this.lang());
    if (kept) Object.assign(this.local, kept);
    this.local.loaded = true;
    this.table.update(this.seen());
    this.paint();
    this.settle();
  }

  notice() {
    const { ctx, local } = this;
    const { state, t } = ctx;
    const me = ctx.mySide ?? 0;
    if (state.phase === "place") return !this.committed() && refused(this.lang(), local.typed) ? t("notAWord") : "";
    if (local.lost) return t("secretLost");
    if (state.phase === "guess" && refused(this.lang(), local.typed)) return t("notAWord");
    return solvedAt(state, me) !== null && state.phase !== "done" ? t("youGotIt") : "";
  }

  committed() {
    return this.ctx.mySide !== null && this.ctx.state.commits[this.ctx.mySide] !== null;
  }

  formView() {
    const { ctx, local } = this;
    const { state, t } = ctx;
    const me = ctx.mySide ?? 0;
    const open = Boolean(ctx.canPlay && ctx.mySide !== null);
    const valid = accepted(this.lang(), local.typed);
    if (state.phase === "place") {
      const note = local.lost ? t("secretLost") : this.committed() ? t("secretWait") : t("secretHint");
      return { t, phase: "place", committed: this.committed(), typed: local.typed, open, valid, note };
    }
    const canGuess = open && state.phase === "guess" && state.guesses[me].length < MAX_GUESSES && solvedAt(state, me) === null;
    const theirs = state.phase === "done" && !local.lost ? state.reveals[1 - me]?.word : null;
    return { t, phase: state.phase, typed: local.typed, canGuess, valid, note: theirs ? t("theirWordWas", { word: theirs.toUpperCase() }) : "", reveal: Boolean(theirs) };
  }

  paint() {
    const view = this.formView();
    this.root.className = `fwd${this.local.typed ? "" : " empty"}${view.phase === "place" ? " place" : ""} s${this.ctx.mySide ?? 0}`;
    this.form.innerHTML = formHtml(view);
    this.tell(this.notice());
  }

  settle() {
    const { ctx, local } = this;
    if (!local.loaded || !ctx.canPlay || ctx.mySide === null) return;
    const { state } = ctx;
    const me = ctx.mySide;
    const stamp = `${ctx.view?.index}:${state.phase}:${state.guesses[0].length}:${state.guesses[1].length}:${state.answers[me].length}:${state.reveals.filter(Boolean).length}`;
    if (local.auto === stamp) return;
    if (state.commits[me] !== null && !local.word) {
      local.lost = true;
      this.paint();
      return;
    }
    const move = dueMove(state, me, local.word, local.salt);
    if (move) {
      local.auto = stamp;
      ctx.play(move);
    }
  }

  typed(text) {
    this.local.typed = text;
    this.table.update(this.seen());
  }

  listen() {
    this.form.addEventListener("input", (event) => this.input(event.target));
    this.form.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.form.querySelector('[data-act="commit"], [data-act="guess"]')?.click();
    });
    this.form.addEventListener("click", (event) => this.click(event.target.closest?.("button")));
  }

  input(field) {
    if (field.name !== "secret" && field.name !== "guess") return;
    this.typed(cleaned(field.value));
    this.root.classList.toggle("empty", !this.local.typed);
    const button = this.form.querySelector('[data-act="commit"], [data-act="guess"]');
    if (button) button.disabled = !(this.ctx.canPlay && accepted(this.lang(), this.local.typed));
    this.tell(this.notice());
  }

  async click(button) {
    if (!button || button.disabled) return;
    const { ctx, local } = this;
    const { act } = button.dataset;
    if (act === "suggest") {
      this.typed(suggest(this.lang()));
      this.paint();
      return;
    }
    if (!ctx.canPlay || ctx.mySide === null || !accepted(this.lang(), local.typed)) return;
    if (act === "commit" && ctx.state.phase === "place") {
      const [word, salt] = [local.typed, crypto.getRandomValues(new Uint8Array(SALT_BYTES))];
      Object.assign(local, { word, salt });
      this.typed("");
      if (!(await this.keep.keep(this.key(), salt, word))) return;
      ctx.play(secretMove(ctx.mySide, this.lang(), salt, word));
    } else if (act === "guess" && ctx.state.phase === "guess" && local.word) {
      const guess = local.typed;
      this.typed("");
      ctx.play(guessMove(ctx.state, ctx.mySide, local.word, guess));
    }
  }

  update(next) {
    if (next.view?.index !== this.ctx.view?.index) Object.assign(this.local, { word: null, salt: null, lost: false, auto: null, typed: "" });
    this.ctx = next;
    this.table.update(this.seen());
    this.paint();
    this.settle();
  }

  destroy() {
    this.table.destroy();
  }
}

export const board = {
  mount(host, context) {
    const desk = new Desk(host, context);
    return { update: (next) => desk.update(next), destroy: () => desk.destroy() };
  },
};
