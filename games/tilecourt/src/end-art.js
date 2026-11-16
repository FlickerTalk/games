import { drawAvatar, drawBadge } from "../../../kit/src/avatars/index.js";
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

function bigStars(ctx, x, y, size, count, theme) {
  for (let at = 0; at < 3; at += 1) drawStar(ctx, x + (at - 1) * size * 0.8, y - (at === 1 ? size * 0.14 : 0), size, at < count, theme);
}

function versus(ctx, x, y, size, state, rival, theme, time) {
  const { outcome, player, lang } = state;
  const known = Number.isFinite(rival.score);
  const won = rival.won ?? outcome.won;
  const gap = size * 0.85;
  drawAvatar(ctx, x - gap, y, size, { ...player, face: !known || won ? "cheering" : "oops", time, motion: 1 });
  drawBadge(ctx, x + gap, y, size * 1.1, { ...rival.player, thinking: !known, face: !known ? "thinking" : won ? "oops" : "cheering", time });
  if (known) digits(ctx, number(rival.score, lang), x + gap, y + size * 0.78, theme.ui.text.best, theme);
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

function scores(ctx, x, y, state, theme) {
  const { outcome, lang } = state;
  const { text } = theme.ui;
  digits(ctx, number(outcome.score, lang), x, y, text.big, theme);
  if (outcome.best === null || outcome.best === undefined) return;
  drawStar(ctx, x - 30, y + text.big, outcome.newBest ? 26 : 20, true, theme);
  digits(ctx, number(outcome.best, lang), x + 12, y + text.big, text.best, theme);
}

const ROOMY = 130;

function contentArea(card, home, again, gift, withGift) {
  const wide = again.x > card.x + card.w / 2 + again.w / 2;
  if (wide) return { x: home.x + home.w + 8, y: card.y + 12, w: gift.x - home.x - home.w - 24, h: card.h - 24 };
  const below = { x: card.x + 12, y: home.y + home.h + 4, w: card.w - 24, h: again.y - home.y - home.h - 12 };
  if (below.h >= ROOMY) return below;
  const right = withGift ? gift.x - 8 : card.x + card.w - 12;
  return { x: home.x + home.w + 8, y: home.y, w: right - home.x - home.w - 8, h: again.y - home.y - 4 };
}

function block(ctx, area, state, rival, theme, time) {
  const { outcome } = state;
  const star = Math.max(24, Math.min(66, area.w / 3.2, area.h - 94));
  const parts = [["stars", star + 10], ["score", 84], ["versus", rival ? 110 : 0], ["picture", 90]];
  const shown = [];
  let used = 0;
  for (const [kind, tall] of parts) {
    if (tall && used + tall <= area.h) {
      shown.push([kind, tall]);
      used += tall;
    }
  }
  const order = ["picture", "stars", "versus", "score"];
  let y = area.y + (area.h - used) / 2;
  const x = area.x + area.w / 2;
  for (const [kind, tall] of shown.sort((one, two) => order.indexOf(one[0]) - order.indexOf(two[0]))) {
    if (kind === "picture" && outcome.over === "full") drawMiniCourt(ctx, { x: x - 40, y, w: 80, h: tall }, "main", theme);
    else if (kind === "picture") drawEmptyBonus(ctx, x, y + tall * 0.75, 110, 0.2 + ((time * 0.3) % 0.6), theme);
    if (kind === "stars") bigStars(ctx, x, y + tall / 2 + 4, star, outcome.stars, theme);
    if (kind === "versus") versus(ctx, x, y + tall * 0.4, 56, state, rival, theme, time);
    if (kind === "score") scores(ctx, x, y + 24, state, theme);
    y += tall;
  }
}

function soundButtons(ctx, targets, state, theme) {
  for (const target of targets.filter((one) => one.kind === "speaker" || one.kind === "music")) {
    const options = target.kind === "speaker" ? { level: state.sound.level } : { off: !state.sound.music };
    drawButton(ctx, target.kind, ...centreOf(target), Math.min(44, target.w - 12), theme, options);
  }
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
  block(ctx, contentArea(layout.card, home, again, gift, Boolean(outcome.gift)), state, rival, theme, time);
  present(ctx, gift, outcome, theme, time);
  drawButton(ctx, "home", ...centreOf(home), home.w - 8, theme, { fill: theme.ui.accent });
  drawButton(ctx, "again", ...centreOf(again), again.w, theme);
  for (const moment of state.moments) {
    if (moment.kind === "confetti") drawConfetti(ctx, layout.card, clamp((time * 1000 - moment.start) / moment.duration), 5, theme);
  }
  soundButtons(ctx, layout.targets, state, theme);
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
