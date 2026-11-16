import { drawBar } from "./bar.js";
import { drawBounce, drawDust, drawEmptyBonus, drawHand, drawScoreBurst } from "./bursts.js";
import { drawButton } from "./buttons.js";
import { drawCourt, drawGlow, drawOutline } from "./court-art.js";
import { thresholdsFor, trackOf } from "./levels.js";
import { pauseLayout } from "./menu-layout.js";
import { cellsOf } from "./court.js";
import { drawLayeredClear } from "./line-effects.js";
import { clamp, ease, mix } from "../../../kit/src/canvas/pen.js";
import { pieceOf } from "./pieces.js";
import { drawScenery } from "./scenery.js";
import { drawLifted } from "./tiles.js";
import { drawTray, slotCell } from "./tray-art.js";
import { variantOf } from "./variants.js";

const HINT_LOOP = 2.6;

const progressOf = (moment, time) => clamp((time * 1000 - moment.start) / moment.duration);
const centreOf = (area) => [area.x + area.w / 2, area.y + area.h / 2];

export function rivalOf(state) {
  if (state.flick) return { player: { who: "flick" }, score: state.flick.round.score, thinking: false, face: state.flick.round.score > state.round.score ? "confident" : "focused" };
  return state.friend ?? null;
}

function bestOf(state) {
  const track = trackOf(state.round.variant);
  return track ? (state.progress.bests?.[track] ?? null) : state.progress.best;
}

function field(ctx, state, theme, time) {
  const { layout, round, drag } = state;
  const where = layout.court;
  const band = { x: 0, y: layout.bar.y + layout.bar.h, w: state.width, h: where.y - 5 - (layout.bar.y + layout.bar.h) };
  drawScenery(ctx, state.progress.chosen.court, { w: state.width, h: state.height }, band, theme, time);
  drawCourt(ctx, where, round.court.cells, theme, { beds: variantOf(round.variant).beds });
  if (drag.phase === "lifted" && drag.target) {
    drawGlow(ctx, where, drag.target.lines, theme, time);
    drawOutline(ctx, where, drag.target.cells, true, theme, time);
  }
  for (const moment of state.moments) {
    if (moment.kind === "clear") drawLayeredClear(ctx, where, moment.lines, moment.effect, progressOf(moment, time), theme);
    if (moment.kind === "empty") drawEmptyBonus(ctx, where.x + (where.cell * where.size) / 2, where.y + (where.cell * where.size) / 2, where.cell * 4, progressOf(moment, time), theme);
  }
}

function tray(ctx, state, theme, time) {
  const { layout, round, drag, returning } = state;
  const lifted = drag.phase === "lifted" ? drag.slot : (returning?.slot ?? -1);
  drawTray(ctx, layout.slots, round.slots, layout.court.cell, theme, { time, lifted, stuck: round.over === "full" });
}

function bar(ctx, state, theme, time) {
  const rival = rivalOf(state);
  drawBar(ctx, state.layout, { score: state.round.score, best: bestOf(state), thresholds: thresholdsFor(state.round.variant), sound: state.sound, rival, lang: state.lang }, theme, time);
}

function hint(ctx, state, theme, time) {
  const { hint: aim, layout, round, drag } = state;
  if (!aim || drag.phase === "lifted" || !round.slots[aim.slot]) return;
  const piece = pieceOf(round.slots[aim.slot]);
  const { court } = layout;
  const cells = cellsOf(round.court, piece, aim.at);
  if (!cells) return;
  const loop = (time % HINT_LOOP) / HINT_LOOP;
  const travel = ease(clamp(loop / 0.75));
  const [fromX, fromY] = centreOf(layout.slots[aim.slot]);
  const toX = court.x + ((aim.at % court.size) + piece.width / 2) * court.cell;
  const toY = court.y + (Math.floor(aim.at / court.size) + piece.height / 2) * court.cell;
  const x = mix(fromX, toX, travel);
  const y = mix(fromY, toY, travel);
  if (loop > 0.75) drawOutline(ctx, court, cells, true, theme, time);
  drawLifted(ctx, piece, x, y, mix(slotCell(piece, layout.slots[aim.slot], court.cell), court.cell, travel), theme, time);
  drawHand(ctx, x + court.cell * 0.2, y + layout.lift, 64, loop, theme);
}

function moments(ctx, state, theme, time) {
  const { layout } = state;
  for (const moment of state.moments) {
    const t = progressOf(moment, time);
    if (moment.kind === "dust") drawDust(ctx, moment.x, moment.y, moment.size, t, theme);
    if (moment.kind === "burst") drawScoreBurst(ctx, moment.x, moment.y - layout.court.cell * 0.4, moment.points, t, theme, state.lang);
    if (moment.kind === "bounce") {
      const piece = pieceOf(moment.piece);
      const slot = layout.slots[moment.slot];
      drawBounce(ctx, piece, moment.from, centreOf(slot), layout.court.cell, slotCell(piece, slot, layout.court.cell), t, theme);
    }
  }
}

function pause(ctx, state, theme) {
  ctx.save();
  ctx.fillStyle = theme.ui.shade;
  ctx.fillRect(0, 0, state.width, state.height);
  for (const target of pauseLayout(state.width, state.height, { fill: state.fill }).targets) {
    drawButton(ctx, target.kind === "resume" ? "play" : "home", ...centreOf(target), Math.min(target.w, target.h), theme);
  }
  ctx.restore();
}

export function drawPlay(ctx, state, theme, time) {
  if (!state.round || !state.layout) return;
  field(ctx, state, theme, time);
  tray(ctx, state, theme, time);
  bar(ctx, state, theme, time);
  hint(ctx, state, theme, time);
  if (state.drag.phase === "lifted") drawLifted(ctx, pieceOf(state.drag.piece), state.drag.point.x, state.drag.point.y - state.layout.lift, state.layout.court.cell, theme, time);
  moments(ctx, state, theme, time);
  if (state.paused) pause(ctx, state, theme);
}
