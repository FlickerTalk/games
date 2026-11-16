export const COMMANDS = Object.freeze(["F", "L", "R", "U"]);
export const MOST = 20;

const isRing = (item) => typeof item === "object";

export const emptyEdit = () => ({ items: [], open: false });

export const slotsOf = (items) => items.reduce((sum, item) => sum + (isRing(item) ? item.body.length : 1), 0);

export const countOf = (items) => items.reduce((sum, item) => sum + (isRing(item) ? item.body.length + 1 : 1), 0);

export function stepsOf(items) {
  const steps = [];
  let slot = 0;
  for (const item of items) {
    if (!isRing(item)) {
      steps.push({ command: item, slot });
      slot += 1;
      continue;
    }
    for (let turn = 0; turn < item.times; turn += 1) item.body.forEach((command, at) => steps.push({ command, slot: slot + at }));
    slot += item.body.length;
  }
  return steps;
}

const lastRing = (edit) => (edit.open ? edit.items.at(-1) : null);

export function ringState(edit) {
  const open = lastRing(edit);
  if (!open) return "none";
  return open.body.length ? "open" : "empty";
}

const withLast = (items, item) => [...items.slice(0, -1), item];

export function add(edit, command) {
  if (!COMMANDS.includes(command) || slotsOf(edit.items) >= MOST) return edit;
  const open = lastRing(edit);
  if (open) return { items: withLast(edit.items, { ...open, body: [...open.body, command] }), open: true };
  return { items: [...edit.items, command], open: false };
}

export function ring(edit) {
  const open = lastRing(edit);
  if (!open) return slotsOf(edit.items) >= MOST ? edit : { items: [...edit.items, { times: 2, body: [] }], open: true };
  if (open.body.length) return { items: edit.items, open: false };
  if (open.times === 2) return { items: withLast(edit.items, { times: 3, body: [] }), open: true };
  return { items: edit.items.slice(0, -1), open: false };
}

export function undo(edit) {
  const last = edit.items.at(-1);
  if (last === undefined) return edit;
  if (!isRing(last)) return { items: edit.items.slice(0, -1), open: false };
  if (!edit.open) return { items: edit.items, open: true };
  if (!last.body.length) return { items: edit.items.slice(0, -1), open: false };
  return { items: withLast(edit.items, { ...last, body: last.body.slice(0, -1) }), open: true };
}

export function trim(edit, slot) {
  const items = [];
  let left = slot;
  for (const item of edit.items) {
    if (left <= 0) break;
    if (!isRing(item)) {
      items.push(item);
      left -= 1;
      continue;
    }
    const body = item.body.slice(0, left);
    if (body.length) items.push({ times: item.times, body });
    if (body.length < item.body.length) return { items, open: body.length > 0 };
    left -= body.length;
  }
  return { items, open: edit.open && items.length === edit.items.length && isRing(items.at(-1)) };
}

export function encodeProgram(items) {
  return `P${items.map((item) => (isRing(item) ? `${item.times}${item.body.join("")})` : item)).join("")}`;
}

export function decodeProgram(code) {
  if (typeof code !== "string" || !/^P[FLRU23)]+$/.test(code)) return null;
  const items = [];
  let open = null;
  for (const token of code.slice(1)) {
    if (COMMANDS.includes(token)) (open ? open.body : items).push(token);
    else if (token === ")") {
      if (!open?.body.length) return null;
      items.push(open);
      open = null;
    } else if (open) return null;
    else open = { times: Number(token), body: [] };
  }
  if (open || !items.length || slotsOf(items) > MOST) return null;
  return items;
}
