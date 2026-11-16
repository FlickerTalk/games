const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

export function rgbaOf(colour) {
  const text = typeof colour === "string" ? colour.trim() : "";
  const hex = HEX.exec(text);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((one) => one + one).join("") : hex[1];
    return [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)).concat(1);
  }
  const rgb = RGB.exec(text);
  if (!rgb) return null;
  const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : Number(rgb[4]);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
}

const byte = (value) => Math.min(255, Math.max(0, Math.round(value)));

export function cssOf([r, g, b, a = 1]) {
  if (a >= 1) return `#${[r, g, b].map((value) => byte(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  return `rgba(${byte(r)}, ${byte(g)}, ${byte(b)}, ${Math.round(Math.max(0, a) * 1000) / 1000})`;
}

const linear = (value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};
const gamma = (value) => 255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);

function toLab([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map(linear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function fromLab([lightness, a, b]) {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

export function oklchOf(colour) {
  const rgba = rgbaOf(colour) ?? [0, 0, 0, 1];
  const [l, a, b] = toLab(rgba);
  return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, alpha: rgba[3] };
}

const inGamut = (channels) => channels.every((value) => value >= -0.0001 && value <= 1.0001);

export function fromOklch({ l, c, h, alpha = 1 }) {
  const turn = (h * Math.PI) / 180;
  const at = (chroma) => fromLab([Math.min(1, Math.max(0, l)), chroma * Math.cos(turn), chroma * Math.sin(turn)]);
  let [low, high] = [0, Math.max(0, c)];
  if (!inGamut(at(high))) {
    for (let step = 0; step < 24; step += 1) {
      const middle = (low + high) / 2;
      if (inGamut(at(middle))) low = middle;
      else high = middle;
    }
    high = low;
  }
  return cssOf([...at(high).map((value) => gamma(Math.min(1, Math.max(0, value)))), alpha]);
}

const luminance = ([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

export function contrastOf(one, two) {
  const [light, dark] = [rgbaOf(one), rgbaOf(two)].map((rgba) => luminance(rgba ?? [0, 0, 0])).sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function readableOn(colour, ground, ratio) {
  const normal = cssOf(rgbaOf(colour) ?? [0, 0, 0, 1]);
  if (contrastOf(normal, ground) >= ratio) return normal;
  const start = oklchOf(normal);
  const darker = contrastOf("#000000", ground) >= contrastOf("#FFFFFF", ground);
  for (let step = 1; step <= 100; step += 1) {
    const moved = fromOklch({ ...start, l: start.l + (darker ? -step : step) / 100 });
    if (contrastOf(moved, ground) >= ratio) return moved;
  }
  return darker ? "#000000" : "#FFFFFF";
}

export function mixColours(from, to, amount) {
  const [one, two] = [rgbaOf(from) ?? [0, 0, 0, 1], rgbaOf(to) ?? [0, 0, 0, 1]];
  return cssOf(one.map((value, at) => value * amount + two[at] * (1 - amount)));
}

export function softDay(colour, { dark, deeper = 0 }) {
  const rgba = rgbaOf(colour);
  if (!rgba) return colour;
  const tone = oklchOf(colour);
  if (dark) return fromOklch({ ...tone, l: 0.18 + 0.4 * tone.l - deeper, c: tone.c * 0.8 });
  if (tone.l <= 0.8) return cssOf(rgba);
  return fromOklch({ ...tone, l: 0.8 + (tone.l - 0.8) * 0.55 });
}

export function softStage(palette, mode) {
  if (typeof palette === "string") return rgbaOf(palette) ? softDay(palette, mode) : palette;
  if (Array.isArray(palette)) return Object.freeze(palette.map((one) => softStage(one, mode)));
  if (!palette || typeof palette !== "object") return palette;
  return Object.freeze(Object.fromEntries(Object.entries(palette).map(([key, value]) => [key, softStage(value, mode)])));
}
