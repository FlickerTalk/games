import STYLE from "../style.css";
import ARENA from "./arena.css";
import { mediumReads } from "../colour.js";
import { randomBytes } from "../commit.js";
import { icon } from "../icons.js";
import { isChat } from "../store.js";
import { Toast } from "../toast.js";
import { FRAME_START, direction, escape, fitView, formatTime, translator, whenDrawn } from "./page.js";
import { Session } from "./session.js";
import { LIVE_TEXTS } from "./texts.js";

const RECORD = 1;
const PAD = 68;
const SIDE = 128;
const GAP = 10;
const STATUS_EVERY = 100;
const SETTLE_MS = 2000;

const keyOf = (chat) => `best/${chat}`;

const NOTICES = { left: ["exit-outline"], unreachable: ["cloud-offline-outline"], silent: ["cloud-offline-outline"] };

const note = (drawn, text, warn = false) => ({ text, html: escape(text), icon: drawn, warn });

function join(live, game) {
  const joined = {};
  for (const lang of new Set([...Object.keys(live), ...Object.keys(game)])) {
    for (const key of Object.keys(game[lang] ?? {})) {
      if (key in live.en) throw new Error(`the game text "${key}" is a key of the kit`);
    }
    joined[lang] = { ...live[lang], ...game[lang] };
  }
  return joined;
}

function chance(bytes = randomBytes) {
  return () => {
    const [one, two, three] = bytes(3);
    return ((one << 16) | (two << 8) | three) / 2 ** 24;
  };
}

const count = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);

function parse(json) {
  try {
    const kept = JSON.parse(json);
    if (!kept || kept.v !== RECORD) return null;
    const best = typeof kept.best === "number" && Number.isFinite(kept.best) && kept.best > 0 ? kept.best : null;
    return { v: RECORD, best, won: count(kept.won), lost: count(kept.lost) };
  } catch {
    return null;
  }
}

function appColour(name) {
  const page = document.documentElement;
  return (getComputedStyle(page).getPropertyValue(name) || page.style.getPropertyValue(name) || "").trim();
}

function addStyle(extra = "") {
  if (document.head.querySelector("style[data-ftl]")) return;
  const style = document.createElement("style");
  style.dataset.ftl = "";
  style.textContent = `${STYLE}\n${ARENA}\n${extra}`;
  document.head.append(style);
}

