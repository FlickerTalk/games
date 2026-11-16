import { icon } from "../../../kit/src/icons.js";
import { points } from "./rules.js";
import { sideMark } from "./tiles.js";

const MARKS = [0, 1].map((side) => sideMark(side).replace("<svg ", '<svg class="fwg-mark" '));

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const WORD_ROW = `<div class="fwg-word">
<button type="button" data-act="undo">${icon("chevron-back-outline")}</button>
<b aria-live="polite"></b>
<button type="button" data-act="say">${icon("send-outline")}<span></span></button>
<button type="button" data-act="pass">${icon("play-outline")}</button>
</div><div class="fwg-lists"><p></p><p></p></div><i class="fwg-nop"></i>`;

function scoresHtml({ t, phase, mySide, score, said }) {
  if (phase === "shuffle") return `<span class="fwg-note">${escape(t("shuffling"))}</span>`;
  const me = mySide ?? 0;
  const they = 1 - me;
  const label = (key, side) => `<span class="fwg-label">${escape(t(key, { n: said[side].length }))}</span>`;
  return `<span>${MARKS[me]} <b>${score[me]}</b> ${label("yourWords", me)}</span> <span>${label("theirWords", they)} <b>${score[they]}</b> ${MARKS[they]}</span>`;
}

const listHtml = (words) => words.map((word) => `<span>${escape(word)} <small>${points(word)}</small></span>`).join(", ");

const written = new WeakMap();

function setHtml(node, html) {
  if (written.get(node) === html) return;
  node.innerHTML = html;
  written.set(node, html);
}

function setButton(button, { label, disabled }) {
  if (label === undefined) button.removeAttribute("aria-label");
  else if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
  if (button.disabled !== disabled) button.disabled = disabled;
}

export function mountRows(host, { act }) {
  const page = host.ownerDocument;
  const top = page.createElement("div");
  top.className = "fwg fwg-top";
  top.innerHTML = '<div class="fwg-scores"></div>';
  const bottom = page.createElement("div");
  bottom.className = "fwg fwg-bottom";
  bottom.innerHTML = WORD_ROW;
  host.insertBefore(top, host.querySelector(":scope > .ftt-layer"));
  host.append(bottom);
  const part = (selector) => bottom.querySelector(selector);
  const onClick = (event) => {
    const button = event.target.closest?.("button[data-act]");
    if (button && !button.disabled) act(button.dataset.act);
  };
  bottom.addEventListener("click", onClick);

  return {
    paint(model) {
      const { t, phase, mySide, said } = model;
      const me = mySide ?? 0;
      bottom.className = `fwg fwg-bottom ${phase}`;
      setHtml(top.firstElementChild, scoresHtml(model));
      if (part(".fwg-word b").textContent !== model.word) part(".fwg-word b").textContent = model.word;
      setButton(part('[data-act="undo"]'), { label: t("undo"), disabled: !model.canUndo });
      setButton(part('[data-act="say"]'), { label: undefined, disabled: !model.canSay });
      setButton(part('[data-act="pass"]'), { label: t("pass"), disabled: !model.canPass });
      if (part('[data-act="say"] span').textContent !== t("sayWord")) part('[data-act="say"] span').textContent = t("sayWord");
      const [mine, theirs] = bottom.querySelectorAll(".fwg-lists p");
      setHtml(mine, listHtml(said[me]));
      setHtml(theirs, listHtml(said[1 - me]));
    },
    destroy() {
      bottom.removeEventListener("click", onClick);
      top.remove();
      bottom.remove();
    },
  };
}
