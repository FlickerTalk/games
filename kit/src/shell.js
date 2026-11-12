// Light DOM, so a board that needs the document (an SVG sprite) finds it. Ionic components are made
// once and patched, since a component drawn again is a frame without it.

import STYLE from "./style.css";
import { KIT_TEXTS, direction, joinTexts, translator } from "./i18n.js";
import { Table } from "./table.js";
import { mediumReads } from "./colour.js";
import { icon } from "./icons.js";
import { Toast } from "./toast.js";

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (one) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[one]);

const withIcons = (text) => escape(text).replace(/\{invite\}/g, icon("mail-outline"));

const slotted = (drawn, slot) => drawn.replace("<svg ", `<svg slot="${slot}" `);

const ionButton = (act, name, inside, attributes = "") =>
  `<ion-button data-kit="${act}" aria-label="${escape(name)}" title="${escape(name)}"${attributes ? ` ${attributes}` : ""}>${inside}</ion-button>`;

function label(node, name) {
  if (!node) return;
  if (node.getAttribute("aria-label") !== name) node.setAttribute("aria-label", name);
  if (node.getAttribute("title") !== name) node.setAttribute("title", name);
}

const note = (drawn, text, warn = false) => ({ text: text.replace(/\s*\{invite\}/g, ""), html: withIcons(text), icon: drawn, warn });

const NOTICES = {
  needsChat: ["chatbubble-outline", false],
  notOpen: ["person-outline", true],
  unreachable: ["cloud-offline-outline", true],
  left: ["exit-outline", false],
  busy: ["hourglass-outline", false],
  denied: ["ban-outline", true],
  update: ["arrow-up-circle-outline", true],
  fork: ["git-branch-outline", true],
  badMove: ["warning-outline", true],
  full: ["save-outline", true],
  invalid: ["warning-outline", true],
  abandoned: ["warning-outline", true],
  tooLong: ["warning-outline", true],
  error: ["warning-outline", true],
};
const RETRY = ["notOpen", "unreachable", "left", "denied", "error"];

const abandonedBy = (seen) => (seen?.end?.by === seen?.me ? "abandonedYou" : "abandonedThem");

// CSS px the app's room takes on a phone (bars, chat header, composer), measured on a Samsung S20+
export const ROOM_CHROME = 297;

// the app's frame height before the frame says its own (PluginSheet), so the frame resizes at most once
export const FRAME_START = 320;

export const PENDING_GRACE_MS = 3000;

// Stencil marks a drawn component `hydrated`, until then its children measure nothing
export function whenDrawn(nodes) {
  const waiting = nodes.filter((node) => customElements.get(node.localName) && !node.classList.contains("hydrated"));
  if (!waiting.length) return Promise.resolve();
  return new Promise((resolve) => {
    const watch = new MutationObserver(() => {
      if (!waiting.every((node) => node.classList.contains("hydrated"))) return;
      watch.disconnect();
      resolve();
    });
    for (const node of waiting) watch.observe(node, { attributes: true, attributeFilter: ["class"] });
  });
}

function roomHeight() {
  return (globalThis.screen?.height || 853) - ROOM_CHROME;
}

function appColour(name) {
  const page = document.documentElement;
  return (getComputedStyle(page).getPropertyValue(name) || page.style.getPropertyValue(name) || "").trim();
}

function appColours() {
  return Boolean(appColour("--ion-background-color"));
}

function addStyle(extra = "") {
  if (document.head.querySelector("style[data-ftg]")) return;
  const style = document.createElement("style");
  style.dataset.ftg = "";
  style.textContent = `${STYLE}\n${extra}`;
  document.head.append(style);
}

