import { clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawMop } from "./ships.js";
import { coloursOf, teamMark } from "./tanks.js";

export const SUBS = Object.freeze([
  { id: "classic", body: "submarine", light: "glass", dark: "submarineDark" },
  { id: "bathysphere", body: "coral", light: "cork", dark: "coralDark" },
  { id: "whale", body: "azure", light: "glass", dark: "azureDark" },
  { id: "bath", body: "duck", light: "playerLight", dark: "duckDark" },
  { id: "longfin", body: "mint", light: "grassLight", dark: "mintDark" },
]);

export const DIVE_DROP = 0.48;

function propeller(ctx, s, c, art, time, x = -0.53, y = 0) {
  ctx.save();
  ctx.translate(s * x, s * y);
  ctx.rotate(time * 2.4);
  for (let blade = 0; blade < 3; blade += 1) {
    ctx.rotate((Math.PI * 2) / 3);
    ellipse(ctx, 0, -s * 0.1, s * 0.045, s * 0.11, c.light, art.ink, s * 0.02);
  }
  ellipse(ctx, 0, 0, s * 0.05, s * 0.05, c.dark, art.ink, s * 0.02);
  ctx.restore();
}

function classic(ctx, s, c, art, time) {
  ellipse(ctx, 0, 0, s * 0.48, s * 0.22, c.body, art.ink, s * 0.035);
  polygon(ctx, [[-s * 0.39, 0], [-s * 0.58, -s * 0.18], [-s * 0.56, s * 0.18]], c.dark, art.ink, s * 0.03);
  roundedRect(ctx, -s * 0.13, -s * 0.34, s * 0.27, s * 0.18, s * 0.07);
  paint(ctx, c.dark, art.ink, s * 0.03);
  const mast = [[0, -s * 0.32], [0, -s * 0.65], [s * 0.16, -s * 0.65], [s * 0.16, -s * 0.57]];
  line(ctx, mast, art.ink, s * 0.075);
  line(ctx, mast, c.light, s * 0.035);
  ellipse(ctx, s * 0.16, -s * 0.57, s * 0.045, s * 0.035, art.glass, art.ink, s * 0.018);
  propeller(ctx, s, c, art, time);
}

function bathysphere(ctx, s, c, art) {
  for (const side of [-1, 1]) polygon(ctx, [[side * s * 0.32, -s * 0.1], [side * s * 0.54, -s * 0.26], [side * s * 0.49, s * 0.12]], c.dark, art.ink, s * 0.03);
  ellipse(ctx, 0, -s * 0.03, s * 0.39, s * 0.37, c.body, art.ink, s * 0.04);
  ellipse(ctx, s * 0.06, -s * 0.05, s * 0.25, s * 0.24, c.dark, art.ink, s * 0.025);
  ellipse(ctx, s * 0.06, -s * 0.05, s * 0.2, s * 0.19, art.glass, art.ink, s * 0.02);
  ellipse(ctx, -s * 0.01, -s * 0.13, s * 0.06, s * 0.04, art.white);
  roundedRect(ctx, -s * 0.16, -s * 0.46, s * 0.3, s * 0.12, s * 0.05);
  paint(ctx, c.light, art.ink, s * 0.025);
}

function whale(ctx, s, c, art) {
  ctx.beginPath();
  ctx.moveTo(-s * 0.38, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.04, -s * 0.39, s * 0.39, -s * 0.17);
  ctx.quadraticCurveTo(s * 0.55, -s * 0.05, s * 0.39, s * 0.17);
  ctx.quadraticCurveTo(-s * 0.05, s * 0.32, -s * 0.39, s * 0.09);
  ctx.closePath();
  paint(ctx, c.body, art.ink, s * 0.035);
  polygon(ctx, [[-s * 0.34, -s * 0.04], [-s * 0.57, -s * 0.24], [-s * 0.54, s * 0.02], [-s * 0.62, s * 0.22], [-s * 0.35, s * 0.11]], c.dark, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.04, -s * 0.3], [s * 0.02, -s * 0.49], [s * 0.14, -s * 0.28]], c.dark, art.ink, s * 0.025);
  polygon(ctx, [[s * 0.02, s * 0.19], [s * 0.14, s * 0.36], [s * 0.25, s * 0.14]], c.light, art.ink, s * 0.025);
}

