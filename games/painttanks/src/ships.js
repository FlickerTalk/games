import { clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";
import { coloursOf, teamMark } from "./tanks.js";

export const SHIPS = Object.freeze([
  { id: "tug", body: "coral", light: "cork", dark: "coralDark" },
  { id: "sail", body: "wood", light: "woodLight", dark: "trunk" },
  { id: "paddle", body: "azure", light: "glass", dark: "azureDark" },
  { id: "duck", body: "duck", light: "playerLight", dark: "duckDark" },
  { id: "bathtub", body: "rose", light: "roseLight", dark: "roseDark" },
  { id: "submarine", body: "submarine", light: "glass", dark: "submarineDark" },
]);

function hull(ctx, variant, s, c, art) {
  if (variant === "submarine") {
    ellipse(ctx, 0, -s * 0.05, s * 0.48, s * 0.2, c.body, art.ink, s * 0.035);
    polygon(ctx, [[-s * 0.42, -s * 0.08], [-s * 0.58, -s * 0.2], [-s * 0.56, s * 0.04]], c.dark, art.ink, s * 0.03);
  } else if (variant === "duck") {
    ellipse(ctx, 0, -s * 0.12, s * 0.43, s * 0.26, c.body, art.ink, s * 0.035);
    ellipse(ctx, -s * 0.17, -s * 0.32, s * 0.2, s * 0.15, c.light);
  } else if (variant === "bathtub") {
    roundedRect(ctx, -s * 0.47, -s * 0.3, s * 0.94, s * 0.37, s * 0.15);
    paint(ctx, c.body, art.ink, s * 0.035);
    roundedRect(ctx, -s * 0.5, -s * 0.34, s, s * 0.11, s * 0.05);
    paint(ctx, c.light, art.ink, s * 0.03);
  } else {
    const half = s * (variant === "sail" || variant === "paddle" ? 0.5 : 0.44);
    polygon(ctx, [[-half, -s * 0.25], [half, -s * 0.25], [s * 0.34, s * 0.06], [-s * 0.31, s * 0.06]], c.body, art.ink, s * 0.035);
    line(ctx, [[-s * 0.34, -s * 0.1], [s * 0.35, -s * 0.1]], c.light, s * 0.045);
  }
}

function cannon(ctx, s, c, art, { angle, direction, recoil, origin }) {
  const length = s * 0.43 * (1 - clamp(recoil) * 0.24);
  const dx = Math.cos(angle) * direction;
  const dy = -Math.sin(angle);
  const end = [origin.x + dx * length, origin.y + dy * length];
  line(ctx, [[origin.x, origin.y], end], art.ink, s * 0.13);
  line(ctx, [[origin.x, origin.y], end], c.dark, s * 0.07);
  ctx.save();
  ctx.translate(...end);
  ctx.rotate(Math.atan2(dy, dx));
  roundedRect(ctx, -s * 0.02, -s * 0.09, s * 0.09, s * 0.18, s * 0.03);
  paint(ctx, art.cork, art.ink, s * 0.022);
  ctx.restore();
}

function tug(ctx, s, c, art) {
  roundedRect(ctx, -s * 0.24, -s * 0.59, s * 0.43, s * 0.34, s * 0.07);
  paint(ctx, c.light, art.ink, s * 0.03);
  roundedRect(ctx, -s * 0.3, -s * 0.64, s * 0.54, s * 0.1, s * 0.04);
  paint(ctx, c.dark, art.ink, s * 0.025);
  roundedRect(ctx, s * 0.18, -s * 0.72, s * 0.13, s * 0.35, s * 0.035);
  paint(ctx, art.tire, art.ink, s * 0.025);
  ellipse(ctx, s * 0.245, -s * 0.78, s * 0.08, s * 0.04, art.white);
}

function sail(ctx, s, c, art) {
  line(ctx, [[-s * 0.1, -s * 0.25], [-s * 0.1, -s * 1.04]], art.trunk, s * 0.055);
  polygon(ctx, [[-s * 0.06, -s * 0.98], [s * 0.34, -s * 0.43], [-s * 0.06, -s * 0.43]], art.sail, art.ink, s * 0.03);
  polygon(ctx, [[-s * 0.15, -s * 0.9], [-s * 0.42, -s * 0.43], [-s * 0.15, -s * 0.43]], c.light, art.ink, s * 0.03);
  ellipse(ctx, -s * 0.1, -s * 1.06, s * 0.045, s * 0.045, art.player, art.ink, s * 0.018);
}

function paddle(ctx, s, c, art, time) {
  roundedRect(ctx, -s * 0.18, -s * 0.57, s * 0.5, s * 0.31, s * 0.05);
  paint(ctx, c.light, art.ink, s * 0.03);
  line(ctx, [[s * 0.08, -s * 0.57], [s * 0.08, -s * 0.77]], art.ink, s * 0.1);
  line(ctx, [[s * 0.08, -s * 0.57], [s * 0.08, -s * 0.77]], art.coral, s * 0.055);
  ellipse(ctx, -s * 0.31, -s * 0.08, s * 0.23, s * 0.23, c.dark, art.ink, s * 0.035);
  ctx.save();
  ctx.translate(-s * 0.31, -s * 0.08);
  ctx.rotate(time * 1.8);
  for (let blade = 0; blade < 6; blade += 1) {
    ctx.rotate(Math.PI / 3);
    line(ctx, [[0, 0], [s * 0.19, 0]], c.light, s * 0.055);
  }
  ctx.restore();
  ellipse(ctx, -s * 0.31, -s * 0.08, s * 0.055, s * 0.055, art.white, art.ink, s * 0.02);
}

function duck(ctx, s, c, art) {
  ellipse(ctx, s * 0.25, -s * 0.48, s * 0.2, s * 0.22, c.body, art.ink, s * 0.035);
  polygon(ctx, [[s * 0.39, -s * 0.49], [s * 0.61, -s * 0.42], [s * 0.39, -s * 0.36]], art.orange, art.ink, s * 0.025);
  ellipse(ctx, s * 0.3, -s * 0.53, s * 0.025, s * 0.035, art.ink);
  polygon(ctx, [[-s * 0.35, -s * 0.2], [-s * 0.51, -s * 0.43], [-s * 0.15, -s * 0.28]], c.dark, art.ink, s * 0.025);
}

function bathtub(ctx, s, c, art) {
  for (const [colour, width] of [[art.ink, 0.075], [art.hub, 0.035]]) {
    ctx.beginPath();
    ctx.arc(-s * 0.29, -s * 0.5, s * 0.15, Math.PI, Math.PI * 1.8);
    ctx.strokeStyle = colour;
    ctx.lineWidth = s * width;
    ctx.stroke();
  }
  for (let foam = 0; foam < 3; foam += 1) ellipse(ctx, s * (0.18 + foam * 0.09), -s * (0.48 + (foam % 2) * 0.1), s * 0.07, s * 0.07, art.foam, art.ink, s * 0.018);
}

function periscope(ctx, s, c, art) {
  roundedRect(ctx, -s * 0.16, -s * 0.35, s * 0.32, s * 0.19, s * 0.08);
  paint(ctx, c.dark, art.ink, s * 0.03);
  const mast = [[0, -s * 0.34], [0, -s * 0.76], [s * 0.18, -s * 0.76], [s * 0.18, -s * 0.67]];
  line(ctx, mast, art.ink, s * 0.085);
  line(ctx, mast, c.light, s * 0.04);
  ellipse(ctx, s * 0.18, -s * 0.67, s * 0.055, s * 0.04, art.glass, art.ink, s * 0.02);
}

const DECKS = { tug, sail, paddle, duck, bathtub, submarine: periscope };
const COATS = [[-0.24, -0.18, 0.13], [0.23, -0.17, 0.15], [0, -0.42, 0.16]];

function face(ctx, variant, s, { level, time }, art) {
  const y = variant === "duck" ? -s * 0.14 : variant === "submarine" ? -s * 0.08 : -s * 0.17;
  const gap = s * 0.075;
  for (let side = -1; side <= 1; side += 2) {
    ellipse(ctx, side * gap, y, s * 0.048, s * 0.058, art.white, art.ink, s * 0.017);
    ellipse(ctx, side * gap, y + s * 0.006, s * 0.017, s * 0.024, art.ink);
  }
  ctx.beginPath();
  ctx.arc(0, y + s * 0.045, s * (level >= 3 ? 0.075 : 0.06), 0.15, Math.PI - 0.15);
  ctx.strokeStyle = art.ink;
  ctx.lineWidth = s * 0.022;
  ctx.lineCap = "round";
  ctx.stroke();
  if (level < 3) return;
  const rise = (time * 0.35) % 1;
  ctx.save();
  ctx.globalAlpha *= 1 - rise;
  ellipse(ctx, s * 0.36, y - s * (0.25 + rise * 0.55), s * (0.06 + rise * 0.04), s * (0.06 + rise * 0.04), art.foam, art.sea, s * 0.018);
  ctx.restore();
}

export function drawMop(ctx, s, art, time, low = 0) {
  const sweep = Math.sin(time * 8) * s * 0.16;
  line(ctx, [[s * 0.38, -s * 0.58 + low], [sweep, -s * 0.06 + low]], art.trunk, s * 0.035);
  roundedRect(ctx, sweep - s * 0.13, -s * 0.13 + low, s * 0.26, s * 0.1, s * 0.04);
  paint(ctx, art.foam, art.ink, s * 0.02);
  for (let drop = -1; drop <= 1; drop += 1) line(ctx, [[sweep + drop * s * 0.07, -s * 0.05 + low], [sweep + drop * s * 0.09, s * 0.02 + low]], art.spray, s * 0.025);
}

export function drawShip(ctx, x, y, s, art, options = {}) {
  const { variant = "tug", team = 0, angle = 0.55, direction = team === 0 ? 1 : -1, recoil = 0, hitLevel = 0, wiping = false, time = 0, ghost = false, idle = true, wave = 0 } = options;
  const hitColour = options.hitColour ?? (team === 0 ? art.rival : art.player);
  const c = coloursOf(SHIPS, variant, art);
  const bob = (idle ? Math.sin(time * 1.7 + team * 1.9) * s * 0.025 : 0) + wave;
  const level = clamp(Math.round(hitLevel), 0, 3);
  ctx.save();
  ctx.translate(x - Math.cos(angle) * direction * clamp(recoil) * s * 0.04, y + bob);
  if (ghost) ctx.globalAlpha *= 0.42;
  hull(ctx, c.id, s, c, art);
  DECKS[c.id](ctx, s, c, art, time);
  const origin = c.id === "sail" ? { x: s * 0.12, y: -s * 0.3 } : { x: 0, y: -s * 0.32 };
  cannon(ctx, s, c, art, { angle: clamp(angle, 0.08, 1.48), direction, recoil, origin });
  for (const [bx, by, r] of COATS.slice(0, level)) {
    ellipse(ctx, s * bx, s * by, s * r, s * r * 0.72, hitColour);
    ellipse(ctx, s * (bx + r * 0.7), s * (by - r * 0.3), s * r * 0.3, s * r * 0.25, hitColour);
  }
  face(ctx, c.id, s, { level, time }, art);
  teamMark(ctx, -s * 0.32, -s * 0.12, s * 0.052, team, art);
  if (wiping) drawMop(ctx, s, art, time);
  ctx.restore();
}