class LiveGameElement extends HTMLElement {
  connectedCallback() {
    if (this.root) return;
    addStyle(this.game.style);
    this.ft ??= globalThis.ft;
    this.clock ??= () => performance.now();
    this.lang = "en";
    this.dark = false;
    this.t = (key, vars) => this.translate(this.lang, key, vars);
    this.drawn = new WeakMap();
    this.setAttribute("data-ftl", "");
    this.style.display = "block";
    this.root = document.createElement("div");
    this.root.className = "ftg ftl";
    this.root.style.minHeight = `${FRAME_START}px`;
    this.append(this.root);
    this.toast = new Toast();
    this.addEventListener("click", (event) => this.onClick(event));
    this.watch = new MutationObserver(() => this.retheme());
    this.watch.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-dark", "data-fill"] });
    this.sizes = globalThis.ResizeObserver ? new ResizeObserver(() => this.fit()) : null;
    this.sizes?.observe(this);
    this.onResize = () => this.fit();
    addEventListener("resize", this.onResize);
    const ft = this.ft;
    ft.onOpen((opening) => this.opened(opening));
    ft.live?.onMessage?.((data) => this.session?.heard(data));
    ft.onClose?.(() => this.session?.stop());
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.pending);
    this.pending = 0;
    this.sizes?.disconnect();
    this.watch?.disconnect();
    removeEventListener("resize", this.onResize);
    this.toast?.clear();
    this.session?.stop();
    try {
      this.board?.destroy?.();
    } finally {
      this.board = null;
    }
  }

  async opened(opening) {
    this.lang = opening.lang || "en";
    this.dark = Boolean(opening.dark);
    if (!this.session) {
      this.chat = isChat(opening.chat) ? opening.chat : null;
      this.solo = opening.solo === true && this.chat !== null;
      this.live = !this.solo && this.chat !== null && Boolean(opening.live);
      const options = { ft: this.ft, g: this.game.id, gv: this.game.gv, app: this.game.app, solo: this.solo, check: this.game.check, clock: () => this.clock() };
      this.session = new Session({ ...options, onChange: () => this.changed(), onState: (state, t, at) => this.board?.heard?.(state, t, at) });
      this.record = await this.load();
    }
    this.ready = true;
    this.paint();
  }

  async load() {
    if (!this.chat) return null;
    try {
      return parse(await this.ft.records.get(keyOf(this.chat)));
    } catch {
      return null;
    }
  }

  keep(result) {
    const kept = this.record ?? { v: RECORD, best: null, won: 0, lost: 0 };
    const best = typeof result.mine === "number" && (kept.best === null || result.mine < kept.best) ? result.mine : kept.best;
    this.record = { v: RECORD, best, won: kept.won + (result.won ? 1 : 0), lost: kept.lost + (result.won ? 0 : 1) };
    Promise.resolve(this.ft.records.set(keyOf(this.chat), JSON.stringify(this.record))).catch(() => {});
  }

  part(name) {
    return this.root.querySelector(`[data-part="${name}"]`);
  }

  set(node, html) {
    if (!node || this.drawn.get(node) === html) return;
    this.drawn.set(node, html);
    node.innerHTML = html;
  }

  paint() {
    const root = this.root;
    if (!this.ready) return;
    root.setAttribute("dir", direction(this.lang));
    root.setAttribute("lang", this.lang);
    root.toggleAttribute("data-dark", this.dark);
    this.retheme();
    if (!this.page) this.build();
    if (!this.pageDrawn) {
      this.drawing ??= whenDrawn([...root.querySelectorAll(":scope > ion-header, :scope > ion-header > ion-toolbar, :scope > ion-content")]).then(() => {
        this.drawing = null;
        this.pageDrawn = true;
        if (this.isConnected) this.paint();
      });
      return;
    }
    root.style.removeProperty("min-height");
    if (!this.board) this.mount();
    this.chrome();
    this.fit();
    this.schedule();
  }

  build() {
    this.root.innerHTML =
      '<ion-header><ion-toolbar class="ftg-bar"><ion-title class="ftg-title" data-part="title"></ion-title></ion-toolbar><ion-toolbar class="ftg-notice" data-part="notice"></ion-toolbar></ion-header>' +
      '<ion-content scroll-y="false" data-part="content"><div class="ftl-main" dir="ltr" data-part="main"><div class="ftl-stage" data-part="stage"><div class="ftl-view" data-part="view"></div><div class="ftg-overlay" data-part="overlay"></div></div><div class="ftl-left" data-part="left"></div><div class="ftl-right" data-part="right"></div></div></ion-content>';
    this.page = true;
    this.root.setAttribute("data-layout", "column");
    this.toast.attach(this.part("notice"));
  }

  mount() {
    const element = this;
    const context = {
      get session() {
        return element.session;
      },
      get lang() {
        return element.lang;
      },
      solo: this.solo,
      t: this.t,
      random: chance(),
      dark: () => this.isDark(),
    };
    this.board = this.game.stage.mount({ view: this.part("view"), left: this.part("left"), right: this.part("right") }, context);
  }

  measure() {
    const root = this.root;
    const width = root?.clientWidth || this.clientWidth || 0;
    if (!document.documentElement.hasAttribute("data-fill")) return { width, height: Infinity };
    const header = root?.querySelector(":scope > ion-header")?.getBoundingClientRect().height ?? 0;
    const style = getComputedStyle(root);
    const around = (parseFloat(style.rowGap) || 0) + (parseFloat(style.paddingBottom) || 0);
    return { width, height: (root?.clientHeight ?? 0) - header - around };
  }

  fit() {
    if (!this.board || !this.pageDrawn) return;
    const { width, height } = this.measure();
    if (!(width > 0)) return;
    const most = Number.isFinite(height) ? Infinity : undefined;
    const view = fitView({ width, height, aspect: this.game.aspect, pad: PAD, side: SIDE, gap: GAP, most });
    const root = this.root;
    root.setAttribute("data-layout", view.mode);
    const shown = `${view.width}x${view.height}`;
    if (shown !== this.shownSize) {
      this.shownSize = shown;
      root.style.setProperty("--ftl-w", `${view.width}px`);
      root.style.setProperty("--ftl-h", `${view.height}px`);
      this.board.resize?.(view.width, view.height);
      this.schedule();
    }
    this.sizeContent(Number.isFinite(height));
  }

  // in the room the frame follows its content, and ion-content has no height of its own
  sizeContent(filling) {
    const content = this.part("content");
    if (filling) {
      content.style.removeProperty("height");
      return;
    }
    const height = `${Math.ceil(this.part("main").getBoundingClientRect().height)}px`;
    if (content.style.height !== height) content.style.height = height;
  }

  isDark() {
    if (document.documentElement.hasAttribute("data-dark") || this.dark) return true;
    return !appColour("--ion-background-color") && Boolean(globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches);
  }

  retheme() {
    const root = this.root;
    root.toggleAttribute("data-themed", Boolean(appColour("--ion-background-color")));
    root.toggleAttribute("data-medium", mediumReads({ background: appColour("--ion-background-color"), ink: appColour("--ion-text-color"), medium: appColour("--ion-color-medium") }));
    const dark = this.isDark();
    if (dark !== this.wasDark) {
      this.wasDark = dark;
      this.board?.retheme?.();
      this.schedule();
    }
    this.fit();
  }

  onClick(event) {
    const target = event.target.closest?.("[data-live]");
    if (!target || !this.root.contains(target) || target.disabled) return;
    if (["start", "again", "retry"].includes(target.dataset.live)) this.session?.start();
  }

  changed() {
    const session = this.session;
    if (session.phase === "countdown" && session.id !== this.raceId) {
      this.raceId = session.id;
      this.board?.reset(session.seat);
    }
    if (session.phase === "over" && this.keptId !== session.id) {
      this.keptId = session.id;
      this.overAt = this.clock();
      this.keep(session.result);
    }
    if (this.pageDrawn) this.chrome();
    this.schedule();
  }

  schedule() {
    if (this.pending || !this.isConnected || !this.board) return;
    this.pending = requestAnimationFrame(() => this.frame(this.clock()));
  }

  frame(now) {
    this.pending = 0;
    const session = this.session;
    if (!session || !this.board) return;
    session.tick(now);
    this.board.frame(now);
    if (!(now - this.toldAt < STATUS_EVERY)) {
      this.toldAt = now;
      this.tell();
    }
    const settling = session.phase === "over" && now - this.overAt < SETTLE_MS;
    if (session.running || settling) this.schedule();
  }

  chrome() {
    const session = this.session;
    this.set(this.part("title"), escape(this.t("name")));
    this.root.toggleAttribute("data-off", !(session.phase === "running" && session.mine === null));
    this.set(this.part("overlay"), this.card());
    this.toldAt = -Infinity;
    this.tell();
  }

  tell() {
    const t = this.t;
    const session = this.session;
    const hold = (name, key, warn = false) => this.toast.hold(note(icon(name), t(key, { game: t("name"), version: session.newer }), warn));
    if (!this.chat) return hold("chatbubble-outline", "needsChat");
    const notice = session.notice;
    if (session.phase === "left") return hold(NOTICES[notice]?.[0] ?? "exit-outline", NOTICES[notice] ? notice : "left", true);
    if (notice === "update" && !session.running) return hold("arrow-up-circle-outline", "update", true);
    if (session.phase === "waiting") return notice === "notOpen" ? hold("person-outline", "notOpen", true) : hold("radio-outline", "calling");
    if (session.phase === "lobby") return session.ready.me ? hold("hourglass-outline", "waiting") : hold("person-outline", "theyAreReady");
    if (session.phase === "countdown") return hold("time-outline", "getReady");
    if (session.phase === "finished") return hold("hourglass-outline", "finished");
    if (session.phase === "running") return this.toast.hold(note(icon("flag-outline"), String(this.board?.status?.() ?? "")));
    if (session.phase === "over") {
      const { won, mine } = session.result;
      const title = t(won ? "youWon" : "youLost");
      return this.toast.hold(note(icon(won ? "trophy-outline" : "sad-outline"), mine === null ? title : `${title} · ${formatTime(mine, this.lang)}`));
    }
    return this.toast.hold(null);
  }

  card() {
    const t = this.t;
    const session = this.session;
    const say = (key) => escape(t(key, { game: t("name"), version: session.newer }));
    const wrap = (inner) => `<div class="ftg-card ftl-card" dir="${direction(this.lang)}" lang="${escape(this.lang)}">${inner}</div>`;
    const big = (drawn) => `<div class="ftg-big" aria-hidden="true">${drawn}</div>`;
    const best = this.record?.best ? `<p class="ftl-best">${escape(t("best", { time: formatTime(this.record.best, this.lang) }))}</p>` : "";
    const button = (act, key, name) => `<div class="ftg-actions"><ion-button data-live="${act}" shape="round">${icon(name).replace("<svg ", '<svg slot="start" ')}${say(key)}</ion-button></div>`;
    const start = button("start", "start", "play-outline");
    if (!this.chat) return wrap(`${big(icon("chatbubble-outline"))}<p>${say("needsChat")}</p>`);
    const intro = `${big(this.game.hero ?? icon("flag-outline"))}<h2>${say("name")}</h2><p>${say(this.solo ? "soloIntro" : "liveIntro")}</p>${best}`;
    switch (session.phase) {
      case "idle":
        return wrap(intro + start);
      case "waiting":
        return session.notice === "notOpen" ? wrap(`${big(icon("person-outline"))}<p>${say("notOpen")}</p>${button("retry", "retry", "refresh-outline")}`) : wrap(`${big(icon("radio-outline"))}<p>${say("calling")}</p>`);
      case "lobby":
        if (session.ready.me) return wrap(`${big(icon("hourglass-outline"))}<p>${say("waiting")}</p>`);
        return session.ready.them ? wrap(`${big(icon("person-outline"))}<p>${say("theyAreReady")}</p>${start}`) : wrap(intro + start);
      case "left":
        return wrap(`${big(icon(NOTICES[session.notice]?.[0] ?? "exit-outline"))}<p>${say(NOTICES[session.notice] ? session.notice : "left")}</p>${button("retry", "retry", "refresh-outline")}`);
      case "over":
        return wrap(this.resultHtml(best) + button("again", "again", "repeat-outline"));
      default:
        return "";
    }
  }

  resultHtml(best) {
    const t = this.t;
    const { won, mine, theirs } = this.session.result;
    const row = (label, time) => `<div><dt>${escape(label)}</dt><dd>${escape(formatTime(time, this.lang))}</dd></div>`;
    const rows = (typeof mine === "number" ? row(t("you"), mine) : "") + (typeof theirs === "number" ? row(t(this.solo ? "phone" : "them"), theirs) : "");
    return `<div class="ftg-big" aria-hidden="true">${icon(won ? "trophy-outline" : "sad-outline")}</div><h2>${escape(t(won ? "youWon" : "youLost"))}</h2>${rows ? `<dl class="ftl-times">${rows}</dl>` : ""}${best}`;
  }
}

export function liveElementFor(game) {
  const translate = translator(join(LIVE_TEXTS, game.texts));
  return class extends LiveGameElement {
    get game() {
      return game;
    }

    get translate() {
      return translate;
    }
  };
}
