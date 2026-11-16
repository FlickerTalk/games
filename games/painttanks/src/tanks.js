import { clamp, ellipse, line, paint, polygon, roundedRect } from "../../../kit/src/canvas/pen.js";

export const TANKS = Object.freeze([
  { id: "round", body: "player", light: "playerLight", dark: "playerDark" },
  { id: "long", body: "azure", light: "glass", dark: "azureDark" },
  { id: "tall", body: "coral", light: "cork", dark: "coralDark" },
  { id: "balloon", body: "mint", light: "grassLight", dark: "mintDark" },
  { id: "snail", body: "rose", light: "roseLight", dark: "roseDark" },
  { id: "wooden", body: "wood", light: "woodLight", dark: "trunk" },
]);

export function coloursOf(list, id, art) {
  const found = list.find((one) => one.id === id) ?? list[0];
  return { id: found.id, body: art[found.body], light: art[found.light], dark: art[found.dark] };
}

function track(ctx, s, colours, art, wooden) {
  const y = -s * 0.18;
  roundedRect(ctx, -s * 0.43, y - s * 0.1, s * 0.86, s * 0.22, s * 0.1);
  paint(ctx, wooden ? colours.dark : art.tire, art.ink, s * 0.035);
  for (let wheel = -2; wheel <= 2; wheel += 1) {
    ellipse(ctx, wheel * s * 0.155, y, s * 0.075, s * 0.075, wooden ? art.woodLight : art.hub, art.ink, s * 0.025);
    ellipse(ctx, wheel * s * 0.155, y, s * 0.024, s * 0.024, wooden ? art.wood : art.white);
  }
}

function balloonWheels(ctx, s, colours, art, time) {
  line(ctx, [[-s * 0.28, -s * 0.18], [s * 0.28, -s * 0.18]], art.ink, s * 0.05);
  for (let side = -1; side <= 1; side += 2) {
    const y = -s * 0.1 + Math.sin(time * 2 + side) * s * 0.012;
    ellipse(ctx, side * s * 0.3, y, s * 0.13, s * 0.15, colours.light, art.ink, s * 0.035);
    line(ctx, [[side * s * 0.34, y - s * 0.06], [side * s * 0.28, y + s * 0.05]], colours.dark, s * 0.018);
  }
}

function body(ctx, variant, s, colours, art) {
  const width = s * (variant === "long" ? 0.88 : 0.72);
  roundedRect(ctx, -width / 2, -s * 0.43, width, s * 0.26, s * 0.09);
  paint(ctx, colours.body, art.ink, s * 0.035);
  roundedRect(ctx, -width * 0.38, -s * 0.4, width * 0.52, s * 0.065, s * 0.025);
  paint(ctx, colours.light);
  if (variant !== "wooden") return;
  line(ctx, [[-s * 0.24, -s * 0.27], [s * 0.2, -s * 0.27]], colours.dark, s * 0.018);
  ellipse(ctx, s * 0.22, -s * 0.35, s * 0.035, s * 0.022, null, colours.dark, s * 0.018);
}

function turretOf(variant, s) {
  if (variant === "tall") return { x: 0, y: -s * 0.63, r: s * 0.23 };
  if (variant === "snail") return { x: -s * 0.03, y: -s * 0.53, r: s * 0.28 };
  return { x: 0, y: -s * 0.5, r: s * (variant === "long" ? 0.19 : 0.23) };
}

function turret(ctx, variant, s, colours, art) {
  const { x, y, r } = turretOf(variant, s);
  if (variant === "tall") {
    roundedRect(ctx, -s * 0.19, -s * 0.78, s * 0.38, s * 0.4, s * 0.11);
    paint(ctx, colours.body, art.ink, s * 0.035);
    roundedRect(ctx, -s * 0.13, -s * 0.73, s * 0.16, s * 0.07, s * 0.025);
    paint(ctx, colours.light);
    return;
  }
  if (variant === "long") {
    roundedRect(ctx, -s * 0.25, -s * 0.61, s * 0.5, s * 0.24, s * 0.11);
    paint(ctx, colours.body, art.ink, s * 0.035);
    return;
  }
  ellipse(ctx, x, y, r, r * 0.84, colours.body, art.ink, s * 0.035);
  ctx.beginPath();
  if (variant === "snail") {
    ctx.arc(x, y, r * 0.63, 0.2, Math.PI * 2.05);
    ctx.arc(x, y, r * 0.3, Math.PI * 2.05, 0.2, true);
  } else ctx.arc(x, y, r * 0.72, Math.PI * 1.12, Math.PI * 1.72);
  ctx.strokeStyle = variant === "snail" ? colours.dark : colours.light;
  ctx.lineWidth = s * (variant === "snail" ? 0.035 : 0.055);
  ctx.lineCap = "round";
  ctx.stroke();
}

