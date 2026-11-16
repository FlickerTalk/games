import { TAU, circle, clamp, ease, ellipse, line, paint, polygon, starPath, withRim } from "../../../kit/src/canvas/pen.js";

export const rimmed = (ctx, theme, draw) => withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, draw);

function cloudPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, s * 0.2);
  ctx.bezierCurveTo(-s * 0.62, s * 0.08, -s * 0.52, -s * 0.18, -s * 0.3, -s * 0.18);
  ctx.bezierCurveTo(-s * 0.3, -s * 0.48, s * 0.12, -s * 0.53, s * 0.22, -s * 0.24);
  ctx.bezierCurveTo(s * 0.52, -s * 0.28, s * 0.62, s * 0.08, s * 0.4, s * 0.22);
  ctx.bezierCurveTo(s * 0.18, s * 0.39, -s * 0.2, s * 0.38, -s * 0.42, s * 0.2);
  ctx.closePath();
}

function bodyPath(ctx, kind, s) {
  if (kind === "star") return starPath(ctx, 0, 0, s * 0.53, s * 0.35);
  if (kind === "cloud") return cloudPath(ctx, s);
  const narrow = kind === "oval" ? 0.76 : 1;
  const tall = kind === "oval" ? 1.18 : 1;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5 * tall);
  ctx.bezierCurveTo(s * 0.38 * narrow, -s * 0.5 * tall, s * 0.52 * narrow, -s * 0.12, s * 0.42 * narrow, s * 0.16);
  ctx.bezierCurveTo(s * 0.34 * narrow, s * 0.39, s * 0.13, s * 0.49 * tall, 0, s * 0.52 * tall);
  ctx.bezierCurveTo(-s * 0.13, s * 0.49 * tall, -s * 0.34 * narrow, s * 0.39, -s * 0.42 * narrow, s * 0.16);
  ctx.bezierCurveTo(-s * 0.52 * narrow, -s * 0.12, -s * 0.38 * narrow, -s * 0.5 * tall, 0, -s * 0.5 * tall);
  ctx.closePath();
  return undefined;
}

function string(ctx, s, kind, { balloons, ink }) {
  const bottom = kind === "oval" ? 0.62 : 0.53;
  line(ctx, [[0, s * bottom], [s * 0.08, s * 0.72], [-s * 0.04, s * 0.94]], balloons.string, Math.max(1.5, s * 0.025));
  polygon(ctx, [[0, s * (bottom - 0.03)], [-s * 0.09, s * (bottom + 0.09)], [s * 0.09, s * (bottom + 0.09)]], balloons.knot, ink, Math.max(1.5, s * 0.035));
}

function patch(ctx, s, hits, { balloons, ink }) {
  ctx.save();
  ctx.translate(-s * 0.2, s * 0.05);
  ctx.rotate(-0.25);
  polygon(ctx, [[-s * 0.12, -s * 0.12], [s * 0.12, -s * 0.12], [s * 0.12, s * 0.12], [-s * 0.12, s * 0.12]], balloons.patch, ink, Math.max(2, s * 0.025));
  const stitches = hits > 0 ? 1 : 2;
  for (let at = 0; at < stitches; at += 1) {
    const x = (at - (stitches - 1) / 2) * s * 0.09;
    line(ctx, [[x - s * 0.025, -s * 0.07], [x + s * 0.025, -s * 0.03]], balloons.stitch, Math.max(1.5, s * 0.02));
  }
  ctx.restore();
}

function shine(ctx, s, kind, { balloons }) {
  if (kind === "cloud") return ellipse(ctx, -s * 0.2, -s * 0.2, s * 0.12, s * 0.06, balloons.shine);
  ctx.save();
  ctx.translate(-s * 0.2, -s * 0.23);
  ctx.rotate(-0.55);
  ellipse(ctx, 0, 0, s * 0.08, s * 0.16, balloons.shine);
  ctx.restore();
  return undefined;
}

