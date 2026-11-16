import { drawAvatar } from "../avatars/index.js";
import { drawPortrait, drawSoundButtons, drawVolumeLine } from "./bar.js";
import { drawMark, drawRoundButton } from "./buttons.js";
import { box, centreOf } from "./layout.js";
import { clamp, ellipse, line, paint, polygon, roundedRect } from "./pen.js";

const SOUND = new Set(["speaker", "music"]);
const isPressed = (press, target) => Boolean(press && press.kind === target.kind && press.value === target.value);

export function drawCard(ctx, area, ui, { chosen = false, pressed = false, radius = ui.radius } = {}) {
  roundedRect(ctx, area.x + 3, area.y + 3, area.w - 6, area.h - 6, radius);
  paint(ctx, pressed ? ui.pressed : ui.surface, chosen || pressed ? ui.accent : ui.border, chosen ? ui.line * 2 : ui.line);
}

function stageBand(layout, width) {
  const sound = layout.targets.filter((target) => SOUND.has(target.kind));
  const strip = Math.max(0, ...sound.map((target) => target.y + target.h)) + 8;
  const rest = layout.targets.filter((target) => !SOUND.has(target.kind) && target.y >= strip);
  const first = rest.length ? Math.min(...rest.map((target) => target.y)) - 8 : layout.height ?? strip;
  return box(0, strip, width, Math.max(0, first - strip));
}

function seatArt(ctx, area, seat, ui, time, pressed) {
  drawCard(ctx, area, ui, { pressed });
  const [x, y] = centreOf(area);
  ctx.save();
  if (seat.away) ctx.globalAlpha = 0.45;
  drawPortrait(ctx, x, y, area.w * 0.68, { player: seat.player, thinking: seat.calling, face: seat.here ? "happy" : "neutral" }, ui, { time });
  ctx.restore();
  if (seat.here) drawMark(ctx, "check", area.x + area.w - 20, area.y + 20, 36, ui);
  else if (!seat.calling) drawRoundButton(ctx, "call", area.x + area.w - 22, area.y + 22, 40, ui);
}

function homeTarget(ctx, target, state, ui, time, { seat, drawVariant }) {
  const [x, y] = centreOf(target);
  const size = Math.min(target.w, target.h);
  const pressed = isPressed(state.press, target);
  if (target.kind === "avatar") {
    drawCard(ctx, target, ui, { pressed, radius: size / 2 });
    drawAvatar(ctx, x, y + size * 0.05, size * 0.66, { ...state.player, face: "happy", time });
  } else if (target.kind === "looks") drawRoundButton(ctx, "looks", x, y, size - 8, ui, { pressed });
  else if (target.kind === "variant") {
    const chosen = state.variant === target.value;
    drawCard(ctx, target, ui, { chosen, pressed });
    drawVariant(ctx, target, { chosen, time });
  } else if (target.kind === "rival" && seat) seatArt(ctx, target, seat, ui, time, pressed);
  else if (target.kind === "play") drawRoundButton(ctx, "play", x, y, size, ui, { primary: true, pressed });
}

export function drawHome(ctx, state, ui, time, { layout, seat = null, volume = null, drawStage, drawVariant = () => {} }) {
  const { width, sound, press = null } = state;
  ctx.save();
  drawStage(ctx, stageBand({ ...layout, height: state.height }, width));
  for (const target of layout.targets) homeTarget(ctx, target, state, ui, time, { seat, drawVariant });
  const at = (kind) => layout.targets.find((target) => target.kind === kind);
  drawSoundButtons(ctx, { speaker: at("speaker"), music: at("music") }, sound, ui, { press });
  if (sound.open && volume) drawVolumeLine(ctx, volume, sound.volume, ui, { pressed: press?.kind === "volume" });
  ctx.restore();
}

export function drawPresent(ctx, { x, y, w, h }, shake, look) {
  const width = Math.max(1.5, w * 0.025);
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  ctx.rotate(Math.sin(clamp(shake) * Math.PI * 4) * 0.12 * (1 - clamp(shake)));
  ctx.translate(-w / 2, -h);
  roundedRect(ctx, w * 0.1, h * 0.3, w * 0.8, h * 0.66, w * 0.08);
  paint(ctx, look.box, look.ink, width);
  roundedRect(ctx, w * 0.04, h * 0.2, w * 0.92, h * 0.18, w * 0.05);
  paint(ctx, look.lid, look.ink, width);
  ctx.fillStyle = look.ribbon;
  ctx.fillRect(w * 0.43, h * 0.22, w * 0.14, h * 0.72);
  ellipse(ctx, w * 0.38, h * 0.13, w * 0.15, h * 0.09, look.ribbon, look.ink, width);
  ellipse(ctx, w * 0.62, h * 0.13, w * 0.15, h * 0.09, look.ribbon, look.ink, width);
  line(ctx, [[w * 0.5, h * 0.2], [w * 0.5, h * 0.12]], look.ink, width);
  ctx.restore();
}

