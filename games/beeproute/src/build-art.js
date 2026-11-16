import { drawPause, pauseLayout } from "../../../kit/src/canvas/index.js";
import { circle, roundedRect, paint } from "../../../kit/src/canvas/pen.js";
import { drawBar } from "./bar-art.js";
import { barShown, drawBoard, drawStage, rimmed } from "./board.js";
import { drawCommandButton } from "./command-art.js";
import { KIND } from "./editor.js";
import { placeOf } from "./level.js";
import { drawRobot } from "./robot-art.js";
import { drawTile } from "./tiles-art.js";

const progressOf = (moment, time) => Math.min(1, Math.max(0, (time * 1000 - moment.start) / moment.duration));

export function drawToolArt(ctx, tool, x, y, size, theme, { world, player, look }) {
  if (tool === "robot") {
    drawRobot(ctx, x, y, size * 0.9, { look, face: player, dir: 0 }, theme);
    return;
  }
  drawTile(ctx, tool === "goal" ? "G" : KIND[tool], x - size / 2, y - size / 2, size, theme, { world });
}

function tools(ctx, state, theme, time) {
  const { layout, build, press } = state;
  const { ui } = theme;
  const shake = state.moments.find((moment) => moment.kind === "shake" && moment.target === "send");
  for (const target of layout.buttons) {
    const pressed = Boolean(press && press.kind === target.kind && press.value === target.value);
    const x = target.x + target.w / 2;
    const y = target.y + target.h / 2;
    if (target.kind === "send") {
      ctx.save();
      if (shake) ctx.translate(Math.sin(progressOf(shake, time) * Math.PI * 6) * 6 * (1 - progressOf(shake, time)), 0);
      drawCommandButton(ctx, target, "send", theme, { primary: true, pressed, dim: !build.check.ok });
      ctx.restore();
      continue;
    }
    const chosen = build.tool === target.value;
    const size = Math.min(target.w, target.h);
    circle(ctx, x, y, (size / 2 - ui.line * (chosen ? 1.5 : 0.5)) * (pressed ? 0.94 : 1), pressed ? ui.pressed : ui.surface, chosen ? ui.accent : ui.border, chosen ? ui.line * 3 : ui.line);
    rimmed(ctx, theme, () => drawToolArt(ctx, target.value, x, y, size * 0.5, theme, { world: state.progress.chosen.world, player: state.player, look: state.progress.chosen.robot }));
  }
}

function refused(ctx, state, theme, time) {
  const { board } = state.layout;
  for (const moment of state.moments.filter((one) => one.kind === "shake" && Number.isInteger(one.cell))) {
    const { x, y } = placeOf(state.build.level, moment.cell);
    ctx.save();
    ctx.globalAlpha = 1 - progressOf(moment, time);
    roundedRect(ctx, board.x + x * board.cell + 2, board.y + y * board.cell + 2, board.cell - 4, board.cell - 4, board.cell * 0.2);
    paint(ctx, null, theme.art.wrong, theme.stroke.bold);
    ctx.restore();
  }
}

export function drawBuild(ctx, state, theme, time) {
  const { build, layout } = state;
  if (!build || !layout) return;
  const { level } = build;
  const { board } = layout;
  const start = placeOf(level, level.start.at);
  ctx.save();
  drawStage(ctx, state, theme, time);
  rimmed(ctx, theme, () => {
    drawBoard(ctx, layout, level, theme, { world: state.progress.chosen.world, time });
    drawRobot(ctx, board.x + (start.x + 0.5) * board.cell, board.y + (start.y + 0.5) * board.cell, board.cell * 0.82, { look: state.progress.chosen.robot, face: state.player, dir: level.start.dir, time }, theme);
  });
  refused(ctx, state, theme, time);
  tools(ctx, state, theme, time);
  drawBar(ctx, layout, barShown(state), theme, time);
  if (state.paused) drawPause(ctx, state, theme.ui, { layout: pauseLayout(state.width, state.height, { fill: state.fill }) });
  ctx.restore();
}
