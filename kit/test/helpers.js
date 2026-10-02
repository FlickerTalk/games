// What the kit's tests and every game's tests share: a toy game, a fake core (one phone's `ft`),
// two fake cores wired together as two phones in one conversation, and the checks every package
// must pass (manifest, size, nothing loaded from outside, the 21 languages).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { expect, vi } from "vitest";

export { toy } from "./toy.js";

/** The conversation each phone's records were last opened in, so a frame opened again over the
 *  same records (the user coming back) is in the same conversation unless a test says otherwise. */
const lastChat = new WeakMap();
let chats = 0;

/**
 * One phone's core as the frame's `ft` answers it, open in one conversation (`chat`, as `onOpen`
 * gives it: local, different on each phone): records and the store in memory, `live.send` handed
 * to `wire` (or answering `true` into the void), `say` and `close` recorded.
 */
export function fakeCore({ records = new Map(), quota = 4 * 1024 * 1024, chat } = {}) {
  chat ??= lastChat.get(records) ?? `chat${(chats += 1).toString().padStart(4, "0")}`;
  lastChat.set(records, chat);
  const openers = [];
  const hearers = [];
  const core = {
    records,
    chat,
    sent: [],
    said: [],
    wire: null,
    reachable: true,
    /** Opens the plugin, as the app does with `ft.open`. */
    open: (opening = {}) =>
      Promise.all(openers.map((handler) => handler({ text: "", dark: false, lang: "en", file: null, ref: null, reminder: null, live: true, chat, ...opening }))),
    /** What the other phone's twin said reaches this one. */
    hear: async (data) => {
      for (const handler of hearers) await handler(data);
    },
    ft: {
      onOpen: (handler) => openers.push(handler),
      say: vi.fn((text) => core.said.push(text)),
      close: vi.fn(),
      send: vi.fn(),
      store: { get: async () => null, set: async () => true, forget: async () => true },
      records: {
        get: async (key) => records.get(key) ?? null,
        set: vi.fn(async (key, value) => {
          const used = [...records].reduce((sum, [k, v]) => sum + (k === key ? 0 : v.length), 0);
          if (used + value.length > quota) return false;
          records.set(key, value);
          return true;
        }),
        forget: async (key) => records.delete(key),
        keys: async (prefix = "") => [...records.keys()].filter((key) => key.startsWith(prefix)).sort(),
        usage: async () => ({ used: [...records.values()].reduce((sum, v) => sum + v.length, 0), quota }),
      },
      live: {
        send: vi.fn(async (data) => {
          core.sent.push(data);
          if (!core.reachable) return false;
          if (core.wire) core.wire(data);
          return true;
        }),
        onMessage: (handler) => hearers.push(handler),
      },
    },
  };
  return core;
}

/**
 * Two phones in one conversation (each with its own `chat` id for it, as in the app): what one
 * sends, the other hears, if its twin is open there.
 * Delivery is a task later, as over the real channel; `settle()` lets everything in flight land.
 */
export function phones(aOptions = {}, bOptions = {}) {
  const a = fakeCore(aOptions);
  const b = fakeCore(bOptions);
  const link = (from, to) => {
    from.wire = (data) => {
      if (to.closed) return;
      setTimeout(() => to.hear(data), 0);
    };
  };
  link(a, b);
  link(b, a);
  return { a, b };
}

/**
 * Lets everything in flight land: messages on their way (fake timers) and the work each table is
 * doing (real: SHA-256 through WebCrypto takes its own time, longer when the machine is busy).
 */
export async function settle(tables, rounds = 12) {
  for (let round = 0; round < rounds; round += 1) {
    await vi.advanceTimersByTimeAsync(1);
    await Promise.all(tables.filter(Boolean).map((table) => table.idle()));
  }
}

/** The checks every game package passes: what `module.json` says. */
export function checkManifest(dir, { id, name, component }) {
  const manifest = JSON.parse(readFileSync(join(dir, "module.json"), "utf8"));
  expect(manifest).toEqual({
    id,
    name,
    version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    minCoreVersion: "1.3.0",
    kind: "game",
    components: [component],
    permissions: { live: true, send: "propose" },
    summary: expect.any(String),
  });
  expect(manifest.summary.length).toBeGreaterThan(10);
  return manifest;
}

/** XML namespaces are names, not addresses: a browser never loads them. Nothing else may appear. */
const NAMESPACES = ["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink", "http://www.w3.org/1999/xhtml"];
/** What the frame may load from a package; the notices are the one text file beside it. */
const LOADED = [".js", ".mjs", ".css", ".html", ".svg", ".json"];
const NOTICES = "THIRD_PARTY_NOTICES.md";

/**
 * What the catalogue signs (`dist/`): under `cap` bytes, with its notices, only files the frame
 * loads plus the notices, and no address anywhere in what runs (the notices may quote a licence's
 * address: the frame never loads them).
 */
export function checkDist(dir, { cap }) {
  const dist = join(dir, "dist");
  let total = 0;
  const files = [];
  const walk = (folder) => {
    for (const entry of readdirSync(folder)) {
      const path = join(folder, entry);
      if (statSync(path).isDirectory()) walk(path);
      else {
        total += statSync(path).size;
        files.push(path);
      }
    }
  };
  walk(dist);
  expect(existsSync(join(dist, "index.js"))).toBe(true);
  expect(existsSync(join(dist, NOTICES))).toBe(true);
  // The kit draws Ionicons (icons.js): every package carries their licence, as the package has it.
  const notices = readFileSync(join(dist, NOTICES), "utf8");
  const ionicons = join(import.meta.dirname, "..", "..", "node_modules", "ionicons");
  const squash = (text) => text.replace(/\s+/g, " ").trim();
  expect(notices).toContain(`## Ionicons ${JSON.parse(readFileSync(join(ionicons, "package.json"), "utf8")).version}`);
  expect(squash(notices)).toContain(squash(readFileSync(join(ionicons, "LICENSE"), "utf8")));
  expect(total).toBeLessThan(cap);
  for (const path of files) {
    if (path.endsWith(`/${NOTICES}`)) continue;
    expect(LOADED, path).toContain(extname(path));
    let text = readFileSync(path, "utf8");
    for (const namespace of NAMESPACES) text = text.split(namespace).join("");
    expect(text, path).not.toMatch(/https?:\/\//i);
  }
  return total;
}

/** Each catalogue has the 21 languages, with the same keys as English, none empty. */
export function checkTexts(catalogue) {
  const languages = Object.keys(catalogue);
  expect(languages.sort()).toEqual(["ar", "bn", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt", "ro", "ru", "th", "tr", "uk", "vi", "zh-CN", "zh-TW"]);
  const keys = Object.keys(catalogue.en).sort();
  for (const lang of languages) {
    expect(Object.keys(catalogue[lang]).sort(), lang).toEqual(keys);
    for (const key of keys) expect(catalogue[lang][key].trim(), `${lang}.${key}`).not.toBe("");
    // A gap like {name} is the same in every language.
    for (const key of keys) {
      const gaps = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
      expect(gaps(catalogue[lang][key]), `${lang}.${key}`).toEqual(gaps(catalogue.en[key]));
    }
  }
}
