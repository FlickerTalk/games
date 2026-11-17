import { drawAvatar, standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHome as drawHomeScreen, drawLooks as drawLooksScreen, homeLayout, looksLayout } from "../../../kit/src/canvas/index.js";
import { circle, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawLobby } from "../../../kit/src/duel/lobby.js";
import { drawStage, rimmed } from "./board.js";
import { LOOKS, PROGRESS } from "./levels.js";
import { drawGiftBox, drawRobot } from "./robot-art.js";
import { drawTile } from "./tiles-art.js";
import { drawWorld } from "./world-art.js";

const VARIANTS = ["levels", "make"];
const TABS = ["robot", "world"];
const YOURS = ["build", "solve", "watch"];

function miniLevel(ctx, area, state, theme, time) {
  const span = Math.min(area.w, area.h) * 0.66;
  const cell = span / 3;
  const left = area.x + (area.w - span) / 2;
  const top = area.y + (area.h - span) / 2;
  const world = state.progress.chosen.world;
  [".", ".", "G", ".", "B", ".", ".", ".", "#"].forEach((kind, at) => drawTile(ctx, kind, left + (at % 3) * cell, top + Math.floor(at / 3) * cell, cell, theme, { world, time }));
  drawRobot(ctx, left + cell / 2, top + cell * 2.5, cell * 0.85, { look: state.progress.chosen.robot, face: state.player, time }, theme);
}

function miniTools(ctx, area, state, theme, time) {
  const span = Math.min(area.w, area.h) * 0.6;
  const cell = span / 2;
  const left = area.x + (area.w - span) / 2;
  const top = area.y + (area.h - span) / 2;
  ["#", "~", "B", "G"].forEach((kind, at) => drawTile(ctx, kind, left + (at % 2) * cell, top + Math.floor(at / 2) * cell, cell, theme, { world: state.progress.chosen.world, time }));
}

function friendMark(ctx, area, player, theme, time) {
  const size = Math.min(area.w, area.h) * 0.3;
  const x = area.x + area.w - size * 0.55;
  const y = area.y + size * 0.55;
  circle(ctx, x, y, size / 2, theme.ui.accent, theme.ui.page, theme.ui.line);
  drawAvatar(ctx, x, y + size * 0.03, size * 0.62, { ...standIn(player), face: "happy", time });
}

function bandRobot(ctx, band, state, theme, time) {
  if (band.h < 70) return;
  const size = Math.min(band.h * 0.6, 110);
  const [x, y] = centreOf(band);
  rimmed(ctx, theme, () => drawRobot(ctx, x, y, size, { look: state.progress.chosen.robot, face: state.player, pose: "idle", time }, theme));
}

export function drawHome(ctx, state, seat, theme, time, duty = null) {
  const layout = homeLayout(state.width, state.height, { variants: VARIANTS, rival: Boolean(seat), fill: state.fill });
  const yours = YOURS.includes(duty);
  drawHomeScreen(ctx, state, theme.ui, time, {
    layout,
    seat,
    volume: state.layout?.volume,
    drawStage: (pen, band) => {
      drawStage(pen, state, theme, time);
      bandRobot(pen, band, state, theme, time);
    },
    drawVariant: (pen, target) =>
      rimmed(pen, theme, () => {
        if (target.value === "levels") miniLevel(pen, target, state, theme, time);
        else miniTools(pen, target, state, theme, time);
        if (target.value === "make" && yours) friendMark(pen, target, state.player, theme, time);
      }),
  });
  const play = layout.targets.find((one) => one.kind === "play");
  if (state.wanting && seat && !seat.away && !yours) drawLobby(ctx, { play }, { waiting: true, invited: false }, theme.ui, time);
}

export function drawLookArt(ctx, area, kind, look, state, theme, time) {
  const [x, y] = centreOf(area);
  if (kind === "robot") {
    rimmed(ctx, theme, () => drawRobot(ctx, x, y, Math.min(area.w, area.h) * 0.62, { look, face: state.player, time }, theme));
    return;
  }
  ctx.save();
  roundedRect(ctx, area.x + 6, area.y + 6, area.w - 12, area.h - 12, theme.ui.radius - 4);
  ctx.clip();
  drawWorld(ctx, look, area, theme, time);
  ctx.restore();
  const cell = Math.min(area.w, area.h) * 0.3;
  rimmed(ctx, theme, () => {
    drawTile(ctx, ".", x - cell, y - cell / 2, cell, theme, { world: look, time });
    drawTile(ctx, "#", x, y - cell / 2, cell, theme, { world: look, time });
  });
}

function shakeOf(state, index, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.index === index);
  return moment ? Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration)) : 0;
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
    drawLook: (pen, area, look, now) => drawLookArt(pen, area, kind, look, state, theme, now),
    drawTab: (pen, area, value) => drawLookArt(pen, { x: area.x + 8, y: area.y + 8, w: area.w - 16, h: area.h - 16 }, value, value === "robot" ? "box" : "workshop", state, theme, 0),
    drawWrapped: (pen, area, shake) => rimmed(pen, theme, () => drawGiftBox(pen, area, shake, theme)),
  });
}
