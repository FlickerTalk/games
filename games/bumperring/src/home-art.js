import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawFriendLeft } from "../../../kit/src/duel/left.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { START } from "./arena.js";
import { VARIANTS } from "./game.js";
import { FIGURE, SQUASH } from "./layout.js";
import { LOOKS, PROGRESS, ringFor } from "./levels.js";
import { drawPlayer, drawRingIcon } from "./players.js";
import { drawPlace, drawPlatform } from "./scenery.js";

const FLICK = Object.freeze({ who: "flick" });
const TABS = Object.keys(LOOKS);
const SOUND = ["speaker", "music", "volume"];

function rowsOf(targets) {
  const rows = [];
  for (const { y, h } of [...targets].sort((one, two) => one.y - two.y)) {
    const last = rows.at(-1);
    if (last && y <= last.bottom) last.bottom = Math.max(last.bottom, y + h);
    else rows.push({ top: y, bottom: y + h });
  }
  return rows;
}

export function stageArea(state, targets) {
  const sound = targets.filter((one) => SOUND.includes(one.kind));
  const start = Math.max(8, ...sound.map((one) => one.y + one.h)) + 8;
  const rows = rowsOf(targets.filter((one) => !SOUND.includes(one.kind)));
  let best = { top: start, bottom: rows[0]?.top ?? state.height };
  rows.forEach((row, at) => {
    const bottom = rows[at + 1]?.top ?? row.bottom;
    if (bottom - row.bottom > best.bottom - best.top) best = { top: row.bottom, bottom };
  });
  return { x: 16, y: best.top + 8, w: state.width - 32, h: Math.max(0, best.bottom - best.top - 16) };
}

function scene(ctx, area, place, theme, time, actors) {
  const r = Math.min(area.w / 2.5, area.h / 2.15, 130);
  const [x, y] = [area.x + area.w / 2, area.y + area.h / 2 + r * 0.28];
  ctx.save();
  roundedRect(ctx, area.x, area.y, area.w, area.h, theme.ui.radius);
  ctx.clip();
  drawPlace(ctx, area, place, theme, time);
  drawPlatform(ctx, x, y, r, theme);
  actors.forEach(({ who, ring, pose }, seat) => {
    const [, far] = START[1 - seat];
    drawPlayer(ctx, x + (seat === 0 ? -0.4 : 0.4) * r, y + far * 0.4 * r * SQUASH, FIGURE * r, who, theme, { ring, pose, time: time + seat, flip: seat === 1 });
  });
  ctx.restore();
}

export function drawStage(ctx, state, band, theme, time) {
  if (band.h < 70 || band.w < 120) return;
  const mine = state.progress.chosen.ring;
  const rival = state.mode === "flick" ? FLICK : standIn(state.player);
  scene(ctx, band, state.progress.chosen.place, theme, time, [{ who: state.player, ring: mine, pose: "idle" }, { who: rival, ring: ringFor(mine), pose: "idle" }]);
}

function drawVariant(ctx, target, state, theme, time) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const mine = state.progress.chosen.ring;
  if (target.value === "flick") {
    drawAvatar(ctx, x, y - size * 0.1, size * 0.42, { who: "flick", face: "happy", time });
    drawRingIcon(ctx, { x: x - size * 0.3, y: y + size * 0.12, w: size * 0.6, h: size * 0.3 }, ringFor(mine), theme);
    return;
  }
  drawRingIcon(ctx, { x: x - size * 0.42, y: y - size * 0.24, w: size * 0.52, h: size * 0.4 }, mine, theme);
  drawRingIcon(ctx, { x: x - size * 0.1, y: y - size * 0.02, w: size * 0.52, h: size * 0.4 }, ringFor(mine), theme);
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !duel) return null;
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state } = game;
  const seat = seatOf(game);
  const layout = homeLayout(state.width, state.height, { variants: state.mode === "alone" ? VARIANTS : [], rival: Boolean(seat), fill: state.fill });
  const shown = { ...state, variant: state.mode === "alone" ? state.variant : null };
  drawHomeScreen(ctx, shown, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen) => drawStage(pen, state, stageArea(state, layout.targets), theme, time),
    drawVariant: (pen, target) => drawVariant(pen, target, state, theme, time),
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
  drawFriendLeft(ctx, at("rival"), game.duel?.status, theme.ui);
}

export function drawLookArt(ctx, area, kind, look, theme, time) {
  const inner = { x: area.x + 10, y: area.y + 10, w: area.w - 20, h: area.h - 20 };
  if (kind !== "place") {
    drawRingIcon(ctx, inner, look, theme);
    return;
  }
  ctx.save();
  roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, theme.ui.radius * 0.7);
  ctx.clip();
  drawPlace(ctx, inner, look, theme, time);
  drawPlatform(ctx, inner.x + inner.w / 2, inner.y + inner.h * 0.56, inner.w * 0.3, theme);
  ctx.restore();
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

export function drawLooks(ctx, state, theme, time) {
  const kind = state.looks;
  const looks = LOOKS[kind];
  drawLooksScreen(ctx, state, theme.ui, time, {
    layout: looksLayout(state.width, state.height, { kind, count: looks.length, fill: state.fill, tabs: TABS }),
    kind,
    looks,
    owned: PROGRESS.owned(state.progress),
    chosen: state.progress.chosen[kind],
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, area, value, LOOKS[value][0], theme, time),
    drawWrapped: (pen, area, shake) => drawPresent(pen, area, shake, theme.art.gift),
  });
}
