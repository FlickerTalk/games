import { pageOf } from "./pages.js";
import { PATTERNS } from "./paints.js";
import { PAINT_KEYS } from "./theme.js";
import { blankWork, readDrawing, readWork } from "./work.js";

export const OWN_KEY = "colourcorner";
export const WALL_KEY = "wall";
export const NOW_KEY = "free/now";
export const SLOTS = 12;
export const WALL_MOST = 24;

const VARIANTS = ["pages", "free", "together"];
const ENTRY = new RegExp(`^(?:p:([a-zA-Z]{2,16})|([fs]):(\\d{1,2}))$`);

async function read(store, key) {
  try {
    const json = await store?.get(key);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function write(store, key, value) {
  try {
    return Boolean(await store?.set(key, JSON.stringify(value)));
  } catch {
    return false;
  }
}

const count = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);

export async function readOwn(store) {
  const kept = (await read(store, OWN_KEY)) ?? {};
  return {
    variant: VARIANTS.includes(kept.variant) ? kept.variant : "pages",
    taught: kept.taught === true,
    colour: Number.isInteger(kept.colour) && kept.colour >= 0 && kept.colour < PAINT_KEYS.length ? kept.colour : 1,
    pattern: PATTERNS.includes(kept.pattern) ? kept.pattern : null,
    done: Array.isArray(kept.done) ? kept.done.filter((id) => pageOf(id)) : [],
    saved: count(kept.saved),
    shared: count(kept.shared),
  };
}

export const saveOwn = (store, own) => write(store, OWN_KEY, own);

export const loadWork = async (store, page) => readWork(JSON.stringify((await read(store, `page/${page.id}`)) ?? blankWork()), page);

export const saveWork = (store, id, work) => write(store, `page/${id}`, work);

export const saveDrawing = (store, key, drawing) => write(store, key, drawing);

export async function loadDrawing(store, key) {
  const kept = await read(store, key);
  return kept ? readDrawing(JSON.stringify(kept)) : null;
}

export const saveShared = (store, slot, { page, fills }) => write(store, `shared/${slot}`, { page, fills });

function entryOf(entry) {
  const found = typeof entry === "string" ? ENTRY.exec(entry) : null;
  if (!found) return null;
  if (found[1]) return pageOf(found[1]) ? { kind: "page", page: found[1] } : null;
  const slot = Number(found[3]);
  return slot < SLOTS ? { kind: found[2] === "f" ? "free" : "shared", slot } : null;
}

export async function readWall(store) {
  const kept = await read(store, WALL_KEY);
  return Array.isArray(kept) ? kept.filter((entry) => entryOf(entry)).slice(0, WALL_MOST) : [];
}

export const saveWall = (store, wall) => write(store, WALL_KEY, wall);

export const addToWall = (wall, entry) => [entry, ...wall.filter((one) => one !== entry)].slice(0, WALL_MOST);

export async function loadPicture(store, entry) {
  const found = entryOf(entry);
  if (!found) return null;
  if (found.kind === "page") return { entry, kind: "page", page: found.page, work: await loadWork(store, pageOf(found.page)) };
  if (found.kind === "free") {
    const drawing = await loadDrawing(store, `free/${found.slot}`);
    return drawing && { entry, kind: "free", slot: found.slot, drawing };
  }
  const kept = await read(store, `shared/${found.slot}`);
  const page = pageOf(kept?.page);
  return page && { entry, kind: "shared", page: page.id, work: readWork(JSON.stringify({ fills: kept.fills }), page) };
}
