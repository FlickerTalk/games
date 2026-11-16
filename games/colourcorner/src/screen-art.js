import { standIn } from "../../../kit/src/avatars/index.js";
import { centreOf, drawHintHand, drawPortrait, drawRoundButton, drawSoundButtons, drawVolumeLine } from "../../../kit/src/canvas/index.js";
import { circle, clamp, line } from "../../../kit/src/canvas/pen.js";
import { SPREAD_MS } from "./colouring.js";
import { PAGE_H, PAGE_W, required, zonesOf } from "./geometry.js";
import { stripTargets } from "./layout.js";
import { drawItems, drawPage, drawSheet } from "./page-art.js";
import { pageOf } from "./pages.js";
import { GLYPHS, drawMarker, drawPot, drawTool } from "./tools-art.js";
import { PAPER_KINDS } from "./work.js";

const HINT_LOOP = 3;
const FLICK = Object.freeze({ who: "flick" });
const SOUND = new Set(["speaker", "music", "rival"]);

const pressedOf = (state, target) => Boolean(state.press && state.press.kind === target.kind && state.press.value === target.value);

function barButton(ctx, button, state, ui) {
  const glyph = button.kind === "done" ? "check" : (GLYPHS[button.kind] ?? button.kind);
  const quiet = button.kind === "undo" && !state.history.length;
  ctx.save();
  if (quiet) ctx.globalAlpha = 0.4;
  drawRoundButton(ctx, glyph, ...centreOf(button), Math.min(44, button.w - 12), ui, { pressed: pressedOf(state, button), primary: button.kind === "done" });
  ctx.restore();
}

function rivalOf(game) {
  const { state, duo } = game;
  const status = duo?.status;
  const player = state.mode === "flick" ? FLICK : standIn(state.player);
  return { player, thinking: Boolean(status && (status.calling || (status.phase === "play" && !status.myTurn && status.here))), away: Boolean(status && !status.here) };
}

function portraits(ctx, game, ui, time) {
  const { state, duo } = game;
  const { me, rival } = state.layout.portraits;
  const theirs = rivalOf(game);
  const mine = duo?.status.myTurn;
  for (const [spot, active] of [[me, mine], [rival, theirs.thinking]]) if (active) circle(ctx, spot.x, spot.y, spot.size / 2 + 3, null, ui.accent, 3);
  drawPortrait(ctx, me.x, me.y, me.size, { player: state.player, face: "happy" }, ui, { time });
  ctx.save();
  if (theirs.away && !theirs.thinking) ctx.globalAlpha = 0.45;
  drawPortrait(ctx, rival.x, rival.y, rival.size, { player: theirs.player, thinking: theirs.thinking, face: "happy" }, ui, { time });
  ctx.restore();
}

export function drawBar(ctx, game, theme, time) {
  const { state } = game;
  const { layout } = state;
  const { ui } = theme;
  for (const button of layout.buttons) if (!SOUND.has(button.kind) && button.y < layout.row) barButton(ctx, button, state, ui);
  const at = (kind) => layout.buttons.find((one) => one.kind === kind);
  drawSoundButtons(ctx, { speaker: at("speaker"), music: at("music") }, state.sound, ui, { press: state.press });
  if (layout.portraits) portraits(ctx, game, ui, time);
}

const preview = ({ stroke }) => (stroke ? [{ k: "l", p: stroke.p, w: stroke.w, m: stroke.m, pts: stroke.points.flat() }] : []);

function drawFree(ctx, state, theme) {
  const box = state.layout.page;
  drawSheet(ctx, box, theme.art.papers[state.drawing.paper], theme);
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.scale(box.scale, box.scale);
  ctx.beginPath();
  ctx.rect(0, 0, PAGE_W, PAGE_H);
  ctx.clip();
  if (state.mirror) {
    ctx.setLineDash([10, 10]);
    line(ctx, [[PAGE_W / 2, 8], [PAGE_W / 2, PAGE_H - 8]], theme.art.mirror, 2.5);
    ctx.setLineDash([]);
  }
  drawItems(ctx, [...state.drawing.items, ...preview(state)], theme);
  ctx.restore();
}

function drawSheetArea(ctx, game, theme, time) {
  const { state } = game;
  if (state.screen === "free") return drawFree(ctx, state, theme);
  const page = pageOf(state.page);
  if (!page) return drawSheet(ctx, state.layout.page, theme.art.paper, theme);
  const duo = state.screen === "duo";
  const fills = duo ? game.duo.status.state.fills : state.work.fills;
  const items = duo ? [] : [...state.work.items, ...preview(state)];
  const spreads = state.spreads.map((one) => ({ ...one, progress: clamp((time * 1000 - one.start) / SPREAD_MS) }));
  return drawPage(ctx, page, state.layout.page, theme, { fills, items, spreads, dots: true });
}

