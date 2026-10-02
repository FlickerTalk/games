// The shell every game shares (README, "The shell"): the list of matches kept on this phone, a
// match with whose turn it is, the honest messages, the result and the way to the chat. It is
// drawn in the light DOM — a frame holds one game and nothing else — so a board that needs the
// document (an SVG sprite, a library's own markup) finds it. The board is built once per match
// and told of every change; everything around it is drawn again.

import STYLE from "./style.css";
import { KIT_TEXTS, direction, joinTexts, translator } from "./i18n.js";
import { Table } from "./table.js";

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (one) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[one]);

const BACK = '<svg class="ftg-flip" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4m0 0h11.5l-2.5 4.25L17.5 12.5H6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** How each message looks: its icon, and whether it warns or only tells. */
const NOTICES = {
  needsChat: ["💬", false],
  notOpen: ["👤", true],
  unreachable: ["📵", true],
  left: ["👋", false],
  busy: ["⏳", false],
  denied: ["🚫", true],
  update: ["📦", true],
  fork: ["🔀", true],
  badMove: ["⚠️", true],
  full: ["💾", true],
  invalid: ["⚠️", true],
  abandoned: ["⚠️", true],
  tooLong: ["📏", true],
  error: ["⚠️", true],
};
/** The messages that one more hello may fix. */
const RETRY = ["notOpen", "unreachable", "left", "denied", "error"];

/** Which phone did not reveal the coin in time, said as it is. */
const abandonedBy = (seen) => (seen?.end?.by === seen?.me ? "abandonedYou" : "abandonedThem");

/** The page's stylesheet, once: the kit's and the game's own. */
function addStyle(extra = "") {
  if (document.head.querySelector("style[data-ftg]")) return;
  const style = document.createElement("style");
  style.dataset.ftg = "";
  style.textContent = `${STYLE}\n${extra}`;
  document.head.append(style);
}