export function drawBalloon(ctx, x, y, size, kind, theme, { time = 0, hits = 0, sway = true } = {}) {
  const { art } = theme;
  ctx.save();
  ctx.translate(x + (sway ? Math.sin(time * 1.4 + y * 0.05) * size * 0.025 : 0), y);
  if (sway) ctx.rotate(Math.sin(time * 2 + x * 0.017) * 0.045);
  rimmed(ctx, theme, () => {
    string(ctx, size, kind, art);
    bodyPath(ctx, kind, size);
    paint(ctx, art.balloons[kind] ?? art.balloons.round, art.ink, clamp(size * 0.045, 2.5, 5));
    shine(ctx, size, kind, art);
    if (kind === "big") patch(ctx, size, hits, art);
    if (kind === "small") {
      line(ctx, [[-size * 0.65, -size * 0.2], [-size * 0.9, -size * 0.2]], art.balloons.streak, 3);
      line(ctx, [[-size * 0.62, size * 0.05], [-size * 0.8, size * 0.05]], art.balloons.streak, 3);
    }
  });
  ctx.restore();
}

const REACH = [0, 0.32, 0.55, 0.75];
const PIECE = [0.08, 0.12, 0.1, 0.06];

function pieces(ctx, size, colour, frame, ink) {
  const far = REACH[frame] * size;
  const piece = size * PIECE[frame];
  for (let at = 0; at < 8; at += 1) {
    const angle = (at * TAU) / 8 - Math.PI / 2;
    ctx.save();
    ctx.translate(Math.cos(angle) * far, Math.sin(angle) * far);
    ctx.rotate(angle + frame * 0.25);
    polygon(ctx, [[-piece, -piece * 0.5], [piece, 0], [-piece * 0.5, piece]], colour, ink, Math.max(1, size * 0.02));
    ctx.restore();
  }
}

export function drawPop(ctx, x, y, size, kind, progress, theme) {
  if (kind === "cloud") return drawCloudPuff(ctx, x, y, size, progress, theme);
  if (progress >= 1) return undefined;
  const { art } = theme;
  const frame = Math.min(3, Math.floor(clamp(progress) * 4));
  const colour = art.balloons[kind] ?? art.balloons.round;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - frame * 0.18;
  rimmed(ctx, theme, () => {
    if (frame === 0) {
      ctx.scale(1.08, 1.08);
      bodyPath(ctx, kind, size);
      paint(ctx, colour, art.ink, clamp(size * 0.04, 2, 4));
    } else pieces(ctx, size, colour, frame, art.ink);
  });
  ctx.beginPath();
  ctx.arc(0, 0, size * (0.28 + frame * 0.18), 0, TAU);
  paint(ctx, null, art.effects.ring, Math.max(2, size * (0.07 - frame * 0.012)));
  ctx.restore();
  return undefined;
}

export function drawCloudPuff(ctx, x, y, size, progress, theme) {
  const p = clamp(progress);
  if (p >= 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - p * 0.75;
  rimmed(ctx, theme, () => {
    for (let at = 0; at < 7; at += 1) {
      const angle = (at * TAU) / 7;
      const far = ease(p) * size * 0.7;
      circle(ctx, Math.cos(angle) * far, Math.sin(angle) * far, size * (0.16 - p * 0.07), theme.art.effects.puff, theme.art.ink, 2);
    }
  });
  ctx.restore();
}

export function drawBurst(ctx, x, y, size, progress, theme) {
  if (progress >= 1) return;
  const p = ease(progress);
  const colours = theme.art.effects.confetti;
  ctx.save();
  ctx.translate(x, y);
  for (let at = 0; at < 18; at += 1) {
    const angle = at * 2.4;
    const far = p * size * (0.35 + (at % 5) * 0.12);
    ctx.save();
    ctx.translate(Math.cos(angle) * far, Math.sin(angle) * far + p * p * size * 0.35);
    ctx.rotate(angle + p * 4);
    ctx.globalAlpha = 1 - clamp(progress) * 0.65;
    ctx.fillStyle = colours[at % colours.length];
    ctx.fillRect(-size * 0.035, -size * 0.018, size * 0.07, size * 0.036);
    ctx.restore();
  }
  ctx.restore();
}

export function drawOwnerMark(ctx, x, y, size, owner, theme) {
  const { marks, ink } = theme.art;
  const width = Math.max(1.5, size * 0.1);
  ctx.save();
  rimmed(ctx, theme, () => {
    if (owner === "theirs") polygon(ctx, [[x, y - size / 2], [x + size * 0.42, y], [x, y + size / 2], [x - size * 0.42, y]], marks.theirs, ink, width);
    else circle(ctx, x, y, size * 0.42, marks.mine, ink, width);
  });
  ctx.restore();
}
