import { standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawCard, drawHome, drawMark, drawPresent, drawRoundButton, drawVolumeLine, homeLayout } from "../../../kit/src/canvas/index.js";
import { clamp, ease, hash, paint, roundedRect, starPath, withRim } from "../../../kit/src/canvas/pen.js";
import { PAGE_H, PAGE_W } from "./geometry.js";
import { openPages } from "./levels.js";
import { drawItems, drawPage, drawSheet } from "./page-art.js";
import { PAGE_ORDER, pageOf } from "./pages.js";
import { variantsOf } from "./screens.js";
import { drawBar } from "./screen-art.js";
import { GLYPHS, drawMarker } from "./tools-art.js";

const FLICK = Object.freeze({ who: "flick" });
const EXAMPLE = Object.freeze({ fills: {}, items: [] });

const suggested = (page) => Object.fromEntries(page.regions.map((region, zone) => [zone, String(region.s)]));

function fitIn(area, pad = 0) {
  const scale = Math.max(0, Math.min((area.w - 2 * pad) / PAGE_W, (area.h - 2 * pad) / PAGE_H));
  return { x: area.x + (area.w - PAGE_W * scale) / 2, y: area.y + (area.h - PAGE_H * scale) / 2, w: PAGE_W * scale, h: PAGE_H * scale, scale };
}

export function drawPicture(ctx, picture, box, theme) {
  if (picture.kind === "free") {
    drawSheet(ctx, box, theme.art.papers[picture.drawing.paper], theme);
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.scale(box.scale, box.scale);
    ctx.beginPath();
    ctx.rect(0, 0, PAGE_W, PAGE_H);
    ctx.clip();
    drawItems(ctx, picture.drawing.items, theme);
    ctx.restore();
    return;
  }
  const work = picture.work ?? EXAMPLE;
  drawPage(ctx, pageOf(picture.page), box, theme, { fills: work.fills, items: work.items, dots: false });
}

function variantArt(ctx, area, value, theme) {
  const box = fitIn(area, 12);
  if (value === "free") {
    drawPicture(ctx, { kind: "free", drawing: { paper: "light", items: [{ k: "l", p: 1, w: 2, m: 1, pts: [40, 210, 90, 150, 130, 220] }, { k: "s", t: 0, p: 3, x: 90, y: 90, m: 1 }] } }, box, theme);
    return;
  }
  const page = pageOf(value === "together" ? "castle" : "flower");
  const fills = suggested(page);
  if (value === "together") for (const zone of Object.keys(fills)) if (Number(zone) % 2) delete fills[zone];
  drawPage(ctx, page, box, theme, { fills, dots: false });
  if (value === "together") {
    drawMarker(ctx, box.x + box.w * 0.3, box.y + box.h * 0.55, box.w * 0.32, false, theme);
    drawMarker(ctx, box.x + box.w * 0.72, box.y + box.h * 0.45, box.w * 0.32, true, theme);
  }
}

function seatOf(game) {
  const { state, duo } = game;
  if (state.mode === "flick") return { player: FLICK, here: true, calling: false, away: false };
  if (state.mode !== "friend" || !duo) return null;
  const { here, calling, away } = duo.status;
  return { player: standIn(state.player), here, calling, away };
}

function stage(ctx, band, theme) {
  if (band.h < 110 || band.w < 120) return;
  const page = pageOf("cat");
  drawPage(ctx, page, fitIn({ x: band.x, y: band.y + 8, w: band.w, h: band.h - 16 }), theme, { fills: suggested(page), dots: false });
}

export function drawHomeScreen(ctx, game, theme, time) {
  const { state } = game;
  const layout = homeLayout(state.width, state.height, { variants: variantsOf(state), rival: state.mode !== "alone", fill: state.fill });
  drawHome(ctx, state, theme.ui, time, {
    layout,
    seat: seatOf(game),
    volume: state.layout?.volume,
    drawStage: (pen, band) => stage(pen, band, theme),
    drawVariant: (pen, target) => variantArt(pen, target, target.value, theme),
  });
}

function shakeOf(state, id, time) {
  const moment = state.moments.find((one) => one.kind === "shake" && one.id === id);
  return moment ? clamp((time * 1000 - moment.start) / moment.duration) : 0;
}

function cover(ctx, tile, colour, theme) {
  withRim(ctx, { ink: theme.art.ink, colour: theme.art.rim }, () => {
    roundedRect(ctx, tile.x + 2, tile.y + 2, tile.w - 4, tile.h - 4, theme.ui.radius);
    paint(ctx, colour, theme.art.ink, 2.5);
  });
}