function chosenTool(state, value) {
  if (state.screen !== "free") return state.tool === value;
  if (value === "mirror") return state.mirror;
  if (value.startsWith("paper")) return PAPER_KINDS[Number(value.slice(5))] === state.drawing.paper;
  return state.freeTool === value;
}

function drawItem(ctx, item, state, theme) {
  const pressed = state.press?.kind === "strip" && !state.press.moved && state.press.item === `${item.kind}:${item.value}`;
  if (item.kind === "tool") return drawTool(ctx, item.value, item, theme, { chosen: chosenTool(state, item.value), pressed, colour: state.colour });
  if (item.kind === "pattern") return drawPot(ctx, item, theme, { colour: state.colour, pattern: item.value, chosen: state.pattern === item.value, pressed });
  return drawPot(ctx, item, theme, { colour: item.value, chosen: state.colour === item.value && !state.pattern, pressed });
}

function drawStrips(ctx, game, theme) {
  const { state } = game;
  const quiet = state.screen === "duo" && !game.duo?.status.myTurn;
  for (const strip of state.layout.strips) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(strip.x - 4, strip.y - 4, strip.w + 8, strip.h + 8);
    ctx.clip();
    if (quiet) ctx.globalAlpha = 0.4;
    for (const item of stripTargets(strip, state.scroll[strip.id] ?? 0)) {
      const out = item.x + item.w < strip.x || item.x > strip.x + strip.w || item.y + item.h < strip.y || item.y > strip.y + strip.h;
      if (!out) drawItem(ctx, item, state, theme);
    }
    ctx.restore();
  }
}

function hintSpots(state) {
  const page = pageOf(state.page);
  const strip = state.layout.strips.find((one) => one.id === "paints");
  const pots = stripTargets(strip, state.scroll.paints ?? 0).filter((one) => one.visible && one.kind === "paint");
  const pot = pots.find((one) => one.value === state.colour) ?? pots[0];
  const fills = state.screen === "duo" ? null : state.work.fills;
  const zone = page && required(page).find((one) => !fills || fills[one] === undefined);
  if (!pot || zone === undefined) return null;
  const [x, y] = zonesOf(page)[zone].anchor;
  const box = state.layout.page;
  return [centreOf(pot), [box.x + x * box.scale, box.y + y * box.scale]];
}

function drawHint(ctx, game, theme, time) {
  const { state } = game;
  if (state.taught || !["page", "duo"].includes(state.screen) || (state.screen === "page" && state.tool !== "fill")) return;
  if (state.screen === "duo" && !game.duo?.status.myTurn) return;
  const spots = hintSpots(state);
  if (!spots) return;
  const loop = (time % HINT_LOOP) / HINT_LOOP;
  const [x, y] = loop < 0.45 ? spots[0] : spots[1];
  drawHintHand(ctx, x + 14, y + 18, 64, loop < 0.45 ? loop / 0.45 : (loop - 0.45) / 0.55, theme.ui);
}

function drawMoments(ctx, game, theme, time) {
  const { state } = game;
  const box = state.layout.page;
  for (const one of state.spreads) {
    if (state.screen !== "duo") continue;
    const progress = clamp((time * 1000 - one.start) / SPREAD_MS);
    ctx.save();
    ctx.globalAlpha = 1 - progress * progress;
    drawMarker(ctx, box.x + one.x * box.scale + 10, box.y + one.y * box.scale - 18, 44, one.by === "them", theme);
    ctx.restore();
  }
  for (const one of state.moments.filter((moment) => moment.kind === "miss")) {
    const progress = clamp((time * 1000 - one.start) / one.duration);
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    circle(ctx, one.x, one.y, 12 + progress * 18, null, theme.art.miss, 4);
    ctx.restore();
  }
}

export function drawWork(ctx, game, theme, time) {
  const { state } = game;
  if (!state.layout?.page) return;
  drawSheetArea(ctx, game, theme, time);
  drawStrips(ctx, game, theme);
  drawMoments(ctx, game, theme, time);
  drawHint(ctx, game, theme, time);
  drawBar(ctx, game, theme, time);
  if (state.sound.open) drawVolumeLine(ctx, state.layout.volume, state.sound.volume, theme.ui, { pressed: state.press?.kind === "volume" });
}
