// The board of Word Duel (README, "A game": `board.mount`). First the secret word: typed, or
// suggested from the common words, and set (the word and its salt are kept in the plugin's store
// under this participant and round, and the kit gets the commitment). Then the user's guesses as
// rows of tiles coloured by the other side's answers, the other side's guesses smaller beside
// them, and a field to guess. The answers to the other side's guesses are made here from the
// secret word, honestly, and go out with the next guess; the answer that ends the guessing, and
// the reveal, go out on their own. The board never talks to the other phone.

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { fromBase64url, toBase64url } from "./sha256.js";
import { LENGTH, MAX_GUESSES, SALT_BYTES, accepted, commitText, commitTextSecond, honestAnswer, langFor, play, revealText, solvedAt, suggest } from "./rules.js";

export { STYLE };

/** The two sides' marks: a tile in each side's colour, shown on the players' chips. */
export const MARKS = [
  '<svg class="fwd-mark s0" viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="10" width="80" height="80" rx="14"/></svg>',
  '<svg class="fwd-mark s1" viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="10" width="80" height="80" rx="14"/></svg>',
];

/** Where the secret word and its salt are kept: by participant and round. */
export const storeKey = (me, round) => `wordduel/${me}/${round}`;

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function rowHtml(guess, answer, t, { pending = false } = {}) {
  let html = '<div class="fwd-row" role="row">';
  for (let at = 0; at < LENGTH; at += 1) {
    const letter = guess?.[at] ?? "";
    const mark = answer?.[at] ?? "";
    const name = letter ? `${letter.toUpperCase()}: ${mark === "g" ? t("right") : mark === "y" ? t("near") : mark === "b" ? t("wrong") : t("unanswered")}` : "";
    html += `<span class="fwd-tile ${mark}${pending ? " pending" : ""}" role="cell" ${name ? `aria-label="${escape(name)}"` : ""}>${letter.toUpperCase()}</span>`;
  }
  return `${html}</div>`;
}

function gridHtml(guesses, answers, t, { small = false, pending = false, label }) {
  let rows = "";
  for (let at = 0; at < MAX_GUESSES; at += 1) rows += rowHtml(guesses[at], answers[at], t, { pending: pending && at === guesses.length - 1 && !answers[at] });
  return `<div><p class="fwd-label">${label}</p><div class="fwd-grid${small ? " small" : ""}" role="grid">${rows}</div></div>`;
}

function draw(host, ctx, local) {
  const { state } = ctx;
  const t = ctx.t;
  const me = ctx.mySide ?? 0;
  const they = 1 - me;
  const lang = state.lang ?? langFor(ctx.lang);
  const typed = local.typed;
  const open = ctx.canPlay && ctx.mySide !== null;
  const empty = !typed;

  if (state.phase === "place") {
    const committed = ctx.mySide !== null && state.commits[me] !== null;
    const valid = accepted(lang, typed);
    const note = local.lost ? t("secretLost") : committed ? t("secretWait") : typed && !valid ? t("notAWord") : t("secretHint");
    host.innerHTML = `<div class="fwd${empty ? " empty" : ""} s${me}">
      <div class="fwd-secret">
        <p class="fwd-label">${escape(t("yourSecret"))}</p>
        ${rowHtml(committed ? local.word ?? "" : typed, committed ? "ggggg" : "", t)}
      </div>
      <div class="fwd-form">
        ${
          committed
            ? `<p class="fwd-note">${escape(note)}</p>`
            : `<button data-act="suggest" aria-label="${escape(t("suggest"))}">${icon("dice-outline")}</button>
               <input name="secret" maxlength="${LENGTH}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${escape(t("yourSecret"))}" value="${escape(typed)}">
               <button data-act="commit" ${open && valid ? "" : "disabled"}>${icon("checkmark-circle-outline")}<span>${escape(t("setWord"))}</span></button>
               <p class="fwd-note${typed && !valid ? " warn" : ""}">${escape(note)}</p>`
        }
      </div>
      <i class="fwd-nop"></i>
    </div>`;
    return;
  }

  const guessing = state.phase === "guess";
  const owes = guessing && state.guesses[they].length > state.answers[me].length;
  const mine = state.guesses[me];
  const myAnswers = state.answers[they];
  const theirs = state.guesses[they];
  const theirAnswers = state.answers[me].slice();
  // The answer this phone owes is shown already, as it will go out with the next guess.
  if (owes && local.word) theirAnswers.push(honestAnswer(state, me, local.word));
  const valid = accepted(lang, typed);
  const canGuess = open && guessing && mine.length < MAX_GUESSES && solvedAt(state, me) === null;
  const done = state.phase === "done";
  const theirWord = done && state.reveals[they] ? state.reveals[they].word : null;
  const note = local.lost ? t("secretLost") : done && theirWord ? t("theirWordWas", { word: theirWord.toUpperCase() }) : typed && !valid ? t("notAWord") : solvedAt(state, me) !== null ? t("youGotIt") : "";
  host.innerHTML = `<div class="fwd${empty ? " empty" : ""} s${me}">
    <div class="fwd-boards">
      ${gridHtml(mine, myAnswers, t, { pending: ctx.pending, label: `${MARKS[me]} ${escape(t("yourGuesses"))}` })}
      ${gridHtml(theirs, theirAnswers, t, { small: true, label: `${MARKS[they]} ${escape(t("theirGuesses"))}` })}
    </div>
    <div class="fwd-form">
      ${
        guessing
          ? `<button data-act="suggest" aria-label="${escape(t("suggest"))}" ${canGuess ? "" : "disabled"}>${icon("dice-outline")}</button>
             <input name="guess" maxlength="${LENGTH}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${escape(t("aGuess"))}" value="${escape(typed)}" ${canGuess ? "" : "disabled"}>
             <button data-act="guess" ${canGuess && valid ? "" : "disabled"}>${icon("send-outline")}<span>${escape(t("guess"))}</span></button>`
          : ""
      }
      ${note ? `<p class="fwd-note${typed && !valid && guessing ? " warn" : ""}">${escape(note)}</p>` : ""}
    </div>
    <i class="fwd-nop"></i>
  </div>`;
}