export function elementFor(game) {
  const translate = translator(joinTexts(KIT_TEXTS, game.texts ?? {}));

  return class GameElement extends HTMLElement {
    disconnectedCallback() {
      clearTimeout(this.pendingTimer);
      this.sizes?.disconnect();
      this.ask(null);
      this.pendingSince = null;
      this.watch?.disconnect();
      this.toast?.clear();
      this.told = "";
      this.letBoardGo();
      this.shown = null;
    }

    letBoardGo() {
      try {
        this.board?.destroy?.();
      } finally {
        this.board = null;
      }
    }

    connectedCallback() {
      if (this.table) return;
      addStyle(game.style);
      const ft = this.ft ?? globalThis.ft;
      this.t = (key, vars) => translate(this.table?.lang ?? "en", key, vars);
      this.asking = null;
      this.shown = null;
      this.board = null;
      this.drawn = new WeakMap();
      this.style.display = "block";
      this.sizes = globalThis.ResizeObserver ? new ResizeObserver(() => this.fitBoard()) : null;
      addEventListener("resize", () => this.fitBoard());
      this.root = document.createElement("div");
      this.root.className = "ftg";
      this.append(this.root);
      this.toast = new Toast();
      this.told = "";
      // the app switches its theme on the frame's root while the game is open
      this.watch = new MutationObserver(() => this.retheme());
      this.watch.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-dark"] });
      this.addEventListener("click", (event) => this.onClick(event));
      this.table = new Table({ ft, game, app: game.app, t: this.t, onChange: () => this.paint() });
      this.paint();
    }

    onClick(event) {
      const target = event.target.closest?.("[data-kit]");
      if (!target || !this.root.contains(target) || target.disabled) return;
      const table = this.table;
      const act = target.dataset.kit;
      const id = target.dataset.id;
      if (act === "new") table.newMatch();
      else if (act === "enter") table.enter(id);
      else if (act === "back") table.leave();
      else if (act === "retry") table.retry();
      else if (act === "again") table.again();
      else if (act === "send") table.sendResult();
      else if (act === "join") table.accept();
      else if (act === "dismiss") table.dismiss();
      else if (act === "fork-mine") table.pickFork("mine");
      else if (act === "fork-theirs") table.pickFork("theirs");
      else if (act === "delete") this.ask({ kind: "delete", id });
      else if (act === "resign") this.ask({ kind: "resign" });
    }

    /** The frame has no confirm(). The alert sits beside the page so no repaint takes it away. */
    ask(question) {
      this.asking = question;
      // in a page that cannot animate, the last alert would stay
      this.asked?.remove();
      this.alert = null;
      if (!question) return;
      const t = this.t;
      const [message, yes] = question.kind === "delete" ? [t("confirmDelete"), t("delete")] : [t("confirmResign"), t("resign")];
      const alert = document.createElement("ion-alert");
      alert.setAttribute("dir", direction(this.lang));
      alert.setAttribute("lang", this.lang);
      alert.message = message;
      alert.buttons = [
        { text: t("cancel"), role: "cancel", htmlAttributes: { "data-kit": "no" } },
        { text: yes, role: "destructive", htmlAttributes: { "data-kit": "yes" } },
      ];
      alert.addEventListener("ionAlertWillDismiss", (event) => {
        if (this.alert !== alert) return;
        this.alert = null;
        this.asking = null;
        if (event.detail?.role !== "destructive") return;
        if (question.kind === "delete") this.table.remove(question.id);
        if (question.kind === "resign") this.table.resign();
      });
      this.alert = alert;
      this.asked = alert;
      this.append(alert);
      alert.present?.();
    }

    set(node, html) {
      if (!node || this.drawn.get(node) === html) return;
      this.drawn.set(node, html);
      node.innerHTML = html;
    }

    get lang() {
      return this.table.lang;
    }

    number(value) {
      return new Intl.NumberFormat(this.lang).format(value);
    }

    paint() {
      const table = this.table;
      const root = this.root;
      // nothing before the app gives the language, an English shell replaced later would flash and move
      if (!table.ready) {
        root.innerHTML = "";
        root.style.minHeight = `${FRAME_START}px`;
        return;
      }
      root.setAttribute("dir", direction(this.lang));
      root.setAttribute("lang", this.lang);
      root.toggleAttribute("data-dark", table.dark);
      this.retheme();
      this.page();
      if (!this.pageDrawn) {
        root.style.minHeight = `${FRAME_START}px`;
        const content = this.content;
        this.drawing ??= whenDrawn([...root.querySelectorAll(":scope > ion-header, :scope > ion-header > ion-toolbar, :scope > ion-content")]).then(() => {
          if (this.content !== content) return;
          this.drawing = null;
          this.pageDrawn = true;
          if (this.isConnected) this.paint();
        });
        return;
      }
      root.style.removeProperty("min-height");
      const shown = table.screen === "match" && table.record ? `match:${table.record.id}` : "list";
      if (shown !== this.shown) this.letBoardGo();
      if (shown === "list") {
        if (shown !== this.shown) this.listScreen();
        this.shown = shown;
        this.paintList();
        this.tell(null);
        this.fitBoard();
        return;
      }
      const seen = table.view;
      const fresh = shown !== this.shown;
      if (fresh) {
        this.shown = shown;
        this.matchScreen();
      }
      const part = (name) => root.querySelector(`[data-part="${name}"]`);
      this.paintBar(seen);
      this.set(part("players"), this.playersHtml(seen));
      this.tell(seen);
      part("stage").classList.toggle("dim", ["ended", "broken"].includes(seen.phase));
      this.set(part("overlay"), this.overlayHtml(seen));
      this.set(part("result"), this.resultHtml(seen));
      this.fitBoard();
      if (fresh) this.board = game.board.mount(part("board"), this.boardContext(seen));
      else this.board?.update?.(this.boardContext(seen));
    }

    page() {
      const root = this.root;
      if (this.content?.parentNode === root) return;
      root.innerHTML =
        '<ion-header><ion-toolbar class="ftg-bar" data-part="bar"></ion-toolbar><ion-toolbar class="ftg-notice" data-part="notice"></ion-toolbar></ion-header><ion-content scroll-y="false" data-part="content"></ion-content>';
      this.band = root.querySelector('[data-part="notice"]');
      this.toast.attach(this.band);
      this.bar = root.querySelector('[data-part="bar"]');
      this.content = root.querySelector('[data-part="content"]');
      this.shown = null;
      this.pageDrawn = false;
      this.drawing = null;
      this.sizes?.observe(root.firstElementChild);
    }

    fill(html) {
      this.content.innerHTML = html;
      this.sizes?.observe(this.content.firstElementChild);
    }

    listScreen() {
      this.bar.innerHTML = `<ion-title class="ftg-title" data-part="title"></ion-title><ion-buttons slot="end">${ionButton("new", this.t("newMatch"), slotted(icon("add-outline"), "icon-only"))}</ion-buttons>`;
      this.fill('<div class="ftg-body" data-part="body"></div>');
    }

    paintList() {
      const t = this.t;
      this.set(this.bar.querySelector('[data-part="title"]'), escape(t("matches")));
      const add = this.bar.querySelector('[data-kit="new"]');
      label(add, t("newMatch"));
      add.toggleAttribute("disabled", !this.table.live);
      this.set(this.content.querySelector('[data-part="body"]'), this.listHtml());
    }

    matchScreen() {
      const t = this.t;
      this.bar.innerHTML = `<ion-buttons slot="start">${ionButton("back", t("back"), slotted(icon("chevron-back-outline", "ftg-flip"), "icon-only"))}</ion-buttons><ion-title><div class="ftg-score" data-part="score" role="img"></div></ion-title><ion-buttons slot="end" data-part="actions">${ionButton("resign", t("resign"), slotted(icon("flag-outline"), "icon-only"))}</ion-buttons>`;
      this.fill(`<div class="ftg-main" data-part="main">
  <div class="ftg-players" data-part="players"></div>
  <div class="ftg-result" data-part="result"></div>
  <div class="ftg-stage" data-part="stage"><div class="ftg-board" data-part="board" dir="ltr"></div><div class="ftg-overlay" data-part="overlay"></div></div>
</div>`);
    }

    retheme() {
      const root = this.root;
      root.toggleAttribute("data-themed", appColours());
      root.toggleAttribute("data-medium", mediumReads({ background: appColour("--ion-background-color"), ink: appColour("--ion-text-color"), medium: appColour("--ion-color-medium") }));
    }

    boardContext(seen) {
      const table = this.table;
      return {
        state: seen.state,
        view: seen,
        mySide: seen.mySide,
        canPlay: table.live && seen.phase === "play" && seen.myTurn && !seen.fork,
        last: seen.last,
        pending: seen.pending > 0,
        result: seen.phase === "over" ? seen.result : null,
        lang: this.lang,
        t: this.t,
        play: (move) => table.play(move),
        notify: (text) => this.toast.flash(text ? note(icon("information-circle-outline"), String(text)) : null),
      };
    }

    listHtml() {
      const t = this.t;
      const table = this.table;
      const newLabel = escape(t("newMatch"));
      let html = this.promptHtml("banner");
      if (!table.live) html += `<p class="ftg-hint">${icon("chatbubble-outline")} ${escape(t("needsChat", { game: t("name") }))}</p>`;
      if (!table.matches.length) {
        html += `<div class="ftg-empty"><div class="ftg-hero" aria-hidden="true">${icon("game-controller-outline")}</div><p>${escape(t("noMatches"))}</p>${
          table.live ? `<ion-button data-kit="new" shape="round">${slotted(icon("add-outline"), "start")}${newLabel}</ion-button>` : ""
        }</div>`;
        return html;
      }
      const day = new Intl.DateTimeFormat(this.lang, { day: "numeric", month: "short" });
      html += `<ul class="ftg-list" aria-label="${escape(t("matches"))}">`;
      for (const { record, view: seen } of table.matches) {
        const [state, label] = this.rowState(seen);
        const score = `${this.number(seen.score.me)}–${this.number(seen.score.them)}`;
        const meta = [label, t("started", { date: day.format(new Date(record.created)) })].filter(Boolean).join(" · ");
        html += `<li class="ftg-row${seen.myTurn ? " mine" : ""}"><button class="ftg-row-open" data-kit="enter" data-id="${escape(record.id)}" aria-label="${escape(`${meta} · ${t("score")} ${score}`)}"><span class="ftg-row-icon" aria-hidden="true">${icon(state)}</span><span class="ftg-row-text"><span class="ftg-row-score">${escape(score)}</span><span class="ftg-row-meta">${escape(meta)}</span></span></button>${ionButton("delete", t("delete"), slotted(icon("trash-outline"), "icon-only"), `data-id="${escape(record.id)}" fill="clear" color="medium"`)}</li>`;
      }
      return `${html}</ul>`;
    }

    rowState(seen) {
      const t = this.t;
      if (seen.phase === "play") return seen.myTurn ? ["play-outline", t("yourTurn")] : [seen.pending ? "time-outline" : "hourglass-outline", t("theirTurn")];
      if (seen.phase === "over") return ["checkmark-circle-outline", t("over")];
      if (seen.phase === "ended" || seen.phase === "broken") return ["ban-outline", t("ended")];
      return ["hourglass-outline", ""];
    }

    paintBar(seen) {
      const t = this.t;
      const bar = this.bar;
      const can = this.table.live && seen.phase === "play" && !seen.fork;
      label(bar.querySelector('[data-kit="back"]'), t("back"));
      const score = bar.querySelector('[data-part="score"]');
      this.set(score, `<span class="me">${this.number(seen.score.me)}</span><span class="dash">–</span><span class="them">${this.number(seen.score.them)}</span>`);
      score.setAttribute("aria-label", `${t("score")} ${seen.score.me}–${seen.score.them}`);
      const resign = bar.querySelector('[data-kit="resign"]');
      label(resign, t("resign"));
      resign.toggleAttribute("disabled", !can);
      const retrying = this.table.live && RETRY.includes(this.table.notice?.key);
      let retry = bar.querySelector('[data-kit="retry"]');
      if (retrying && !retry) {
        bar.querySelector('[data-part="actions"]').insertAdjacentHTML("afterbegin", ionButton("retry", t("retry"), slotted(icon("refresh-outline"), "icon-only")));
        retry = bar.querySelector('[data-kit="retry"]');
      } else if (!retrying && retry) {
        retry.remove();
        retry = null;
      }
      label(retry, t("retry"));
    }

    playersHtml(seen) {
      const t = this.t;
      const sides = game.sides ?? [];
      const mark = (side) => (side === null || side === undefined ? "" : sides[side] ?? "");
      const mine = seen.mySide;
      const theirs = mine === null ? null : 1 - mine;
      const chip = (who, side, name, extra) =>
        `<div class="ftg-player ${who}${extra}"${side === null ? "" : ` data-side="${side}"`}><span class="mark" aria-hidden="true">${mark(side)}</span><span class="who">${escape(name)}</span>${who === "them" ? '<span class="ftg-dot" aria-hidden="true"></span>' : ""}</div>`;
      const turn = (who) => (seen.turn && seen.turn === who ? " turn" : "");
      return chip("me", mine, t("you"), turn(seen.me)) + chip("them", theirs, t("them"), `${turn(seen.peer)}${this.table.peerHere ? " here" : ""}`);
    }

    fitBoard() {
      const root = this.root;
      const stage = root.querySelector('[data-part="stage"]');
      if (!stage) {
        this.sizeContent();
        return;
      }
      if (globalThis.matchMedia?.("(min-width: 720px)").matches) {
        const band = this.band?.getBoundingClientRect().height ?? 0;
        root.removeAttribute("data-compact");
        root.style.setProperty("--ftg-board", `${Math.max(240, roomHeight() - 72 - band)}px`);
        this.sizeContent();
        return;
      }
      const main = stage.parentElement;
      const content = this.content;
      const width = main.clientWidth;
      const room = roomHeight();
      const height = (node) => node.getBoundingClientRect().height;
      const left = () => room - (height(root) - height(content) + height(main) - height(stage));
      const playing = this.table.view?.phase === "play";
      const least = playing ? (game.minBoard ?? 200) : 120;
      root.removeAttribute("data-compact");
      root.style.setProperty("--ftg-board", `${width}px`);
      if (left() < Math.min(least, width)) root.setAttribute("data-compact", "");
      const board = Math.floor(Math.max(Math.min(width, left()), Math.min(least, width)));
      root.style.setProperty("--ftg-board", `${board}px`);
      this.sizeContent();
    }

    /** ion-content has no height of its own here, it takes its children's so the frame can follow. */
    sizeContent() {
      const inner = this.content?.firstElementChild;
      if (!inner) return;
      const height = `${Math.ceil(inner.getBoundingClientRect().height)}px`;
      if (this.content.style.height !== height) this.content.style.height = height;
    }

    tell(seen) {
      if (seen?.phase === "over" && this.phase !== "over") this.toast.flash(null);
      this.phase = seen?.phase;
      this.toast.hold(seen ? this.standing(seen) : null);
      const notice = this.noticeNow(seen);
      const told = notice?.text ?? "";
      if (told === this.told) return;
      this.told = told;
      this.toast.flash(notice);
    }

    standing(seen) {
      const t = this.t;
      const table = this.table;
      const long = this.pendingLong(seen);
      if (!table.live) return note(icon("chatbubble-outline"), t("needsChat", { game: t("name") }));
      if (seen.phase === "invite" && !table.peerHere) return note(icon("person-outline"), t("howToInvite"));
      if (table.connecting && seen.phase !== "invite") return note(icon("radio-outline"), t("connecting"));
      if (seen.pending > 0 && seen.phase !== "ended" && long) return note(icon("time-outline"), t("pending", { game: t("name") }));
      return this.status(seen);
    }

    pendingLong(seen) {
      if (!(seen.pending > 0)) {
        clearTimeout(this.pendingTimer);
        this.pendingSince = null;
        return false;
      }
      if (this.pendingSince == null) {
        this.pendingSince = Date.now();
        clearTimeout(this.pendingTimer);
        this.pendingTimer = setTimeout(() => this.paint(), PENDING_GRACE_MS);
      }
      return Date.now() - this.pendingSince >= PENDING_GRACE_MS;
    }

    noticeNow(seen) {
      const t = this.t;
      const notice = this.table.notice;
      if (!notice || notice.key === "fork") return null;
      if (!seen && RETRY.includes(notice.key)) return null;
      if (seen?.phase === "invite" && notice.key === "notOpen") return null;
      const [drawn, warn] = NOTICES[notice.key] ?? ["information-circle-outline", false];
      const key = notice.key === "abandoned" ? abandonedBy(seen) : notice.key;
      return note(icon(drawn), t(key, { game: t("name"), ...notice.vars }), warn);
    }

    status(seen) {
      const t = this.t;
      const game_ = t("name");
      const round = seen.index > 0 ? `${t("round", { n: this.number(seen.index + 1) })} · ` : "";
      const line = (art, text) => note(art, `${round}${text}`);
      const mark = (side) => (side === null ? "" : game.sides?.[side]) || "";
      if (seen.phase === "invite") return note(icon("person-outline"), t("waiting", { game: game_ }));
      if (seen.phase === "toss") return note(icon("dice-outline"), t("tossing"));
      if (seen.phase === "ended" || seen.phase === "broken") return line(icon("ban-outline"), t("ended"));
      if (seen.phase === "over") {
        const { big, title, how } = this.outcome(seen);
        return line(icon(big), how ? `${title} · ${how}` : title);
      }
      const fresh = seen.index === 0 && !seen.round.moves.length;
      const mine = mark(seen.mySide) || icon("play-outline");
      const theirs = mark(1 - seen.mySide) || icon("hourglass-outline");
      if (seen.myTurn) return fresh ? line(icon("dice-outline"), t("youStart")) : line(mine, t("yourTurn"));
      return fresh ? line(icon("dice-outline"), t("theyStart")) : line(theirs, t("theirTurn"));
    }

    overlayHtml(seen) {
      return this.promptHtml("card") + (seen.fork ? this.forkHtml() : this.phaseHtml(seen));
    }

    forkHtml() {
      const t = this.t;
      return `<div class="ftg-card" role="alert"><div class="ftg-big" aria-hidden="true">${icon("git-branch-outline")}</div><p>${escape(t("fork"))}</p><div class="ftg-actions"><ion-button data-kit="fork-mine" fill="outline">${escape(t("forkMine"))}</ion-button><ion-button data-kit="fork-theirs" fill="outline">${escape(t("forkTheirs"))}</ion-button></div></div>`;
    }

    phaseHtml(seen) {
      const t = this.t;
      if (seen.phase === "toss") return `<div class="ftg-wait" aria-hidden="true"><span class="ftg-coin">${icon("dice-outline")}</span></div>`;
      if (seen.phase === "ended" || seen.phase === "broken") {
        const why = seen.end?.k === "invalid" ? t("invalid") : seen.end?.k === "abandoned" ? t(abandonedBy(seen)) : t("ended");
        return `<div class="ftg-card"><div class="ftg-big" aria-hidden="true">${icon("warning-outline")}</div><h2>${escape(t("ended"))}</h2><p>${escape(why)}</p></div>`;
      }
      return "";
    }

    outcome(seen) {
      const t = this.t;
      const result = seen.result;
      const won = result.winner === seen.me;
      return {
        big: result.winner === null ? "reorder-two-outline" : won ? "trophy-outline" : "sad-outline",
        title: result.winner === null ? t("draw") : won ? t("youWon") : t("youLost"),
        how: result.k === "resign" ? (result.by === seen.me ? t("youResigned") : t("theyResigned")) : this.why(result),
      };
    }

    why(result) {
      if (result.k !== "rules" || typeof game.how !== "function") return "";
      try {
        return String(game.how(result.result, this.t) ?? "");
      } catch {
        return "";
      }
    }

    resultHtml(seen) {
      const t = this.t;
      if (seen.phase !== "over") return "";
      const { title, how } = this.outcome(seen);
      const again = this.table.live
        ? ionButton("again", t("again"), slotted(icon("repeat-outline"), "icon-only"), 'class="ftg-again" fill="outline" shape="round"')
        : "";
      return `<div class="ftg-result-card" role="group" aria-label="${escape(how ? `${title} · ${how}` : title)}"><div class="ftg-actions"><ion-button class="ftg-send" data-kit="send" shape="round">${slotted(icon("send-outline"), "start")}${escape(t("sendResult"))}</ion-button>${again}</div></div>`;
    }

    promptHtml(kind) {
      const t = this.t;
      const prompt = this.table.prompt;
      if (!prompt) return "";
      const text = prompt.kind === "invited" ? t("invited") : t("elsewhere");
      const go = prompt.kind === "invited" ? t("join") : t("open");
      const buttons = `<ion-button data-kit="join" shape="round">${escape(go)}</ion-button><ion-button class="quiet" data-kit="dismiss" fill="clear">${escape(t("dismiss"))}</ion-button>`;
      if (kind === "card") return `<div class="ftg-card prompt" role="alert"><div class="ftg-big" aria-hidden="true">${icon("enter-outline")}</div><p>${escape(text)}</p><div class="ftg-actions">${buttons}</div></div>`;
      return `<div class="ftg-banner prompt" role="alert"><span class="icon" aria-hidden="true">${icon("enter-outline")}</span><span class="say">${escape(text)}</span>${buttons}</div>`;
    }
  };
}
