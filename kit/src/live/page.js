// copies of shell.js and i18n.js helpers: importing those would bundle all the turn-based texts

// the app's frame height before the frame says its own (PluginSheet), so the frame resizes at most once
export const FRAME_START = 320;

export const escape = (text) =>
  String(text).replace(/[&<>"']/g, (one) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[one]);

export function translator(catalogue) {
  return (lang, key, vars = {}) => {
    const tag = String(lang || "en");
    const text = catalogue[tag]?.[key] ?? catalogue[tag.split("-")[0]]?.[key] ?? catalogue.en?.[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (gap, name) => (name in vars ? String(vars[name]) : gap));
  };
}

export function direction(lang) {
  return String(lang || "en").split("-")[0] === "ar" ? "rtl" : "ltr";
}

function within(width, height, aspect) {
  if (width / aspect <= height) return { width: Math.floor(width), height: Math.floor(width / aspect + 1e-9) };
  return { width: Math.floor(height * aspect + 1e-9), height: Math.floor(height) };
}

export function fitView({ width, height = Infinity, aspect, pad, side, gap, most = 480, least = 160 }) {
  const under = Math.max(height - pad - gap, Math.min(least, width / aspect));
  const column = { mode: "column", ...within(Math.min(width, most), under, aspect) };
  const row = { mode: "row", ...within(Math.min(width - 2 * (side + gap), most), height, aspect) };
  return row.width > 0 && row.width * row.height >= column.width * column.height ? row : column;
}

export function formatTime(ms, lang) {
  if (!Number.isFinite(ms) || ms < 0) return "–";
  const tenths = Math.floor(ms / 100);
  const minutes = new Intl.NumberFormat(lang).format(Math.floor(tenths / 600));
  const seconds = new Intl.NumberFormat(lang, { minimumIntegerDigits: 2, minimumFractionDigits: 1, maximumFractionDigits: 1 }).format((tenths % 600) / 10);
  return `${minutes}:${seconds}`;
}

// Stencil marks a drawn component `hydrated`, until then its children measure nothing
export function whenDrawn(nodes) {
  const waiting = nodes.filter((node) => customElements.get(node.localName) && !node.classList.contains("hydrated"));
  if (!waiting.length) return Promise.resolve();
  return new Promise((resolve) => {
    const watch = new MutationObserver(() => {
      if (!waiting.every((node) => node.classList.contains("hydrated"))) return;
      watch.disconnect();
      resolve();
    });
    for (const node of waiting) watch.observe(node, { attributes: true, attributeFilter: ["class"] });
  });
}
