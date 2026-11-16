import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { drawHome as drawHomeScreen, drawLooks as drawLooksScreen, drawPresent, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { clamp } from "../../../kit/src/canvas/pen.js";
import { drawLobby, lobbyOf } from "../../../kit/src/duel/lobby.js";
import { drawAircraft } from "./aircraft.js";
import { LOOKS, PROGRESS, settingsFor } from "./levels.js";
import { lookOf, rivalLook } from "./rounds.js";
import { drawSky } from "./sky.js";
import { drawCloud } from "./weather.js";

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

const pilotOf = (who, time) => (ctx, x, y, size) => drawAvatar(ctx, x, y, size, { ...who, face: "happy", time });

export function drawStage(ctx, state, band, theme, time) {
  if (band.h < 70 || band.w < 120) return;
  const mine = lookOf(state);
  const rival = rivalLook(mine);
  const size = Math.min(band.w * 0.3, band.h * 0.5, 120);
  const bob = Math.sin(time * 1.6) * size * 0.04;
  drawSky(ctx, band, settingsFor(state.progress, "flick", "").place, theme, { side: band.w > band.h * 1.2 });
  drawCloud(ctx, band.x + band.w * 0.5, band.y + band.h * 0.2, Math.min(band.w * 0.3, band.h * 0.5), theme, { time });
  drawAircraft(ctx, rival.craft, band.x + band.w * 0.72, band.y + band.h * 0.42 - bob, size * 0.86, theme, { heading: [-0.5, 0.866], colour: rival.colour, squared: true, time: time + 1, pilot: pilotOf(state.mode === "friend" ? standIn(state.player) : FLICK, time) });
  drawAircraft(ctx, mine.craft, band.x + band.w * 0.3, band.y + band.h * 0.6 + bob, size, theme, { heading: [0.5, -0.866], colour: mine.colour, time, pilot: pilotOf(state.player, time) });
}

function seatOf(game) {
  const { state, duel } = game;
  if (state.mode !== "friend" || !duel) return { player: FLICK, here: true, calling: false, away: false };
  const { here, calling, away } = duel.status;
  return { player: standIn(state.player), here, calling, away };
}

export function drawHome(ctx, game, theme, time) {
  const { state } = game;
  const layout = homeLayout(state.width, state.height, { variants: [], rival: true, fill: state.fill });
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat: seatOf(game),
    volume: state.layout?.volume,
    drawStage: (pen) => {
      const area = stageArea(state, layout.targets);
      pen.save();
      drawStage(pen, state, area, theme, time);
      pen.restore();
    },
  });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  drawLobby(ctx, { play: at("play"), rival: at("rival") }, lobbyOf(game.duel?.status), theme.ui, time);
}

export function drawLookArt(ctx, area, look, theme, time, colour) {
  const size = Math.min(area.w, area.h) * 0.74;
  drawAircraft(ctx, look, area.x + area.w / 2, area.y + area.h / 2, size, theme, { colour, time, balloons: 0 });
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
    chosen: state.flying === kind ? state.progress.chosen[kind] : null,
    shake: (index) => shakeOf(state, index, time),
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, look, theme, now, state.colour),
    drawTab: (pen, area, value) => drawLookArt(pen, area, LOOKS[value][0], theme, 0, state.colour),
    drawWrapped: (pen, area, shake) => drawPresent(pen, area, shake, theme.art.gift),
  });
}
