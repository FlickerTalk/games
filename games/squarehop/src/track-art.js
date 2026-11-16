import { FONT, formatNumber } from "../../../kit/src/canvas/index.js";
import { ellipse, line, paint, polygon, roundedRect, withRim } from "../../../kit/src/canvas/pen.js";
import { squareAt } from "./layout.js";
import { kindOf } from "./rules.js";

const ICON_LIFT = 0.2;

function spring(ctx, s, theme) {
  const { coil } = theme.art.spring;
  line(ctx, [[-s * 0.3, s * 0.39], [s * 0.3, s * 0.39]], coil, s * 0.07);
  line(ctx, [[-s * 0.22, s * 0.39], [s * 0.22, s * 0.32], [-s * 0.22, s * 0.25], [s * 0.22, s * 0.18], [0, s * 0.14]], coil, s * 0.06);
  polygon(ctx, [[-s * 0.13, s * 0.15], [s * 0.13, s * 0.15], [0, s * 0.03]], coil, null, 0);
}

function turbo(ctx, s, theme) {
  const points = [[-0.2, 0.2], [0.0, 0.2], [-0.06, 0.42], [0.22, 0.14], [0.03, 0.14], [0.1, 0.0]];
  polygon(ctx, points.map(([x, y]) => [x * s, y * s]), theme.art.turbo, theme.art.ink, Math.max(1.5, s * 0.035));
}

function puddle(ctx, s, theme, time) {
  const { water, light } = theme.art.puddle;
  ellipse(ctx, 0, s * 0.27, s * 0.36, s * 0.13, water, theme.art.ink, Math.max(1.5, s * 0.035));
  ctx.beginPath();
  ctx.arc(-s * 0.08, s * 0.27, s * (0.08 + Math.sin(time * 2) * 0.012), Math.PI, Math.PI * 2);
  ctx.strokeStyle = light;
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  ctx.stroke();
}

function flag(ctx, s, theme) {
  const unit = s * 0.13;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? theme.art.track.flag : theme.art.ink;
      ctx.fillRect(-unit * 2 + col * unit, s * 0.14 + row * unit, unit, unit);
    }
  }
}

const ICONS = { spring, turbo, puddle, finish: flag };

function digitSize(size, number, special, least) {
  const share = special ? 0.34 : number > 9 ? 0.42 : 0.5;
  return Math.max(least, size * share);
}

export function drawSquare(ctx, x, y, size, number, kind, theme, { lit = false, active = false, time = 0, lang = "en" } = {}) {
  const { track, ink } = theme.art;
  const special = kind !== "plain";
  const bright = lit || active || kind === "finish";
  ctx.save();
  ctx.translate(x, y);
  roundedRect(ctx, -size / 2, -size / 2, size, size, size * 0.2);
  paint(ctx, lit || active ? track.lit : kind === "finish" ? track.finish : track.square, active ? theme.art.chosen.ring : bright ? ink : track.line, Math.max(1.5, size * (active ? 0.075 : 0.05)));
  if (lit && !active) {
    roundedRect(ctx, -size * 0.38, -size * 0.38, size * 0.76, size * 0.76, size * 0.14);
    paint(ctx, null, theme.art.chosen.ring, Math.max(1.5, size * 0.03));
  }
  if (active) {
    ctx.beginPath();
    ctx.arc(0, 0, size * (0.62 + Math.sin(time * 5) * 0.025), 0, Math.PI * 2);
    paint(ctx, null, theme.art.chosen.halo, size * 0.06);
  }
  if (special) withRim(ctx, { ink, colour: bright ? null : theme.art.rim }, () => ICONS[kind](ctx, size, theme, time));
  ctx.font = `800 ${digitSize(size, number, special, theme.text.digit)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = bright ? track.litDigit : track.digit;
  ctx.fillText(formatNumber(number, lang), 0, special ? -size * ICON_LIFT : size * 0.025);
  ctx.restore();
}

function connectors(ctx, track, theme) {
  ctx.save();
  ctx.strokeStyle = theme.art.track.edge;
  ctx.lineWidth = track.cell * 0.28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let row = 0; row < track.rows - 1; row += 1) {
    const end = squareAt(track, (row + 1) * track.cols);
    const next = squareAt(track, (row + 1) * track.cols + 1);
    const middle = (end.y + next.y) / 2;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y + track.cell * 0.3);
    ctx.lineTo(end.x, middle);
    ctx.lineTo(next.x, middle);
    ctx.lineTo(next.x, next.y - track.cell * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTrack(ctx, track, theme, { trail = null, time = 0, lang = "en" } = {}) {
  ctx.save();
  connectors(ctx, track, theme);
  for (let number = 1; number <= track.count; number += 1) {
    const { x, y } = squareAt(track, number);
    drawSquare(ctx, x, y, track.cell, number, kindOf(number), theme, { lit: Boolean(trail?.lit.includes(number)), active: trail?.active === number, time, lang });
  }
  ctx.restore();
}