/** The plugin's `ft`: on the game's own element, or global. */
function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

/** What was typed, as a word: lower case, accents dropped, ñ kept, letters only. */
export function cleaned(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/ñ/g, "ñ")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zñ]/g, "")
    .slice(0, LENGTH);
}

export const board = {
  mount(host, first) {
    let ctx = first;
    const local = { typed: "", word: null, salt: null, lost: false, loaded: false, auto: null };
    const ft = coreOf(host);
    const key = () => storeKey(ctx.view?.me ?? "", ctx.view?.index ?? 0);
    const lang = () => ctx.state.lang ?? langFor(ctx.lang);

    const remember = async () => {
      if (!ft?.store) return true;
      try {
        return (await ft.store.set(key(), JSON.stringify({ salt: toBase64url(local.salt), word: local.word }))) !== false;
      } catch {
        return false;
      }
    };
    const recall = async () => {
      try {
        const kept = await ft?.store?.get?.(key());
        if (kept) {
          const read = JSON.parse(kept);
          const salt = fromBase64url(read.salt);
          if (salt && salt.length === SALT_BYTES && accepted(lang(), read.word)) {
            local.salt = salt;
            local.word = read.word;
          }
        }
      } catch {
        // Nothing kept.
      }
      local.loaded = true;
      draw(host, ctx, local);
      settle();
    };

    /** What goes out on its own: the answer that ends the guessing, and the reveal. */
    const settle = () => {
      if (!local.loaded || !ctx.canPlay || ctx.mySide === null) return;
      const { state } = ctx;
      const me = ctx.mySide;
      const stamp = `${ctx.view?.index}:${state.phase}:${state.guesses[0].length}:${state.guesses[1].length}:${state.answers[me].length}:${state.reveals.filter(Boolean).length}`;
      if (local.auto === stamp) return;
      if (state.commits[me] !== null && !local.word) {
        local.lost = true;
        draw(host, ctx, local);
        return;
      }
      if (state.phase === "guess" && me === 0) {
        // Side 0 ends the guessing with the answer alone when the round is decided: the rules take
        // that move only then, so the board asks them.
        const answer = honestAnswer(state, 0, local.word);
        if (answer && !play(state, answer, 0).error) {
          local.auto = stamp;
          ctx.play(answer);
        }
      } else if (state.phase === "reveal") {
        local.auto = stamp;
        ctx.play(revealText(local.salt, local.word));
      }
    };

    host.addEventListener("input", (event) => {
      const field = event.target;
      if (field.name !== "secret" && field.name !== "guess") return;
      local.typed = cleaned(field.value);
      const valid = accepted(lang(), local.typed);
      host.querySelector(".fwd")?.classList.toggle("empty", !local.typed);
      const button = host.querySelector('[data-act="commit"], [data-act="guess"]');
      if (button) button.disabled = !(ctx.canPlay && valid);
      const note = host.querySelector(".fwd-note");
      if (note) {
        note.textContent = local.typed && !valid ? ctx.t("notAWord") : ctx.state.phase === "place" ? ctx.t("secretHint") : "";
        note.classList.toggle("warn", Boolean(local.typed && !valid));
      }
    });
    host.addEventListener("keydown", (event) => {
      if (event.key === "Enter") host.querySelector('[data-act="commit"], [data-act="guess"]')?.click();
    });
    host.addEventListener("click", async (event) => {
      const button = event.target.closest?.("button");
      if (!button || button.disabled) return;
      const { act } = button.dataset;
      if (act === "suggest") {
        local.typed = suggest(lang());
        draw(host, ctx, local);
        return;
      }
      if (!ctx.canPlay || ctx.mySide === null) return;
      if (act === "commit" && ctx.state.phase === "place" && accepted(lang(), local.typed)) {
        local.word = local.typed;
        local.salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        local.typed = "";
        if (!(await remember())) return;
        ctx.play(ctx.mySide === 0 ? commitText(lang(), local.salt, local.word) : commitTextSecond(local.salt, local.word));
      } else if (act === "guess" && ctx.state.phase === "guess" && accepted(lang(), local.typed) && local.word) {
        const guess = local.typed;
        local.typed = "";
        ctx.play(`${honestAnswer(ctx.state, ctx.mySide, local.word)}>${guess}`);
      }
    });

    draw(host, ctx, local);
    recall();
    return {
      update(next) {
        if (next.view?.index !== ctx.view?.index) {
          local.word = null;
          local.salt = null;
          local.lost = false;
          local.auto = null;
          local.typed = "";
        }
        ctx = next;
        draw(host, ctx, local);
        settle();
      },
    };
  },
};