export function barrel(ctx, { origin, length, angle, direction, s, thick }, colours, art) {
  const dx = Math.cos(angle) * direction;
  const dy = -Math.sin(angle);
  const start = [origin.x + dx * s * 0.08, origin.y + dy * s * 0.08];
  const end = [origin.x + dx * length, origin.y + dy * length];
  line(ctx, [start, end], art.ink, s * thick);
  line(ctx, [start, end], colours.dark, s * thick * 0.57);
  ctx.save();
  ctx.translate(...end);
  ctx.rotate(Math.atan2(dy, dx));
  roundedRect(ctx, -s * 0.025, -s * 0.105, s * 0.09, s * 0.21, s * 0.035);
  paint(ctx, art.cork, art.ink, s * 0.025);
  ctx.restore();
}

export function teamMark(ctx, x, y, r, team, art) {
  if (team === 0) ellipse(ctx, x, y, r, r, art.player, art.ink, r * 0.28);
  else polygon(ctx, [[x, y - r * 1.15], [x + r * 1.08, y], [x, y + r * 1.15], [x - r * 1.08, y]], art.rival, art.ink, r * 0.28);
}

export function blot(ctx, x, y, r, colour) {
  ellipse(ctx, x, y, r, r * 0.72, colour);
  ellipse(ctx, x - r * 0.75, y + r * 0.15, r * 0.28, r * 0.25, colour);
  ellipse(ctx, x + r * 0.68, y - r * 0.32, r * 0.24, r * 0.3, colour);
  ellipse(ctx, x + r * 0.2, y + r * 0.7, r * 0.18, r * 0.32, colour);
}

const COATS = [[-0.15, -0.53, 0.14], [0.22, -0.31, 0.17], [-0.24, -0.25, 0.16]];

function face(ctx, variant, s, { hitLevel, wiping, time }, art) {
  const turretAt = turretOf(variant, s);
  const y = variant === "tall" ? -s * 0.61 : turretAt.y - s * 0.015;
  const gap = s * 0.075;
  for (let side = -1; side <= 1; side += 2) {
    ellipse(ctx, side * gap, y, s * 0.052, s * 0.065, art.white, art.ink, s * 0.018);
    ellipse(ctx, side * gap + s * 0.008, y + s * 0.008, s * 0.018, s * (hitLevel >= 3 ? 0.012 : 0.026), art.ink);
  }
  ctx.beginPath();
  if (hitLevel >= 3) ctx.arc(0, y + s * 0.11, s * 0.035, 0, Math.PI * 2);
  else ctx.arc(0, y + s * 0.055, s * 0.07, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = art.ink;
  ctx.lineWidth = s * 0.022;
  ctx.lineCap = "round";
  ctx.stroke();
  if (!wiping) return;
  const sweep = Math.sin(time * 12) * s * 0.055;
  for (let side = -1; side <= 1; side += 2) {
    line(ctx, [[side * gap - s * 0.045, y + s * 0.075], [side * gap + sweep, y - s * 0.075]], art.ink, s * 0.022);
    ellipse(ctx, side * gap - s * 0.045, y + s * 0.075, s * 0.025, s * 0.025, art.hub, art.ink, s * 0.012);
  }
}

export function drawTank(ctx, x, y, s, art, options = {}) {
  const { variant = "round", team = 0, angle = 0.55, direction = team === 0 ? 1 : -1, recoil = 0, hitLevel = 0, wiping = false, time = 0, ghost = false, idle = true } = options;
  const hitColour = options.hitColour ?? (team === 0 ? art.rival : art.player);
  const colours = coloursOf(TANKS, variant, art);
  const kick = clamp(recoil);
  const bob = idle ? Math.sin(time * 2.2 + team) * s * 0.012 : 0;
  ctx.save();
  ctx.translate(x - Math.cos(angle) * direction * kick * s * 0.05, y + bob);
  if (ghost) ctx.globalAlpha *= 0.42;
  if (colours.id === "balloon") balloonWheels(ctx, s, colours, art, time);
  else track(ctx, s, colours, art, colours.id === "wooden");
  body(ctx, colours.id, s, colours, art);
  const length = s * (colours.id === "long" ? 0.58 : 0.48) * (1 - kick * 0.22);
  barrel(ctx, { origin: turretOf(colours.id, s), length, angle: clamp(angle, 0.08, 1.48), direction, s, thick: 0.15 }, colours, art);
  turret(ctx, colours.id, s, colours, art);
  const level = clamp(Math.round(hitLevel), 0, 3);
  COATS.slice(0, level).forEach(([bx, by, r]) => blot(ctx, s * bx, s * by, s * r, hitColour));
  face(ctx, colours.id, s, { hitLevel: level, wiping, time }, art);
  teamMark(ctx, 0, -s * 0.3, s * 0.065, team, art);
  ctx.restore();
}
