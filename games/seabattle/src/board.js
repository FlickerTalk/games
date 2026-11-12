// the fleet and its salt stay in the plugin's store until the reveal

import STYLE from "./board.css";
import { icon } from "../../../kit/src/icons.js";
import { fromBase64url, toBase64url } from "./sha256.js";
import {
  CELLS,
  DEFAULT_FLEET,
  SALT_BYTES,
  SHIPS,
  SIZE,
  commitText,
  fleetText,
  honestAnswer,
  parseFleet,
  randomFleet,
  revealText,
  shipCells,
  sortShips,
} from "./rules.js";

export { STYLE };

export const MARKS = [
  '<svg class="fsb-side s0" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 55h80l-14 25H24z M45 20h10v35H45z M30 40h40v15H30z"/></svg>',
  '<svg class="fsb-side s1" viewBox="0 0 100 100" aria-hidden="true"><path d="M10 55h80l-14 25H24z M45 20h10v35H45z M30 40h40v15H30z"/></svg>',
];

export const storeKey = (me) => `seabattle/${me}`;

function seaHtml({ cells, big, label, open, ghost, last, pending }) {
  let html = `<div class="fsb-sea${big ? " big" : ""}" role="group" aria-label="${label}">`;
  for (let index = 0; index < CELLS; index += 1) {
    const one = cells[index];
    const classes = ["fsb-cell", ...one.classes];
    if (index === last) classes.push("last");
    if (index === last && pending) classes.push("pending");
    html += `<button class="${classes.join(" ")}" ${big ? `data-cell="${index}"` : 'tabindex="-1"'} aria-label="${one.name}" ${open && one.open ? "" : "disabled"}>${
      index === last && pending ? `<span class="fsb-clock" aria-hidden="true">${icon("time-outline")}</span>` : ""
    }</button>`;
  }
  if (ghost !== null && ghost !== undefined) {
    const row = Math.floor(ghost / SIZE);
    const col = ghost % SIZE;
    const at = (n) => `${((n + 0.5) / SIZE) * 100}%`;
    html += `<button class="fsb-ghost" data-ghost="${ghost}" style="left:${at(col)};top:${at(row)}" aria-label="${ghostLabel(row, col)}"></button>`;
  }
  return `${html}</div>`;
}
let ghostLabel = () => "";

function outcomes(state, side) {
  const map = new Map();
  state.shots[side].forEach((cell, at) => {
    const answer = state.answers[1 - side][at];
    if (answer) map.set(cell, answer[0]);
  });
  for (const ship of state.sunk[1 - side]) for (const cell of shipCells(ship)) map.set(cell, "s");
  return map;
}

function tell(ctx, local, text) {
  if (text && text !== local.told) ctx.notify?.(text);
  local.told = text;
}

function draw(host, ctx, local) {
  const { state } = ctx;
  const t = ctx.t;
  ghostLabel = (row, col) => t("fireAt", { row: row + 1, col: col + 1 });
  const me = ctx.mySide;
  const they = me === null ? 1 : 1 - me;
  const cellName = (index) => t("cell", { row: Math.floor(index / SIZE) + 1, col: (index % SIZE) + 1 });
  const fleetCells = new Map();
  for (const ship of local.fleet) for (const cell of shipCells(ship)) fleetCells.set(cell, ship);

  const theirShots = me === null ? new Map() : outcomes(state, they);
  const mine = Array.from({ length: CELLS }, (_, index) => {
    const classes = [];
    const ship = fleetCells.has(index);
    const shot = theirShots.get(index);
    if (ship) classes.push("ship");
    if (shot === "m") classes.push("miss");
    else if (shot === "h") classes.push("hit");
    else if (shot === "s") classes.push("sunk");
    const what = shot === "m" ? t("miss") : shot === "h" ? t("hit") : shot === "s" ? t("sunk") : ship ? t("ship") : t("water");
    return { classes, name: `${cellName(index)}: ${what}`, open: false };
  });

  const placing = state.phase === "place";
  tell(ctx, local, local.lost && !placing ? t("fleetLost") : "");
  if (placing) {
    const committed = me !== null && state.commits[me] !== null;
    const lost = committed && local.lost;
    const note = lost ? t("fleetLost") : committed ? t("fleetWait") : t("placeFleet");
    host.innerHTML = `<div class="fsb">
      <div class="fsb-top">${seaHtml({ cells: mine, big: true, label: t("yourSea"), open: false, ghost: null, last: null, pending: false })}</div>
      <div class="fsb-place">
        <p class="fsb-info">${escape(note)}</p>
        ${
          committed
            ? ""
            : `<div class="fsb-actions"><button data-act="shuffle" ${ctx.canPlay ? "" : "disabled"}>${icon("refresh-outline")}<span>${escape(t("shuffle"))}</span></button>
               <button data-act="ready" ${ctx.canPlay ? "" : "disabled"}>${icon("checkmark-circle-outline")}<span>${escape(t("ready"))}</span></button></div>`
        }
      </div>
    </div>`;
    return;
  }

  const myShots = me === null ? new Map() : outcomes(state, me);
  const revealed = state.phase === "done" && state.reveals[they] ? new Set(state.reveals[they].ships.flatMap(shipCells)) : new Set();
  const open = ctx.canPlay && state.phase === "fire" && me !== null;
  const theirs = Array.from({ length: CELLS }, (_, index) => {
    const classes = [];
    const shot = myShots.get(index);
    if (shot === "m") classes.push("miss");
    else if (shot === "h") classes.push("hit");
    else if (shot === "s") classes.push("sunk");
    else if (revealed.has(index)) classes.push("ship");
    const what = shot === "m" ? t("miss") : shot === "h" ? t("hit") : shot === "s" ? t("sunk") : revealed.has(index) ? t("ship") : t("unknown");
    return { classes, name: `${cellName(index)}: ${what}`, open: shot === undefined };
  });
  const lastShot = me !== null && state.shots[me].length && (ctx.last ?? "").toString().includes(">") ? state.shots[me].at(-1) : null;
  const theirLast = me !== null && state.shots[they].length ? state.shots[they].at(-1) : null;
  const ships = (side) =>
    `<span class="fsb-ships" aria-hidden="true">${SHIPS.map((len, at) => `<i class="${at < state.sunk[side].length ? "down" : ""}"></i>`).join("")}</span>`;
  host.innerHTML = `<div class="fsb">
    <div class="fsb-top">${seaHtml({ cells: theirs, big: true, label: t("theirSea"), open, ghost: open ? local.ghost : null, last: lastShot, pending: ctx.pending })}</div>
    <div class="fsb-bottom">
      ${seaHtml({ cells: mine, big: false, label: t("yourSea"), open: false, ghost: null, last: theirLast, pending: false })}
      <div class="fsb-info">
        <span class="fsb-row">${MARKS[they]} <b>${escape(t("shipsLeft", { n: SHIPS.length - state.sunk[they].length }))}</b> ${ships(they)}</span>
        <span class="fsb-row">${MARKS[me ?? 0]} ${escape(t("shipsLeft", { n: SHIPS.length - state.sunk[me ?? 0].length }))} ${ships(me ?? 0)}</span>
      </div>
    </div>
  </div>`;
}

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function coreOf(host) {
  let node = host;
  while (node && !(node.tagName && node.tagName.includes("-"))) node = node.parentNode;
  return node?.ft ?? globalThis.ft;
}