export function drawShelf(ctx, game, theme, time) {
  const { state } = game;
  const owned = openPages(state.progress);
  for (const tile of state.layout.tiles) {
    const id = PAGE_ORDER[tile.value];
    const page = pageOf(id);
    const pressed = state.press?.kind === "tile" && state.press.value === id;
    if (!owned.includes(id)) {
      drawCard(ctx, tile, theme.ui, { pressed });
      drawPresent(ctx, { x: tile.x + tile.w * 0.15, y: tile.y + tile.h * 0.2, w: tile.w * 0.7, h: tile.h * 0.6 }, shakeOf(state, id, time), theme.art.present);
      continue;
    }
    cover(ctx, pressed ? { x: tile.x + 3, y: tile.y + 3, w: tile.w - 6, h: tile.h - 6 } : tile, theme.art.books[page.book], theme);
    drawPicture(ctx, { kind: "page", page: id, work: state.thumbs?.[id] }, fitIn(tile, 10), theme);
    if (state.done.includes(id)) drawMark(ctx, "check", tile.x + tile.w - 16, tile.y + 16, 30, theme.ui);
  }
  drawBar(ctx, game, theme, time);
}

export function drawGallery(ctx, game, theme, time) {
  const { state } = game;
  if (!state.layout.tiles.length) {
    const box = fitIn({ x: state.width / 2 - 60, y: state.height / 2 - 70, w: 120, h: 140 });
    drawCard(ctx, { x: box.x - 10, y: box.y - 10, w: box.w + 20, h: box.h + 20 }, theme.ui);
  }
  for (const tile of state.layout.tiles) {
    const picture = state.pictures[tile.value];
    const pressed = state.press?.kind === "tile" && state.press.value === tile.value;
    cover(ctx, pressed ? { x: tile.x + 3, y: tile.y + 3, w: tile.w - 6, h: tile.h - 6 } : tile, theme.art.frames[tile.value % theme.art.frames.length], theme);
    if (picture) drawPicture(ctx, picture, fitIn(tile, 12), theme);
  }
  drawBar(ctx, game, theme, time);
}

function confetti(ctx, area, progress, theme) {
  const colours = theme.art.confetti;
  ctx.save();
  ctx.globalAlpha = progress > 0.78 ? (1 - progress) / 0.22 : 1;
  for (let at = 0; at < 32; at += 1) {
    const size = 5 + hash(at + 80) * 6;
    ctx.save();
    ctx.translate(area.x + hash(at + 2) * area.w, area.y - 30 + progress * (area.h + 60) + hash(at + 40) * 40);
    ctx.rotate(progress * 5 + at);
    if (at % 4 === 0) starPath(ctx, 0, 0, size);
    else roundedRect(ctx, -size / 2, -size / 3, size, size * 0.66, 2);
    paint(ctx, colours[at % colours.length]);
    ctx.restore();
  }
  ctx.restore();
}

function present(ctx, area, picture, theme, time) {
  if (!picture.opened) {
    drawPresent(ctx, area, (time % 2) / 2, theme.art.present);
    return;
  }
  drawCard(ctx, area, theme.ui, { chosen: true });
  drawPicture(ctx, { kind: "page", page: picture.gift }, fitIn(area, 10), theme);
}

export function drawPictureScreen(ctx, game, theme, time) {
  const { state } = game;
  const { layout, picture } = state;
  const party = state.moments.find((one) => one.kind === "confetti");
  const progress = party ? clamp((time * 1000 - party.start) / party.duration) : 1;
  const grow = 0.85 + 0.15 * ease(progress * 2.5);
  const frame = { x: layout.picture.x - 10, y: layout.picture.y - 10, w: layout.picture.w + 20, h: layout.picture.h + 20 };
  ctx.save();
  ctx.translate(...centreOf(frame));
  ctx.scale(grow, grow);
  ctx.translate(-centreOf(frame)[0], -centreOf(frame)[1]);
  cover(ctx, frame, theme.art.frames[0], theme);
  drawPicture(ctx, picture, layout.picture, theme);
  ctx.restore();
  if (party) confetti(ctx, { x: 0, y: 0, w: state.width, h: state.height }, progress, theme);
  for (const button of layout.buttons) {
    const pressed = state.press?.kind === button.kind;
    if (button.kind === "gift") present(ctx, button, picture, theme, time);
    else if (button.kind === "play") drawRoundButton(ctx, "play", ...centreOf(button), button.w, theme.ui, { primary: true, pressed });
    else if (GLYPHS[button.kind] && button.kind !== "home") drawRoundButton(ctx, GLYPHS[button.kind], ...centreOf(button), button.w - 8, theme.ui, { pressed });
  }
  drawBar(ctx, game, theme, time);
  if (state.sound.open) drawVolumeLine(ctx, layout.volume, state.sound.volume, theme.ui, { pressed: state.press?.kind === "volume" });
}
