import { drawAvatar, drawBadge, drawRoundEnd } from "../../../kit/src/avatars/index.js";
import { drawStar, drawVolume } from "./bar.js";
import { drawPlay } from "./board.js";
import { drawConfetti, drawEmptyBonus, drawWrapped } from "./bursts.js";
import { drawButton } from "./buttons.js";
import { drawCard, drawMiniCourt } from "./home-art.js";
import { kindOf } from "../../../kit/src/progress/index.js";
import { PROGRESS } from "./levels.js";
import { drawLineEffect } from "./line-effects.js";
import { endLayout, promptLayout } from "./menu-layout.js";
import { clamp, paint, roundedRect } from "./pen.js";
import { drawScenery } from "./scenery.js";

const centreOf = (area) => [area.x + area.w / 2, area.y + area.h / 2];
const number = (value, lang) => new Intl.NumberFormat(lang || "en").format(value);

function digits(ctx, words, x, y, size, theme) {
  ctx.font = `800 ${size}px ${theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = theme.ui.ink;
  ctx.fillText(words, x, y);
}

function panel(ctx, card, theme) {
  roundedRect(ctx, card.x, card.y, card.w, card.h, theme.ui.radius.card);
  paint(ctx, theme.ui.card, theme.ui.ink, theme.stroke.bold);
}

function faces(ctx, x, y, size, state, rival, theme, time) {
  const { outcome, player } = state;
  if (rival && Number.isFinite(rival.score)) {
    const [winner, other] = (rival.won ?? outcome.won) ? [player, rival.player] : [rival.player, player];
    drawRoundEnd(ctx, x, y, size, { winner, other, stars: outcome.stars, time });
    return;
  }
  for (let at = 0; at < 3; at += 1) drawStar(ctx, x + (at - 1) * size * 0.42, y - size * 0.42 - (at === 1 ? size * 0.08 : 0), size * 0.34, at < outcome.stars, theme);
  drawAvatar(ctx, x, y + size * 0.16, size * 0.62, { ...player, face: outcome.stars >= 2 ? "cheering" : "happy", time, motion: 1 });
}

function present(ctx, area, outcome, theme, time) {
  if (!outcome.gift) return;
  if (!outcome.opened) {
    drawWrapped(ctx, { x: area.x + 8, y: area.y + 6, w: area.w - 16, h: area.h - 12 }, (time % 2) / 2, theme);
    return;
  }
  drawCard(ctx, area, theme, { chosen: true });
  const [x, y] = centreOf(area);
  if (kindOf(PROGRESS.spec.gifts, outcome.gift) === "effect") drawLineEffect(ctx, outcome.gift, x, y, area.w * 0.6, (time * 0.4) % 1, theme);
  else {
    drawScenery(ctx, outcome.gift, { w: area.x + area.w, h: area.y + area.h }, { x: area.x + 6, y: area.y + 6, w: area.w - 12, h: area.h * 0.45 }, theme, time);
    drawMiniCourt(ctx, { x: area.x, y: area.y + area.h * 0.3, w: area.w, h: area.h * 0.66 }, "main", theme);
  }
}

function scores(ctx, x, y, state, rival, theme, time) {
  const { outcome, lang } = state;
  const { text } = theme.ui;
  digits(ctx, number(outcome.score, lang), x, y, text.big, theme);
  if (outcome.best !== null && outcome.best !== undefined) {
    drawStar(ctx, x - 30, y + text.big, outcome.newBest ? 26 : 20, true, theme);
    digits(ctx, number(outcome.best, lang), x + 12, y + text.big, text.best, theme);
  }
  if (!rival) return;
  const ry = y + text.big * 2;
  drawBadge(ctx, x - 26, ry, 34, { ...rival.player, thinking: !Number.isFinite(rival.score), time });
  if (Number.isFinite(rival.score)) digits(ctx, number(rival.score, lang), x + 18, ry, text.best, theme);
}

export function drawEnd(ctx, state, rival, theme, time) {
  const { width, height, outcome } = state;
  ctx.save();
  if (state.round && state.layout) drawPlay(ctx, { ...state, paused: false, hint: null, drag: { phase: "idle" }, moments: [], sound: { ...state.sound, open: false } }, theme, time);
  ctx.fillStyle = theme.ui.shade;
  ctx.fillRect(0, 0, width, height);
  const layout = endLayout(width, height, { gift: true, fill: state.fill });
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  const [home, again, gift] = [at("home"), at("again"), at("gift")];
  panel(ctx, layout.card, theme);
  const top = home.y + home.h;
  const left = home.x + home.w + 8;
  const right = (gift.x < again.x && gift.y > home.y ? again.x : gift.x) - 8;
  const middle = (left + right) / 2;
  const roomy = again.y - top > 260;
  const size = roomy ? Math.min(120, (right - left) / 2) : Math.max(40, Math.min(80, (right - left) / 2));
  if (outcome.over === "full") drawMiniCourt(ctx, { x: middle - 30, y: home.y, w: 60, h: 60 }, "main", theme);
  else drawEmptyBonus(ctx, middle, home.y + 64, 100, 0.2 + ((time * 0.3) % 0.6), theme);
  const facesY = roomy ? top + size * 0.9 : home.y + home.h / 2;
  faces(ctx, middle, facesY, size, state, rival, theme, time);
  const scoreY = roomy ? facesY + size * 1.1 : top + 18;
  scores(ctx, again.x < layout.card.x + layout.card.w / 2 ? middle : Math.min(middle, again.x - 80), scoreY, state, rival, theme, time);
  present(ctx, gift, outcome, theme, time);
  drawButton(ctx, "home", ...centreOf(home), home.w - 8, theme, { fill: theme.ui.accent });
  drawButton(ctx, "again", ...centreOf(again), again.w, theme);
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), 5, theme);
  }
  if (state.sound.open && state.layout) drawVolume(ctx, state.layout.volume, state.sound.volume, theme);
  ctx.restore();
}

export function drawPrompt(ctx, state, theme, time) {
  const { width, height } = state;
  const { card, targets } = promptLayout(width, height, { fill: state.fill });
  ctx.save();
  ctx.fillStyle = theme.ui.shade;
  ctx.fillRect(0, 0, width, height);
  panel(ctx, card, theme);
  drawBadge(ctx, card.x + card.w / 2, card.y + Math.min(52, card.h * 0.3), Math.min(72, card.h * 0.45), { ...state.player, face: "happy", time });
  for (const target of targets) {
    const accept = target.kind === "accept";
    drawButton(ctx, accept ? "check" : "close", ...centreOf(target), target.w - 8, theme, { fill: accept ? theme.ui.good : theme.ui.off });
  }
  ctx.restore();
}
