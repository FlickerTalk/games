import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { expect, vi } from "vitest";

export { toy } from "./toy.js";

const lastChat = new WeakMap();
let chats = 0;

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
    open: (opening = {}) =>
      Promise.all(openers.map((handler) => handler({ text: "", dark: false, lang: "en", file: null, ref: null, reminder: null, live: true, chat, ...opening }))),
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

export async function settle(tables, rounds = 12) {
  for (let round = 0; round < rounds; round += 1) {
    await vi.advanceTimersByTimeAsync(1);
    await Promise.all(tables.filter(Boolean).map((table) => table.idle()));
  }
}

export function within(element, selector) {
  return element.querySelector(selector) ?? element.alert?.querySelector(selector) ?? null;
}

const CHILDREN = (globalThis.Node && Object.getOwnPropertyDescriptor(Node.prototype, "childNodes")?.get) ?? function () {
  return this.childNodes;
};

export function words(node) {
  if (!node) return "";
  if (node.nodeType === 3) return node.data;
  return [...CHILDREN.call(node)].map(words).join("");
}

export function checkManifest(dir, { id, name, component }) {
  const manifest = JSON.parse(readFileSync(join(dir, "module.json"), "utf8"));
  expect(manifest).toEqual({
    id,
    name,
    version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    minCoreVersion: "1.6.0",
    kind: "game",
    icon: expect.stringMatching(/^[a-z0-9-]+$/),
    components: [component],
    permissions: { live: true, send: "propose" },
    summary: expect.any(String),
    ...("locales" in manifest ? { locales: expect.any(Object) } : {}),
  });
  expect(manifest.summary.length).toBeGreaterThan(10);
  return manifest;
}

export const LOCALES = ["es", "pt", "fr", "de", "it", "ro", "ru", "uk", "pl", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];

export function checkLocales(manifest, texts, { brands = [] } = {}) {
  const locales = manifest.locales;
  expect(locales, "module.json has no locales").toBeTypeOf("object");
  expect(Object.keys(locales).sort()).toEqual([...LOCALES].sort());
  const length = (text) => [...text].length;
  for (const lang of LOCALES) {
    const { name, summary, ...rest } = locales[lang];
    expect(rest, lang).toEqual({});
    expect(name, `${lang}.name`).toBe(texts[lang].name);
    expect(name.trim(), `${lang}.name`).not.toBe("");
    expect(length(name), `${lang}.name`).toBeLessThanOrEqual(64);
    expect(summary, `${lang}.summary`).toBeTypeOf("string");
    expect(summary.trim(), `${lang}.summary`).not.toBe("");
    expect(length(summary), `${lang}.summary`).toBeLessThanOrEqual(200);
    for (const brand of brands) expect(`${name} ${summary}`, lang).not.toMatch(brand);
  }
  return locales;
}

const NAMESPACES = ["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink", "http://www.w3.org/1999/xhtml"];
const LOADED = [".js", ".mjs", ".css", ".html", ".svg", ".json"];
const NOTICES = "THIRD_PARTY_NOTICES.md";

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
  const notices = readFileSync(join(dist, NOTICES), "utf8");
  const ionicons = join(import.meta.dirname, "..", "..", "node_modules", "ionicons");
  const squash = (text) => text.replace(/\s+/g, " ").trim();
  expect(notices).toContain(`## Ionicons ${JSON.parse(readFileSync(join(ionicons, "package.json"), "utf8")).version}`);
  expect(squash(notices)).toContain(squash(readFileSync(join(ionicons, "LICENSE"), "utf8")));
  expect(total).toBeLessThan(cap);
  const code = readFileSync(join(dist, "index.js"), "utf8");
  for (const mark of ["@ionic/core", "@stencil/core", "proxyCustomElement", "defineCustomElement", "ionicframework", "ion-ripple-effect"]) {
    expect(code.includes(mark), `${mark} in ${dist}`).toBe(false);
  }
  for (const path of files) {
    if (path.endsWith(`/${NOTICES}`)) continue;
    expect(LOADED, path).toContain(extname(path));
    let text = readFileSync(path, "utf8");
    for (const namespace of NAMESPACES) text = text.split(namespace).join("");
    expect(text, path).not.toMatch(/https?:\/\//i);
  }
  return total;
}

export function checkTexts(catalogue) {
  const languages = Object.keys(catalogue);
  expect(languages.sort()).toEqual(["ar", "bn", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "pl", "pt", "ro", "ru", "th", "tr", "uk", "vi", "zh-CN", "zh-TW"]);
  const keys = Object.keys(catalogue.en).sort();
  for (const lang of languages) {
    expect(Object.keys(catalogue[lang]).sort(), lang).toEqual(keys);
    for (const key of keys) expect(catalogue[lang][key].trim(), `${lang}.${key}`).not.toBe("");
    for (const key of keys) {
      const gaps = (text) => (text.match(/\{\w+\}/g) ?? []).sort();
      expect(gaps(catalogue[lang][key]), `${lang}.${key}`).toEqual(gaps(catalogue.en[key]));
    }
  }
}
