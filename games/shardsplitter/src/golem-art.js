import { ellipse, line, paint, polygon } from "../../../kit/src/canvas/pen.js";

export const MOODS = Object.freeze(["waiting", "rolling", "giggle", "tongue"]);

const NOMINAL = 150;
const SHARD = 54;

function digits(ctx, words, y, size, colour, font) {
  ctx.font = `800 ${Math.round(size)}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.fillStyle = colour;
  ctx.fillText(words, 0, y);
}

function sway(mood, time) {
  if (mood === "rolling") return { lift: 0, turn: Math.sin(time * 8) * 0.09 };
  if (mood === "giggle") return { lift: -Math.abs(Math.sin(time * 9)) * 5, turn: Math.sin(time * 18) * 0.05 };
  if (mood === "tongue") return { lift: 0, turn: Math.sin(time * 14) * 0.03 };
  return { lift: Math.sin(time * 3) * 2, turn: 0 };
}

function body(ctx, art, stroke) {
  const { crystal, ink } = art;
  ellipse(ctx, -39, 51, 21, 22, crystal.deep, ink, stroke);
  ellipse(ctx, 39, 51, 21, 22, crystal.deep, ink, stroke);
  polygon(ctx, [[-58, -31], [-31, -66], [3, -57], [-8, -20]], crystal.facet, ink, stroke);
  polygon(ctx, [[8, -57], [39, -62], [62, -28], [18, -17]], crystal.facetAlt, ink, stroke);
  polygon(ctx, [[-66, -18], [-24, -28], [-18, 19], [-57, 35]], crystal.deep, ink, stroke);
  polygon(ctx, [[24, -25], [65, -15], [57, 35], [18, 19]], crystal.facet, ink, stroke);
  ellipse(ctx, 0, 7, 48, 53, crystal.body, ink, stroke);
  polygon(ctx, [[-43, -39], [-33, -52], [-24, -48], [-36, -34]], crystal.shine);
}

function face(ctx, art, mood, roomy) {
  const { ink } = art;
  const laughing = mood === "giggle";
  if (laughing) {
    line(ctx, [[-24, -33], [-18, -38], [-12, -33]], ink, 3.5);
    line(ctx, [[12, -33], [18, -38], [24, -33]], ink, 3.5);
  } else {
    ellipse(ctx, -18, -35, 5, 7, ink);
    ellipse(ctx, 18, -35, 5, 7, ink);
  }
  if (mood === "tongue") {
    ellipse(ctx, 0, -21, 10, 6, ink);
    ellipse(ctx, 0, -14, 7, 10, art.tongue, ink, 2);
  } else if (roomy) line(ctx, laughing ? [[-10, -22], [0, -14], [10, -22]] : [[-8, -21], [0, -16], [8, -21]], ink, 3);
}

function cap(ctx, art, tint) {
  const colour = art.caps[tint % art.caps.length];
  ctx.beginPath();
  ctx.arc(0, -48, 51, Math.PI, 0);
  ctx.lineTo(63, -40);
  ctx.lineTo(-51, -40);
  ctx.closePath();
  paint(ctx, colour, art.ink, 4);
  ellipse(ctx, 0, -99, 10, 10, colour, art.ink, 3);
}

export function drawGolem(ctx, x, y, size, { number, mood = "waiting", time = 0, cap: capped = null, capTint = 0 }, theme) {
  const { art, font, text } = theme;
  const scale = size / NOMINAL;
  const wearing = capped !== null;
  const fit = wearing ? 0.8 : 1;
  const digit = Math.max(text.digit, size * 0.23 * fit);
  const belly = Math.max(35, (digit * (String(number).length > 2 ? 0.95 : 0.74)) / (scale * fit));
  const roomy = belly <= 36;
  const { lift, turn } = sway(mood, time);
  ctx.save();
  ctx.translate(x, y + (wearing ? size * 0.09 : 0) + lift * scale);
  ctx.rotate(turn);
  ctx.save();
  ctx.scale(scale * fit, scale * fit);
  ellipse(ctx, 0, 68, 55, 8, art.shadow);
  body(ctx, art, Math.max(4, 2.2 / (scale * fit)));
  ellipse(ctx, 0, roomy ? 13 : 16, Math.min(46, belly), Math.min(42, belly * 0.92), art.crystal.belly, art.crystal.edge, 3);
  face(ctx, art, mood, roomy);
  if (wearing) cap(ctx, art, capTint);
  ctx.restore();
  digits(ctx, String(number), (roomy ? 14 : 17) * scale * fit, digit, art.ink, font);
  const capDigit = size * fit * 0.2;
  if (wearing && capDigit >= text.digit) digits(ctx, String(capped), -62 * scale * fit, capDigit, art.white, font);
  ctx.restore();
}

export function drawShard(ctx, x, y, size, { value, angle = 0 }, theme) {
  const { art, font, text } = theme;
  const scale = size / SHARD;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.save();
  ctx.scale(scale, scale);
  polygon(ctx, [[0, -29], [23, -14], [20, 19], [0, 29], [-23, 17], [-23, -14]], art.crystal.facet, art.ink, Math.max(3, 2 / scale));
  polygon(ctx, [[0, -23], [16, -12], [12, 13], [0, 20], [-4, -2]], art.crystal.shine);
  ctx.restore();
  const digit = size * 0.36;
  if (digit >= text.digit) {
    ellipse(ctx, 0, size * 0.07, size * 0.31, size * 0.28, art.crystal.belly, art.crystal.edge, 2);
    digits(ctx, String(value), size * 0.09, digit, art.ink, font);
  }
  ctx.restore();
}