function windUpKey(ctx, s, c, art, time) {
  ctx.save();
  ctx.translate(-s * 0.39, -s * 0.3);
  ctx.rotate(Math.sin(time * 2) * 0.15);
  line(ctx, [[0, s * 0.18], [0, -s * 0.08]], art.ink, s * 0.055);
  line(ctx, [[0, s * 0.18], [0, -s * 0.08]], art.hub, s * 0.025);
  for (const side of [-1, 1]) {
    ellipse(ctx, side * s * 0.09, -s * 0.12, s * 0.09, s * 0.12, c.light, art.ink, s * 0.025);
    ellipse(ctx, side * s * 0.09, -s * 0.12, s * 0.035, s * 0.055, art.cream, art.ink, s * 0.015);
  }
  ctx.restore();
}

function bath(ctx, s, c, art, time) {
  roundedRect(ctx, -s * 0.47, -s * 0.25, s * 0.91, s * 0.46, s * 0.22);
  paint(ctx, c.body, art.ink, s * 0.035);
  roundedRect(ctx, -s * 0.12, -s * 0.38, s * 0.29, s * 0.18, s * 0.08);
  paint(ctx, c.light, art.ink, s * 0.03);
  line(ctx, [[s * 0.02, -s * 0.37], [s * 0.02, -s * 0.53]], art.ink, s * 0.07);
  ellipse(ctx, s * 0.02, -s * 0.54, s * 0.09, s * 0.05, c.dark, art.ink, s * 0.02);
  windUpKey(ctx, s, c, art, time);
  propeller(ctx, s, c, art, time, -0.52, 0.08);
}

function longfin(ctx, s, c, art, time) {
  polygon(ctx, [[-s * 0.16, -s * 0.14], [-s * 0.28, -s * 0.39], [s * 0.04, -s * 0.18]], c.dark, art.ink, s * 0.025);
  polygon(ctx, [[-s * 0.08, s * 0.13], [-s * 0.18, s * 0.35], [s * 0.15, s * 0.16]], c.dark, art.ink, s * 0.025);
  ellipse(ctx, 0, 0, s * 0.54, s * 0.16, c.body, art.ink, s * 0.035);
  polygon(ctx, [[-s * 0.46, 0], [-s * 0.62, -s * 0.17], [-s * 0.59, s * 0.16]], c.light, art.ink, s * 0.025);
  for (let port = 0; port < 3; port += 1) ellipse(ctx, s * (-0.15 + port * 0.18), -s * 0.025, s * 0.055, s * 0.055, art.glass, art.ink, s * 0.018);
  propeller(ctx, s, c, art, time, -0.61, 0);
}

const HULLS = { classic, bathysphere, whale, bath, longfin };
const COATS = [[-0.2, -0.12, 0.12], [0.2, 0.11, 0.14], [-0.02, -0.24, 0.15]];

function cannon(ctx, s, c, art, { angle, direction, recoil }) {
  const origin = [s * 0.05, -s * 0.25];
  const length = s * 0.4 * (1 - recoil * 0.22);
  const end = [origin[0] + Math.cos(angle) * direction * length, origin[1] - Math.sin(angle) * length];
  line(ctx, [origin, end], art.ink, s * 0.12);
  line(ctx, [origin, end], c.dark, s * 0.065);
  ellipse(ctx, end[0], end[1], s * 0.065, s * 0.065, art.cork, art.ink, s * 0.02);
}

