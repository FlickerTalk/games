// CSS can't measure contrast, so the kit checks the app's secondary-text colour (4.5:1) itself.

export function parseColour(text) {
  const value = String(text ?? "").trim();
  let match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1].length === 3 ? [...match[1]].map((one) => one + one).join("") : match[1];
    return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
  }
  match = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (match) return match.slice(1, 4).map((one) => Math.round(Number(one)));
  match = value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (match) return match.slice(1, 4).map((one) => Math.round(Number(one) * 255));
  return null;
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(one, two) {
  const [light, dark] = [luminance(one), luminance(two)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// mixed as style.css mixes --surface, 6% of ink over the page in sRGB
export function surfaceOf(ink, background) {
  return ink.map((value, at) => Math.round(value * 0.06 + background[at] * 0.94));
}

export function mediumReads({ background, ink, medium }) {
  const [page, text, muted] = [background, ink, medium].map(parseColour);
  if (!page || !text || !muted) return false;
  return contrast(muted, page) >= 4.5 && contrast(muted, surfaceOf(text, page)) >= 4.5;
}
