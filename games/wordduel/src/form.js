import { icon } from "../../../kit/src/icons.js";
import { LENGTH } from "./rules.js";

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const shut = (on) => (on ? "" : "disabled");

function field(name, label, typed, open) {
  return `<input name="${name}" maxlength="${LENGTH}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${escape(label)}" value="${escape(typed)}" ${shut(open)}>`;
}

function controls({ t, act, name, label, typed, open, valid, sendIcon, send }) {
  return `<button data-act="suggest" aria-label="${escape(t("suggest"))}" ${shut(open)}>${icon("dice-outline")}</button>
    ${field(name, label, typed, open)}
    <button data-act="${act}" ${shut(open && valid)}>${icon(sendIcon)}<span>${escape(send)}</span></button>`;
}

const noteHtml = (note, reveal) => (note ? `<p class="fwd-note${reveal ? " reveal" : ""}">${escape(note)}</p>` : "");

export function formHtml({ t, phase, committed = false, typed = "", open = false, valid = false, canGuess = false, note = "", reveal = false }) {
  let body = "";
  if (phase === "place" && !committed) {
    body = controls({ t, act: "commit", name: "secret", label: t("yourSecret"), typed, open: true, valid: open && valid, sendIcon: "checkmark-circle-outline", send: t("setWord") });
  } else if (phase === "guess") {
    body = controls({ t, act: "guess", name: "guess", label: t("aGuess"), typed, open: canGuess, valid, sendIcon: "send-outline", send: t("guess") });
  }
  return `${body}${noteHtml(note, reveal)}<i class="fwd-nop"></i>`;
}
