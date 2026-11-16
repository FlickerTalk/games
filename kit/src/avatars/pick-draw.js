import { PROFILES, colourOf } from "./cast.js";
import { drawAvatar, finite, given } from "./face.js";
import { playerName } from "./player.js";
import { INK, circle, line, paint, polygon, roundedRect } from "./pen.js";
import { themeFromTokens } from "../canvas/theme.js";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const held = (state, target) => Boolean(state.press && !state.press.moved && state.press.target?.kind === target.kind && state.press.target?.value === target.value);

function tile(ctx, area, ui, { chosen = false, pressed = false, primary = false } = {}) {
  roundedRect(ctx, area.x, area.y, area.w, area.h, ui.radius);
  const fill = pressed ? ui.pressed : primary ? ui.accent : ui.surface;
  paint(ctx, fill, chosen || pressed || primary ? ui.accent : ui.border, chosen ? ui.line * 2 : ui.line);
}

function text(ctx, words, x, y, size, ui, most = Infinity) {
  let px = size;
  ctx.font = `800 ${px}px ${FONT}`;
  while (px > 11 && ctx.measureText(words).width > most) {
    px -= 1;
    ctx.font = `800 ${px}px ${FONT}`;
  }
  ctx.fillStyle = ui.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(words, x, y);
}

function profileTile(ctx, target, state, ui, time) {
  tile(ctx, target, ui, { chosen: target.selected, pressed: held(state, target) });
  const size = Math.min(target.w, target.h) * 0.58;
  drawAvatar(ctx, target.x + target.w / 2, target.y + target.h * 0.42, size, { who: target.value, hair: "none", face: "happy", time });
  const name = PROFILES.find((one) => one.id === target.value).name;
  text(ctx, name, target.x + target.w / 2, target.y + target.h * 0.84, 13, ui, target.w - 8);
}

function profiles(ctx, layout, state, ui, time) {
  text(ctx, layout.title.text, layout.title.x, layout.title.y, 22, ui, layout.width - 24);
  if (layout.strips.length) stripItems(ctx, layout, "profile", (target) => profileTile(ctx, target, state, ui, time));
  else for (const target of layout.targets) profileTile(ctx, target, state, ui, time);
}

function arrow(ctx, area, rtl, colour) {
  const turn = rtl ? -1 : 1;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  line(ctx, [[cx + 14 * turn, cy], [cx - 14 * turn, cy]], colour, 4);
  line(ctx, [[cx - 2 * turn, cy - 12], [cx - 14 * turn, cy], [cx - 2 * turn, cy + 12]], colour, 4);
}

function tick(ctx, area, colour) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  line(ctx, [[cx - 16, cy + 1], [cx - 5, cy + 12], [cx + 17, cy - 12]], colour, 5);
}

function pencil(ctx, x, y, ui) {
  polygon(ctx, [[x - 7, y + 7], [x - 6, y + 2], [x + 4, y - 8], [x + 8, y - 4], [x - 2, y + 6]], null, ui.muted, 1.8);
  line(ctx, [[x + 1, y - 5], [x + 5, y - 1]], ui.muted, 1.8);
}

function nameTag(ctx, target, state, ui) {
  const pressed = held(state, target);
  roundedRect(ctx, target.x, target.y, target.w, target.h, ui.radius);
  paint(ctx, pressed ? ui.pressed : ui.page, pressed ? ui.accent : ui.border, ui.line);
  const centre = target.y + target.h / 2;
  text(ctx, playerName(state.choice), target.x + target.w / 2 - 10, centre, 20, ui, target.w - 64);
  pencil(ctx, target.x + target.w - 26, centre, ui);
}

function stripItems(ctx, layout, kind, draw) {
  const strip = layout.strips.find((one) => one.kind === kind);
  ctx.save();
  ctx.beginPath();
  ctx.rect(strip.x - 4, strip.y - 4, strip.w + 8, strip.h + 8);
  ctx.clip();
  for (const target of layout.targets.filter((one) => one.strip === kind && one.visible)) draw(target);
  ctx.restore();
}

function look(ctx, layout, state, ui, { time, rtl }) {
  const { choice } = state;
  const { preview } = layout;
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  const option = (target) => tile(ctx, target, ui, { chosen: target.selected, pressed: held(state, target) });
  circle(ctx, preview.x + preview.w / 2, preview.y + preview.h / 2, preview.size * 0.62, ui.surface2, null);
  drawAvatar(ctx, preview.x + preview.w / 2, preview.y + preview.h / 2, preview.size, { ...choice, face: "happy", time });
  option(at("back"));
  arrow(ctx, at("back"), rtl, ui.text);
  const done = held(state, at("done"));
  tile(ctx, at("done"), ui, { primary: true, pressed: done });
  tick(ctx, at("done"), done ? ui.accent : ui.onAccent);
  nameTag(ctx, at("rename"), state, ui);
  stripItems(ctx, layout, "hair", (target) => {
    option(target);
    drawAvatar(ctx, target.x + target.w / 2, target.y + target.h / 2, target.w * 0.7, { ...choice, hair: target.value, face: "neutral" });
  });
  stripItems(ctx, layout, "colour", (target) => {
    option(target);
    circle(ctx, target.x + target.w / 2, target.y + target.h / 2, target.w * 0.3, colourOf(target.value).colour, INK, 2);
  });
}

export function drawPick(ctx, layout, state, options) {
  const chosen = given(options);
  const time = finite(chosen.time);
  const rtl = String(chosen.lang || "en").split("-")[0] === "ar";
  ctx.save();
  const ui = chosen.ui ?? themeFromTokens(null);
  ctx.fillStyle = ui.page;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (layout.step === "look") look(ctx, layout, state, ui, { time, rtl });
  else profiles(ctx, layout, state, ui, time);
  ctx.restore();
}
