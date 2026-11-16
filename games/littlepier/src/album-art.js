import { DIGITS, drawDigits, drawSoundButtons, drawVolumeLine, formatNumber } from "../../../kit/src/canvas/bar.js";
import { drawRoundButton } from "../../../kit/src/canvas/buttons.js";
import { centreOf } from "../../../kit/src/canvas/layout.js";
import { circle, paint, roundedRect } from "../../../kit/src/canvas/pen.js";
import { drawCreature } from "./creatures.js";
import { albumLayout } from "./layout.js";
import { CREATURES } from "./pond.js";

const isPressed = (press, target) => Boolean(press && press.kind === target.kind && press.value === target.value);

export function drawAlbumBadge(ctx, area, count, theme, time, lang = "en") {
  const { ui } = theme;
  ctx.save();
  roundedRect(ctx, area.x + 2, area.y + 2, area.w - 4, area.h - 4, 10);
  paint(ctx, ui.surface2, ui.border, ui.line);
  drawCreature(ctx, area.x + area.w / 2, area.y + area.h * 0.32, area.w * 0.46, 0, theme, { time, smile: true });
  drawDigits(ctx, formatNumber(count, lang), area.x + area.w / 2, area.y + area.h * 0.74, DIGITS.best, ui.text, "center");
  ctx.restore();
}

function sticker(ctx, cell, kind, met, theme, time) {
  const [x, y] = centreOf(cell);
  const size = cell.w * 0.78;
  if (met) {
    circle(ctx, x, y, cell.w * 0.44, theme.ui.surface2, theme.ui.border, theme.ui.line);
    drawCreature(ctx, x, y, size, kind, theme, { time, smile: true });
  } else {
    drawCreature(ctx, x, y, size, kind, theme, { silhouette: true });
  }
}

export function drawAlbum(ctx, state, theme, time) {
  const { width, height, fill, album, sound, press, lang } = state;
  const { ui } = theme;
  const layout = albumLayout(width, height, { fill });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  ctx.save();
  ctx.fillStyle = ui.page;
  ctx.fillRect(0, 0, width, height);
  const { page } = layout;
  roundedRect(ctx, page.x, page.y, page.w, page.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  CREATURES.forEach((_, kind) => sticker(ctx, layout.cells[kind], kind, album.includes(kind), theme, time));
  const words = `${formatNumber(album.length, lang)}/${formatNumber(CREATURES.length, lang)}`;
  drawDigits(ctx, words, width / 2, 8 + 44, DIGITS.score, ui.text, "center");
  const done = at("done");
  drawRoundButton(ctx, "check", ...centreOf(done), done.w - 8, ui, { primary: true, pressed: isPressed(press, done) });
  drawSoundButtons(ctx, { speaker: at("speaker"), music: at("music") }, sound, ui, { press });
  if (sound.open && state.layout?.volume) drawVolumeLine(ctx, state.layout.volume, sound.volume, ui, { pressed: press?.kind === "volume" });
  ctx.restore();
}
