const percent = (share) => `${Math.round(share * 1e6) / 1e4}%`;

const dataName = (name) => `data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

function setAttribute(node, name, value) {
  if (value === null || value === undefined || value === false) {
    node.removeAttribute(name);
    return;
  }
  const text = value === true ? "" : String(value);
  if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}

function patch(button, { key, box, label, disabled = false, data = {} }) {
  setAttribute(button, "data-key", key);
  setAttribute(button, "aria-label", label);
  if (button.disabled !== Boolean(disabled)) button.disabled = Boolean(disabled);
  const wanted = new Set(Object.keys(data).map(dataName));
  for (const name of button.getAttributeNames()) if (name.startsWith("data-") && name !== "data-key" && !wanted.has(name)) button.removeAttribute(name);
  for (const [name, value] of Object.entries(data)) setAttribute(button, dataName(name), value);
  const place = { left: percent(box.x), top: percent(box.y), width: percent(box.w), height: percent(box.h) };
  for (const [side, value] of Object.entries(place)) if (button.style[side] !== value) button.style[side] = value;
}

export function syncButtons(layer, specs) {
  const page = layer.ownerDocument;
  const kept = new Map([...layer.querySelectorAll(":scope > button[data-key]")].map((button) => [button.dataset.key, button]));
  let previous = null;
  for (const spec of specs) {
    const key = String(spec.key);
    let button = kept.get(key);
    kept.delete(key);
    if (!button) {
      button = page.createElement("button");
      button.type = "button";
    }
    patch(button, spec);
    const after = previous ? previous.nextSibling : layer.querySelector(":scope > button[data-key]");
    if (button !== after) layer.insertBefore(button, after);
    previous = button;
  }
  for (const button of kept.values()) button.remove();
}