export const board = {
  mount(host, first) {
    let ctx = first;
    const local = { fleet: DEFAULT_FLEET.map((ship) => ({ ...ship })), salt: null, ghost: null, lost: false, loaded: false, auto: null };
    const ft = coreOf(host);
    const key = () => storeKey(ctx.view?.me ?? "");

    const remember = async () => {
      if (!ft?.store) return true;
      try {
        return (await ft.store.set(key(), JSON.stringify({ salt: toBase64url(local.salt), fleet: fleetText(local.fleet) }))) !== false;
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
          const fleet = parseFleet(read.fleet);
          if (salt && salt.length === SALT_BYTES && fleet) {
            local.salt = salt;
            local.fleet = fleet;
          }
        }
      } catch {
        // nothing kept, or not ours, so the fleet starts where it always does
      }
      local.loaded = true;
      settle();
    };

    const settle = () => {
      if (!local.loaded || !ctx.canPlay || ctx.mySide === null) return;
      const { state } = ctx;
      const me = ctx.mySide;
      const stamp = `${state.phase}:${state.shots[0].length}:${state.shots[1].length}:${state.answers[me].length}:${state.reveals.filter(Boolean).length}`;
      if (local.auto === stamp) return;
      const committed = state.commits[me] !== null;
      if (committed && !local.salt) {
        local.lost = true;
        draw(host, ctx, local);
        return;
      }
      if (state.phase === "fire") {
        const answer = honestAnswer(state, me, local.fleet);
        if (answer.startsWith("s") && state.sunk[me].length + 1 === SHIPS.length) {
          local.auto = stamp;
          ctx.play(answer);
        }
      } else if (state.phase === "reveal") {
        local.auto = stamp;
        ctx.play(revealText(local.salt, local.fleet));
      }
    };

    host.addEventListener("click", async (event) => {
      if (!ctx.canPlay || ctx.mySide === null) return;
      const button = event.target.closest?.("button");
      if (!button || button.disabled) return;
      const { act, cell, ghost } = button.dataset;
      if (act === "shuffle") {
        local.fleet = randomFleet();
        draw(host, ctx, local);
      } else if (act === "ready") {
        local.salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        local.fleet = sortShips(local.fleet);
        if (!(await remember())) return;
        ctx.play(commitText(local.salt, local.fleet));
      } else if (ghost !== undefined) {
        const index = Number(ghost);
        local.ghost = null;
        if (ctx.state.phase === "fire" && !ctx.state.shots[ctx.mySide].includes(index)) ctx.play(`${honestAnswer(ctx.state, ctx.mySide, local.fleet)}>${index}`);
      } else if (cell !== undefined) {
        const index = Number(cell);
        if (local.ghost === index) {
          local.ghost = null;
          ctx.play(`${honestAnswer(ctx.state, ctx.mySide, local.fleet)}>${index}`);
          return;
        }
        local.ghost = index;
        draw(host, ctx, local);
      }
    });

    draw(host, ctx, local);
    recall();
    return {
      update(next) {
        if (next.view?.round?.moves?.length !== ctx.view?.round?.moves?.length || !next.canPlay) local.ghost = null;
        ctx = next;
        draw(host, ctx, local);
        settle();
      },
    };
  },
};