/** The custom element of one game. */
export function elementFor(game) {
  const translate = translator(joinTexts(KIT_TEXTS, game.texts ?? {}));

  return class GameElement extends HTMLElement {
    disconnectedCallback() {
      this.letBoardGo();
      this.shown = null;
    }

    /** The board leaves the screen: it may let go of what it holds (`destroy`, optional). */
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
      this.style.display = "block";
      this.style.setProperty("--ftg-h", `${Math.max(480, (globalThis.screen?.availHeight ?? 800) - 150)}px`);
      this.root = document.createElement("div");
      this.root.className = "ftg";
      this.append(this.root);
      this.addEventListener("click", (event) => this.onClick(event));
      this.table = new Table({ ft, game, app: game.app, t: this.t, onChange: () => this.paint() });
      this.paint();
    }

    // ---- What the user touches ----

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
      else if (act === "no") this.ask(null);
      else if (act === "yes") {
        const asked = this.asking;
        this.ask(null);
        if (asked?.kind === "delete") table.remove(asked.id);
        if (asked?.kind === "resign") table.resign();
      }
    }

    ask(question) {
      this.asking = question;
      this.paint();
    }

    // ---- Drawing ----

    get lang() {
      return this.table.lang;
    }

    number(value) {
      return new Intl.NumberFormat(this.lang).format(value);
    }

    paint() {
      const table = this.table;
      const root = this.root;
      root.setAttribute("dir", direction(this.lang));
      root.setAttribute("lang", this.lang);
      root.toggleAttribute("data-dark", table.dark);
      const shown = table.screen === "match" && table.record ? `match:${table.record.id}` : "list";
      if (shown !== this.shown) this.letBoardGo();
      if (shown === "list") {
        this.shown = shown;
        root.innerHTML = this.listHtml() + this.dialogHtml();
        return;
      }
      const seen = table.view;
      if (shown !== this.shown) {
        this.shown = shown;
        root.innerHTML = `<header class="ftg-bar" data-part="bar"></header>
<div class="ftg-main">
  <div class="ftg-players" data-part="players"></div>
  <p class="ftg-status" role="status" aria-live="polite" data-part="status"></p>
  <p class="ftg-hint-under" data-part="hint"></p>
  <div class="ftg-stage" data-part="stage"><div class="ftg-board" data-part="board" dir="ltr"></div><div class="ftg-overlay" data-part="overlay"></div></div>
  <div class="ftg-result" data-part="result"></div>
  <div class="ftg-banners" data-part="banner"></div>
</div>
<div data-part="dialog"></div>`;
        this.board = game.board.mount(root.querySelector('[data-part="board"]'), this.boardContext(seen));
      } else {
        this.board?.update?.(this.boardContext(seen));
      }
      const part = (name) => root.querySelector(`[data-part="${name}"]`);
      part("bar").innerHTML = this.barHtml(seen);
      part("players").innerHTML = this.playersHtml(seen);
      const status = this.status(seen);
      part("status").className = `ftg-status ${status.mine ? "mine" : "theirs"}${status.over ? " over" : ""}`;
      part("status").innerHTML = status.html;
      // Under the status: what to do while the other person is missing, or how the round ended.
      part("hint").textContent = this.waitingFor(seen) ? this.t("howToInvite") : seen.phase === "over" ? this.outcome(seen).how : "";
      part("stage").classList.toggle("dim", ["invite", "toss", "ended", "broken"].includes(seen.phase));
      part("overlay").innerHTML = this.overlayHtml(seen);
      part("result").innerHTML = this.resultHtml(seen);
      part("banner").innerHTML = this.bannerHtml(seen);
      part("dialog").innerHTML = this.dialogHtml();
    }

    /** What a board is told (README, "A game"). */
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
      };
    }

    listHtml() {
      const t = this.t;
      const table = this.table;
      const newLabel = escape(t("newMatch"));
      const disabled = table.live ? "" : "disabled";
      // The app's own bar already shows the game's name: here, the matches and a new one.
      let html = `<header class="ftg-bar"><h1 class="ftg-title">${escape(t("matches"))}</h1><button class="ftg-btn primary" data-kit="new" aria-label="${newLabel}" title="${newLabel}" ${disabled}>＋</button></header>`;
      html += this.bannerHtml(null);
      if (!table.live) html += `<p class="ftg-hint">💬 ${escape(t("needsChat", { game: t("name") }))}</p>`;
      if (!table.matches.length) {
        html += `<div class="ftg-empty"><div class="ftg-hero" aria-hidden="true">${game.icon}</div><p>${escape(t("noMatches"))}</p>${
          table.live ? `<button class="ftg-pill primary" data-kit="new">＋ ${newLabel}</button>` : ""
        }</div>`;
        return html;
      }
      const day = new Intl.DateTimeFormat(this.lang, { day: "numeric", month: "short" });
      html += `<ul class="ftg-list" aria-label="${escape(t("matches"))}">`;
      for (const { record, view: seen } of table.matches) {
        const [icon, label] = this.rowState(seen);
        const score = `${this.number(seen.score.me)}–${this.number(seen.score.them)}`;
        const meta = [label, t("started", { date: day.format(new Date(record.created)) })].filter(Boolean).join(" · ");
        html += `<li class="ftg-row${seen.myTurn ? " mine" : ""}"><button class="ftg-row-open" data-kit="enter" data-id="${escape(record.id)}" aria-label="${escape(`${meta} · ${t("score")} ${score}`)}"><span class="ftg-row-icon" aria-hidden="true">${icon}</span><span class="ftg-row-text"><span class="ftg-row-score">${escape(score)}</span><span class="ftg-row-meta">${escape(meta)}</span></span></button><button class="ftg-btn" data-kit="delete" data-id="${escape(record.id)}" aria-label="${escape(t("delete"))}" title="${escape(t("delete"))}">🗑️</button></li>`;
      }
      return `${html}</ul>`;
    }

    /** A row's icon and words for where its match stands. */
    rowState(seen) {
      const t = this.t;
      if (seen.phase === "play") return seen.myTurn ? ["▶️", t("yourTurn")] : [seen.pending ? "🕓" : "⏳", t("theirTurn")];
      if (seen.phase === "over") return ["🏁", t("over")];
      if (seen.phase === "ended" || seen.phase === "broken") return ["⛔", t("ended")];
      return ["⏳", ""];
    }

    barHtml(seen) {
      const t = this.t;
      const can = this.table.live && seen.phase === "play" && !seen.fork;
      const score = `<span class="me">${this.number(seen.score.me)}</span><span class="dash">–</span><span class="them">${this.number(seen.score.them)}</span>`;
      return `<button class="ftg-btn" data-kit="back" aria-label="${escape(t("back"))}" title="${escape(t("back"))}">${BACK}</button><div class="ftg-score" role="img" aria-label="${escape(`${t("score")} ${seen.score.me}–${seen.score.them}`)}">${score}</div><button class="ftg-btn" data-kit="resign" aria-label="${escape(t("resign"))}" title="${escape(t("resign"))}" ${can ? "" : "disabled"}>${FLAG}</button>`;
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

    /** Whether the other phone is missing and the user can do something about it (invite them). */
    waitingFor(seen) {
      const table = this.table;
      return table.live && !table.peerHere && (seen.phase === "invite" || table.notice?.key === "notOpen");
    }

    /** The line that always says where the match stands, and honestly. */
    status(seen) {
      const t = this.t;
      const game_ = t("name");
      const round = seen.index > 0 ? `${escape(t("round", { n: this.number(seen.index + 1) }))} · ` : "";
      const line = (icon, text, mine = false) => ({ html: `<span class="icon" aria-hidden="true">${icon}</span><span>${round}${escape(text)}</span>`, mine });
      const mark = (side) => (side === null ? "" : game.sides?.[side]) || "";
      if (seen.phase === "invite") return { html: `<span aria-hidden="true">⏳</span><span>${escape(t("waiting", { game: game_ }))}</span>`, mine: false };
      if (seen.phase === "toss") return { html: `<span aria-hidden="true">🪙</span><span>${escape(t("tossing"))}</span>`, mine: false };
      if (seen.phase === "ended" || seen.phase === "broken") return line("⛔", t("ended"));
      if (seen.phase === "over") {
        const { big, title } = this.outcome(seen);
        return { ...line(big, title, seen.result.winner === seen.me), over: true };
      }
      const fresh = seen.index === 0 && !seen.round.moves.length;
      const mine = mark(seen.mySide) || "▶️";
      const theirs = mark(1 - seen.mySide) || "⏳";
      if (seen.myTurn) return fresh ? line("🪙", t("youStart"), true) : line(mine, t("yourTurn"), true);
      return fresh ? line("🪙", t("theyStart")) : line(theirs, t("theirTurn"));
    }

    overlayHtml(seen) {
      const t = this.t;
      // Waiting for a person, not loading: nothing here moves.
      if (seen.phase === "invite") return '<div class="ftg-wait person" aria-hidden="true"><span>👤</span><span class="badge">⏳</span></div>';
      if (seen.phase === "toss") return '<div class="ftg-wait" aria-hidden="true"><span class="ftg-coin">🪙</span></div>';
      if (seen.phase === "ended" || seen.phase === "broken") {
        const why = seen.end?.k === "invalid" ? t("invalid") : seen.end?.k === "abandoned" ? t(abandonedBy(seen)) : t("ended");
        return `<div class="ftg-card"><div class="ftg-big" aria-hidden="true">⚠️</div><h2>${escape(t("ended"))}</h2><p>${escape(why)}</p></div>`;
      }
      return "";
    }

    /** How the round ended, for this phone. */
    outcome(seen) {
      const t = this.t;
      const result = seen.result;
      const won = result.winner === seen.me;
      return {
        big: result.winner === null ? "🤝" : won ? "🏆" : "😅",
        title: result.winner === null ? t("draw") : won ? t("youWon") : t("youLost"),
        how: result.k === "resign" ? (result.by === seen.me ? t("youResigned") : t("theyResigned")) : this.why(result),
      };
    }

    /** Why a round ended by the rules, in the game's own words (`game.how`, optional). */
    why(result) {
      if (result.k !== "rules" || typeof game.how !== "function") return "";
      try {
        return String(game.how(result.result, this.t) ?? "");
      } catch {
        return "";
      }
    }

    /** The end of a round: how it ended if it was a resignation, the way to the chat, another round. */
    resultHtml(seen) {
      const t = this.t;
      if (seen.phase !== "over") return "";
      const { title, how } = this.outcome(seen);
      const again = this.table.live
        ? `<button class="ftg-btn" data-kit="again" aria-label="${escape(t("again"))}" title="${escape(t("again"))}">🔁</button>`
        : "";
      return `<div class="ftg-result-card" role="group" aria-label="${escape(how ? `${title} · ${how}` : title)}"><div class="ftg-actions"><button class="ftg-pill primary" data-kit="send">📤 ${escape(t("sendResult"))}</button>${again}</div></div>`;
    }

    bannerHtml(seen) {
      const t = this.t;
      const table = this.table;
      let html = "";
      if (table.prompt) {
        const text = table.prompt.kind === "invited" ? t("invited") : t("elsewhere");
        const go = table.prompt.kind === "invited" ? t("join") : t("open");
        html += `<div class="ftg-banner prompt" role="alert"><span class="icon" aria-hidden="true">📥</span><span class="say">${escape(text)}</span><button class="ftg-pill small" data-kit="join">${escape(go)}</button><button class="ftg-pill small quiet" data-kit="dismiss">${escape(t("dismiss"))}</button></div>`;
      }
      // Two phones that parted ways cannot play on until the user picks: the choice is always there.
      if (seen?.fork) {
        html += `<div class="ftg-banner warn" role="alert"><span class="icon" aria-hidden="true">🔀</span><span class="say">${escape(t("fork"))}</span><button class="ftg-pill small" data-kit="fork-mine">${escape(t("forkMine"))}</button><button class="ftg-pill small" data-kit="fork-theirs">${escape(t("forkTheirs"))}</button></div>`;
      }
      const notice = table.notice?.key === "fork" ? null : table.notice;
      if (notice && (seen || !RETRY.includes(notice.key))) {
        const [icon, warn] = NOTICES[notice.key] ?? ["ℹ️", false];
        let actions = "";
        if (seen && RETRY.includes(notice.key) && table.live) actions = `<button class="ftg-pill small" data-kit="retry">🔄 ${escape(t("retry"))}</button>`;
        const key = notice.key === "abandoned" ? abandonedBy(seen) : notice.key;
        html += `<div class="ftg-banner${warn ? " warn" : ""}" role="status"><span class="icon" aria-hidden="true">${icon}</span><span class="say">${escape(t(key, { game: t("name"), ...notice.vars }))}</span>${actions}</div>`;
      } else if (seen && !table.live) {
        html += `<div class="ftg-banner" role="status"><span class="icon" aria-hidden="true">💬</span><span class="say">${escape(t("needsChat", { game: t("name") }))}</span></div>`;
      } else if (seen && table.connecting && seen.phase !== "invite") {
        html += `<div class="ftg-banner" role="status"><span class="icon" aria-hidden="true">📡</span><span class="say">${escape(t("connecting"))}</span></div>`;
      } else if (seen && seen.pending > 0 && seen.phase !== "ended") {
        html += `<div class="ftg-banner" role="status"><span class="icon" aria-hidden="true">🕓</span><span class="say">${escape(t("pending", { game: t("name") }))}</span></div>`;
      }
      return html;
    }

    dialogHtml() {
      const t = this.t;
      if (!this.asking) return "";
      const [question, yes] = this.asking.kind === "delete" ? [t("confirmDelete"), t("delete")] : [t("confirmResign"), t("resign")];
      const icon = this.asking.kind === "delete" ? "🗑️" : "🏳️";
      return `<div class="ftg-dialog"><div class="ftg-card" role="alertdialog" aria-modal="true" aria-label="${escape(question)}"><div class="ftg-big" aria-hidden="true">${icon}</div><p>${escape(question)}</p><div class="ftg-actions"><button class="ftg-pill" data-kit="no">${escape(t("cancel"))}</button><button class="ftg-pill danger" data-kit="yes">${escape(yes)}</button></div></div></div>`;
    }
  };
}