function face(ctx, variant, s, level, art) {
  const x = variant === "whale" ? s * 0.27 : variant === "bathysphere" ? s * 0.07 : s * 0.24;
  const y = variant === "bathysphere" ? -s * 0.05 : -s * 0.04;
  const gap = s * (variant === "bathysphere" ? 0.07 : 0.055);
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * gap, y, s * 0.035, s * 0.045, art.white, art.ink, s * 0.014);
    ellipse(ctx, x + side * gap, y + s * 0.005, s * 0.013, s * (level >= 3 ? 0.008 : 0.022), art.ink);
  }
  ctx.beginPath();
  ctx.arc(x, y + s * 0.075, s * 0.05, 0.15, Math.PI - 0.15);
  ctx.strokeStyle = art.ink;
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = "round";
  ctx.stroke();
}

function bubbles(ctx, s, art, time) {
  for (let bubble = 0; bubble < 5; bubble += 1) {
    const rise = (time * 0.3 + bubble / 5) % 1;
    const r = s * (0.035 + rise * 0.025);
    ctx.save();
    ctx.globalAlpha *= (1 - rise) * 0.85;
    ellipse(ctx, s * (0.38 + Math.sin(bubble * 2.1) * 0.08), -s * (0.18 + rise * 0.75), r, r, art.bubble, art.foam, s * 0.014);
    ctx.restore();
  }
}

function spray(ctx, s, art, progress) {
  const strength = Math.sin(clamp(progress) * Math.PI);
  for (const side of [-1, 1]) line(ctx, [[side * s * 0.2, s * 0.15], [side * s * (0.35 + strength * 0.15), -s * 0.12], [side * s * (0.45 + strength * 0.12), s * 0.12]], art.foam, s * 0.055);
}

function depthOf(state, progress, depth) {
  if (state === "diving") return clamp(progress);
  if (state === "surfacing") return 1 - clamp(progress);
  return depth ?? (state === "underwater" || state === "torpedo" ? 1 : 0);
}

export function drawSub(ctx, x, y, s, art, options = {}) {
  const { variant = "classic", team = 0, angle = 0.55, direction = team === 0 ? 1 : -1, recoil = 0, hitLevel = 0, wiping = false, time = 0, ghost = false, idle = true, state = "idle", progress = 0 } = options;
  const hitColour = options.hitColour ?? (team === 0 ? art.rival : art.player);
  const c = coloursOf(SUBS, variant, art);
  const dive = depthOf(state, progress, options.depth);
  const kick = clamp(recoil);
  const level = clamp(Math.round(hitLevel), 0, 3);
  ctx.save();
  ctx.translate(x - Math.cos(angle) * direction * kick * s * 0.04, y + (idle ? Math.sin(time * 1.8 + team) * s * 0.025 : 0) + dive * s * DIVE_DROP);
  if (ghost) ctx.globalAlpha *= 0.42;
  if (dive > 0.05) ctx.globalAlpha *= 0.68 - dive * 0.25;
  HULLS[c.id](ctx, s, c, art, time);
  if (state === "torpedo") ellipse(ctx, direction * s * 0.49, s * 0.08, s * 0.08, s * 0.055, art.cork, art.ink, s * 0.02);
  else if (state === "aiming" || state === "firing" || dive < 0.1) cannon(ctx, s, c, art, { angle: clamp(angle, 0.08, 1.48), direction, recoil: kick });
  for (const [bx, by, r] of COATS.slice(0, level)) {
    ellipse(ctx, s * bx, s * by, s * r, s * r * 0.72, hitColour);
    ellipse(ctx, s * (bx + r), s * (by - r * 0.2), s * r * 0.3, s * r * 0.25, hitColour);
  }
  face(ctx, c.id, s, level, art);
  teamMark(ctx, -s * 0.3, 0, s * 0.05, team, art);
  if (dive > 0.1) bubbles(ctx, s, art, time + team);
  if (wiping || state === "wash") drawMop(ctx, s, art, time, s * 0.11);
  if (state === "surfacing") spray(ctx, s, art, progress);
  ctx.restore();
}
