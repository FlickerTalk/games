import { PROFILES, colourOf } from "./cast.js";
import { drawAvatar, finite, given } from "./face.js";
import { playerName } from "./player.js";
import { CREAM, INK, circle, line, paint, polygon, roundedRect } from "./pen.js";

const PAGE = "#FFFDF5";
const TILES = ["#FFF8E8", "#EDF5EF", "#EEF3F7"];
const YELLOW = "#FFCF3F";
const CORAL = "#F26B5E";
const STAGE = "#E8E1F2";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function tile(ctx, area, fill, selected) {
  if (selected) {
    roundedRect(ctx, area.x + 3, area.y + 3, area.w, area.h, 16);
    paint(ctx, INK, null);
  }
  roundedRect(ctx, area.x, area.y, area.w, area.h, 16);
  paint(ctx, selected ? YELLOW : fill, INK, 2);
}

function text(ctx, words, x, y, size, most = Infinity) {
  let px = size;
  ctx.font = `800 ${px}px ${FONT}`;
  while (px > 11 && ctx.measureText(words).width > most) {
    px -= 1;
    ctx.font = `800 ${px}px ${FONT}`;
  }
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(words, x, y);
}

function profiles(ctx, layout, time) {
  text(ctx, layout.title.text, layout.title.x, layout.title.y, 22, layout.width - 24);
  layout.targets.forEach((target, at) => {
    tile(ctx, target, TILES[at % TILES.length], target.selected);
    const size = Math.min(target.w, target.h) * 0.58;
    drawAvatar(ctx, target.x + target.w / 2, target.y + target.h * 0.42, size, { who: target.value, hair: "none", face: "happy", time });
    const name = PROFILES.find((one) => one.id === target.value).name;
    text(ctx, name, target.x + target.w / 2, target.y + target.h * 0.84, 13, target.w - 8);
  });
}

function arrow(ctx, area, rtl) {
  const turn = rtl ? -1 : 1;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  line(ctx, [[cx + 14 * turn, cy], [cx - 14 * turn, cy]], INK, 4);
  line(ctx, [[cx - 2 * turn, cy - 12], [cx - 14 * turn, cy], [cx - 2 * turn, cy + 12]], INK, 4);
}

function tick(ctx, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  line(ctx, [[cx - 16, cy + 1], [cx - 5, cy + 12], [cx + 17, cy - 12]], INK, 5);
}

function pencil(ctx, x, y) {
  polygon(ctx, [[x - 7, y + 7], [x - 6, y + 2], [x + 4, y - 8], [x + 8, y - 4], [x - 2, y + 6]], CREAM, INK, 1.8);
  line(ctx, [[x + 1, y - 5], [x + 5, y - 1]], INK, 1.8);
}

function nameTag(ctx, target, choice) {
  roundedRect(ctx, target.x, target.y, target.w, target.h, 14);
  paint(ctx, PAGE, INK, 2);
  const centre = target.y + target.h / 2;
  text(ctx, playerName(choice), target.x + target.w / 2 - 10, centre, 20, target.w - 64);
  pencil(ctx, target.x + target.w - 26, centre);
}

function stripItems(ctx, layout, kind, draw) {
  const strip = layout.strips.find((one) => one.kind === kind);
  ctx.save();
  ctx.beginPath();
  ctx.rect(strip.x - 4, strip.y - 4, strip.w + 8, strip.h + 8);
  ctx.clip();
  for (const target of layout.targets.filter((one) => one.strip === kind && one.visible)) {
    tile(ctx, target, TILES[0], target.selected);
    draw(target);
  }
  ctx.restore();
}

function look(ctx, layout, state, { time, rtl }) {
  const { choice } = state;
  const { preview } = layout;
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  circle(ctx, preview.x + preview.w / 2, preview.y + preview.h / 2, preview.size * 0.62, STAGE, null);
  drawAvatar(ctx, preview.x + preview.w / 2, preview.y + preview.h / 2, preview.size, { ...choice, face: "happy", time });
  tile(ctx, at("back"), TILES[0], false);
  arrow(ctx, at("back"), rtl);
  tile(ctx, at("done"), CORAL, false);
  tick(ctx, at("done"));
  nameTag(ctx, at("rename"), choice);
  stripItems(ctx, layout, "hair", (target) =>
    drawAvatar(ctx, target.x + target.w / 2, target.y + target.h / 2, target.w * 0.7, { ...choice, hair: target.value, face: "neutral" }),
  );
  stripItems(ctx, layout, "colour", (target) => circle(ctx, target.x + target.w / 2, target.y + target.h / 2, target.w * 0.3, colourOf(target.value).colour, INK, 2));
}

export function drawPick(ctx, layout, state, options) {
  const chosen = given(options);
  const time = finite(chosen.time);
  const rtl = String(chosen.lang || "en").split("-")[0] === "ar";
  ctx.save();
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (layout.step === "look") look(ctx, layout, state, { time, rtl });
  else profiles(ctx, layout, time);
  ctx.restore();
}
