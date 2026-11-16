import { DIGITS, drawDigits, drawPortrait, drawSoundButtons, drawStar, drawVolumeLine, formatNumber } from "./bar.js";
import { drawRoundButton } from "./buttons.js";
import { centreOf } from "./layout.js";
import { paint, roundedRect } from "./pen.js";

const ROOMY = 130;
const isPressed = (press, target) => Boolean(press && target && press.kind === target.kind && press.value === target.value);

function contentArea(card, home, again, gift) {
  const wide = again.x > card.x + card.w / 2 + again.w / 2;
  if (wide) return { x: home.x + home.w + 8, y: card.y + 12, w: (gift ? gift.x : again.x) - home.x - home.w - 24, h: card.h - 24 };
  const below = { x: card.x + 12, y: home.y + home.h + 4, w: card.w - 24, h: again.y - home.y - home.h - 12 };
  if (below.h >= ROOMY) return below;
  const right = gift ? gift.x - 8 : card.x + card.w - 12;
  return { x: home.x + home.w + 8, y: home.y, w: right - home.x - home.w - 8, h: again.y - home.y - 4 };
}

function facesOf([mine, theirs]) {
  const known = Number.isFinite(mine.score) && Number.isFinite(theirs?.score);
  if (!known) return ["happy", "thinking"];
  if (mine.score === theirs.score) return ["happy", "happy"];
  return mine.score > theirs.score ? ["cheering", "oops"] : ["oops", "cheering"];
}

function versus(ctx, x, y, area, players, ui, { time, lang }) {
  const size = Math.max(28, Math.min(56, (area.w - 24) / 2, area.h - 30));
  const faces = facesOf(players);
  players.forEach((one, side) => {
    const cx = x + (side ? 1 : -1) * (size / 2 + 8);
    drawPortrait(ctx, cx, y + size / 2, size, { ...one, face: one.face ?? faces[side], thinking: one.thinking ?? !Number.isFinite(one.score) }, ui, { time, lang, score: "below" });
  });
}

function bigStars(ctx, x, y, size, count, ui) {
  for (let at = 0; at < 3; at += 1) drawStar(ctx, x + (at - 1) * size * 0.8, y - (at === 1 ? size * 0.14 : 0), size, at < count, ui);
}

function bestLine(ctx, x, y, result, ui, lang) {
  if (result.best === null || result.best === undefined) return;
  drawStar(ctx, x - 30, y, result.newBest ? 26 : 20, true, ui);
  drawDigits(ctx, formatNumber(result.best, lang), x + 12, y, DIGITS.best, ui.text, "center");
}

function partsFor(result, area) {
  const star = Math.max(24, Math.min(66, area.w / 3.2, area.h - 94));
  const wanted = [];
  if (Number.isFinite(result.stars)) wanted.push(["stars", star + 10]);
  if (result.players) wanted.push(["versus", [116, 58]], ["best", 34]);
  else wanted.push(["score", 84]);
  wanted.push(["picture", 90]);
  const shown = [];
  let used = 0;
  for (const [kind, tall] of wanted) {
    const fits = [tall].flat().find((one) => used + one <= area.h);
    if (fits) shown.push([kind, fits]);
    used += fits ?? 0;
  }
  return { star, shown, used };
}

const ORDER = ["picture", "stars", "versus", "score", "best"];

function block(ctx, area, result, ui, { time, lang, drawPicture }) {
  const { star, shown, used } = partsFor(result, area);
  let y = area.y + (area.h - used) / 2;
  const x = area.x + area.w / 2;
  for (const [kind, tall] of shown.sort((one, two) => ORDER.indexOf(one[0]) - ORDER.indexOf(two[0]))) {
    if (kind === "picture") drawPicture(ctx, { x: area.x, y, w: area.w, h: tall }, time);
    if (kind === "stars") bigStars(ctx, x, y + tall / 2 + 4, star, result.stars, ui);
    if (kind === "versus") versus(ctx, x, y + 2, { w: area.w, h: tall }, result.players, ui, { time, lang });
    if (kind === "best") bestLine(ctx, x, y + tall / 2, result, ui, lang);
    if (kind === "score") {
      drawDigits(ctx, formatNumber(result.score, lang), x, y + 24, DIGITS.big, ui.text, "center");
      bestLine(ctx, x, y + 24 + DIGITS.big, result, ui, lang);
    }
    y += tall;
  }
}

export function drawRoundEnd(ctx, state, ui, time, { layout, result, volume = null, drawPicture = () => {}, drawGift = () => {} }) {
  const { width, height, sound, press = null, lang } = state;
  const at = (kind) => layout.targets.find((one) => one.kind === kind);
  const [home, again, gift] = [at("home"), at("again"), at("gift")];
  ctx.save();
  ctx.fillStyle = ui.shade;
  ctx.fillRect(0, 0, width, height);
  roundedRect(ctx, layout.card.x, layout.card.y, layout.card.w, layout.card.h, ui.radius);
  paint(ctx, ui.surface, ui.border, ui.line);
  block(ctx, contentArea(layout.card, home, again, result.gift ? gift : null), result, ui, { time, lang, drawPicture });
  if (gift && result.gift) drawGift(ctx, gift, { ...result.gift, time });
  drawRoundButton(ctx, "home", ...centreOf(home), home.w - 8, ui, { pressed: isPressed(press, home) });
  drawRoundButton(ctx, "again", ...centreOf(again), again.w, ui, { primary: true, pressed: isPressed(press, again) });
  drawSoundButtons(ctx, { speaker: at("speaker"), music: at("music") }, sound, ui, { press });
  if (sound.open && volume) drawVolumeLine(ctx, volume, sound.volume, ui, { pressed: press?.kind === "volume" });
  ctx.restore();
}