function lookTarget(ctx, target, state, ui, time, options) {
  const { kind, looks, owned, chosen, shake, drawLook, drawTab, drawWrapped } = options;
  const pressed = isPressed(state.press, target);
  if (target.kind === "done") drawRoundButton(ctx, "check", ...centreOf(target), target.w - 8, ui, { primary: true, pressed });
  if (target.kind === "tab") {
    drawCard(ctx, target, ui, { chosen: kind === target.value, pressed });
    drawTab(ctx, target, target.value, time);
  }
  if (target.kind !== "look") return;
  const look = looks[target.value];
  const picked = chosen === look;
  drawCard(ctx, target, ui, { chosen: picked, pressed });
  if (owned.includes(look)) drawLook(ctx, target, look, time);
  else drawWrapped(ctx, box(target.x + target.w * 0.18, target.y + target.h * 0.14, target.w * 0.64, target.h * 0.68), shake(target.value));
  if (picked) drawMark(ctx, "check", target.x + target.w - 18, target.y + 18, 32, ui);
}

export function drawLooks(ctx, state, ui, time, options) {
  ctx.save();
  ctx.fillStyle = ui.page;
  ctx.fillRect(0, 0, state.width, state.height);
  for (const target of options.layout.targets) lookTarget(ctx, target, state, ui, time, options);
  ctx.restore();
}

function shade(ctx, { width, height }, ui) {
  ctx.fillStyle = ui.shade;
  ctx.fillRect(0, 0, width, height);
}

export function drawPause(ctx, state, ui, { layout }) {
  ctx.save();
  shade(ctx, state, ui);
  for (const target of layout.targets) {
    const resume = target.kind === "resume";
    drawRoundButton(ctx, resume ? "play" : "home", ...centreOf(target), Math.min(target.w, target.h) - (resume ? 0 : 8), ui, { primary: resume, pressed: isPressed(state.press, target) });
  }
  ctx.restore();
}

export function drawPrompt(ctx, state, ui, time, { layout, player }) {
  const { card } = layout;
  ctx.save();
  shade(ctx, state, ui);
  roundedRect(ctx, card.x, card.y, card.w, card.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  drawPortrait(ctx, card.x + card.w / 2, card.y + Math.min(52, card.h * 0.3), Math.min(72, card.h * 0.45), { player, face: "happy" }, ui, { time });
  for (const target of layout.targets) {
    const accept = target.kind === "accept";
    drawRoundButton(ctx, accept ? "check" : "close", ...centreOf(target), target.w - 8, ui, { primary: accept, pressed: isPressed(state.press, target) });
  }
  ctx.restore();
}

export function drawHintHand(ctx, x, y, size, progress, ui) {
  const press = 0.92 + Math.sin(clamp(progress) * Math.PI * 2) * 0.08;
  const width = Math.max(ui.line, size * 0.045);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(press, press);
  ellipse(ctx, 0, 0, size * 0.3, size * 0.3, ui.halo);
  roundedRect(ctx, -size * 0.11, -size * 0.04, size * 0.24, size * 0.55, size * 0.11);
  paint(ctx, ui.paper, ui.ink, width);
  roundedRect(ctx, -size * 0.08, -size * 0.45, size * 0.17, size * 0.51, size * 0.085);
  paint(ctx, ui.paper, ui.ink, width);
  for (let finger = 0; finger < 3; finger += 1) {
    roundedRect(ctx, size * (0.08 + finger * 0.08), size * (0.06 + finger * 0.025), size * 0.12, size * 0.32, size * 0.06);
    paint(ctx, ui.paper, ui.ink, Math.max(1.5, size * 0.035));
  }
  polygon(ctx, [[-size * 0.12, size * 0.42], [size * 0.25, size * 0.42], [size * 0.3, size * 0.68], [-size * 0.18, size * 0.68]], ui.accent, ui.ink, width);
  ctx.restore();
}
