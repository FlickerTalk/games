// The review harness: `npm run preview` serves two phones side by side, each running a game in a
// sandboxed frame built like the app's plugin sheet, and the page between them plays the core:
// records in memory, the live channel from one frame to the other (or nowhere, when a phone has
// the game closed or the connection is off), `say` into a mock composer. Nothing of the app is
// copied: the bridge below is written from the Plugin API (plugin-sdk, MIT); the policy string is
// the one the core builds for a plugin without network, with this server's origin.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const root = join(import.meta.dirname, "..");

/** The Content-Security-Policy of a plugin frame without network (ft-plugins), for `origin`. */
export function policy(origin) {
  return (
    `default-src 'none'; script-src ${origin}; style-src ${origin} 'unsafe-inline'; ` +
    `img-src ${origin} data: blob:; font-src ${origin}; connect-src 'none'; base-uri 'none'; ` +
    `form-action 'none'; child-src 'none'; frame-ancestors ${origin}`
  );
}

/** The frame document: the game's component and the bridge, as the app's frame has them. */
function frameHtml(component) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>html{color-scheme:light dark}html,body{margin:0;padding:0;background:transparent}</style>
<script type="module" src="./frame.js"></script>
</head>
<body>
<${component} id="view"></${component}>
</body>
</html>
`;
}

/** `ft` inside the frame: every call is a message to the page, which answers as the core would. */
const BRIDGE = `const post = (message) => parent.postMessage(message, "*");
const opened = [];
const heard = [];
const waiting = new Map();
let asked = 0;
const ask = (type, message = {}) => {
  const id = "q" + (asked += 1);
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    post({ ...message, type, id });
  });
};
globalThis.ft = {
  onOpen: (handler) => opened.push(handler),
  pickFile: () => Promise.resolve(null),
  send: (name, mime, data) => post({ type: "ft.made", name: String(name), mime: String(mime), data: String(data) }),
  say: (text) => post({ type: "ft.text", text: String(text) }),
  save: () => Promise.resolve(false),
  print: () => Promise.resolve(false),
  fetch: () => Promise.resolve(false),
  store: {
    get: (key) => ask("ft.read", { key: String(key) }),
    set: (key, value) => ask("ft.write", { key: String(key), value: String(value) }),
    forget: (key) => ask("ft.forget", { key: String(key) }),
  },
  records: {
    get: (key) => ask("ft.recordGet", { key: String(key) }),
    set: (key, value) => ask("ft.recordSet", { key: String(key), value: String(value) }),
    forget: (key) => ask("ft.recordForget", { key: String(key) }),
    keys: (prefix) => ask("ft.recordKeys", { prefix: String(prefix ?? "") }),
    usage: () => ask("ft.recordUsage"),
  },
  live: {
    send: (data) => ask("ft.liveSend", { data: String(data) }),
    onMessage: (handler) => heard.push(handler),
  },
  close: () => post({ type: "ft.close" }),
};
await import("./dist/index.js");
const tell = () => post({ type: "ft.height", height: document.documentElement.scrollHeight });
addEventListener("message", (event) => {
  const said = event.data;
  if (!said || typeof said.type !== "string") return;
  if (said.type === "ft.open") {
    if (said.dark) document.documentElement.dataset.dark = "1";
    document.documentElement.lang = said.lang;
    for (const handler of opened) handler({ text: "", dark: Boolean(said.dark), lang: String(said.lang), file: null, ref: null, reminder: null, live: Boolean(said.live), chat: typeof said.chat === "string" ? said.chat : undefined });
    requestAnimationFrame(tell);
  } else if (said.type === "ft.live") {
    for (const handler of heard) handler(String(said.data));
  } else if (said.type === "ft.done") {
    const answer = waiting.get(said.id);
    waiting.delete(said.id);
    if (answer) answer(said.answer ?? null);
  }
});
new ResizeObserver(tell).observe(document.documentElement);
post({ type: "ft.ready" });
`;

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };

/** The game folder for a name, if it is one. */
function gameDir(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  const dir = join(root, "games", name);
  return existsSync(join(dir, "module.json")) ? dir : null;
}

function route(url, origin) {
  const path = decodeURIComponent(url.pathname);
  if (path === "/") return { body: readFileSync(join(import.meta.dirname, "host.html")), type: TYPES[".html"] };
  const match = path.match(/^\/frame\/([^/]+)\/([ab])\/(.+)$/);
  if (!match) return null;
  const dir = gameDir(match[1]);
  if (!dir) return null;
  const framed = (body, type) => ({ body, type, headers: { "content-security-policy": policy(origin), "access-control-allow-origin": "*" } });
  const file = match[3];
  if (file === "frame.html") return framed(frameHtml(JSON.parse(readFileSync(join(dir, "module.json"), "utf8")).components[0]), TYPES[".html"]);
  if (file === "frame.js") return framed(BRIDGE, TYPES[".js"]);
  if (!file.startsWith("dist/")) return null;
  const dist = join(dir, "dist");
  const target = normalize(join(dir, file));
  if (!target.startsWith(dist + sep) || !existsSync(target) || !statSync(target).isFile()) return null;
  return framed(readFileSync(target), TYPES[extname(target)] ?? "application/octet-stream");
}

/** Starts the harness on `port` (0: any free one). */
export function start(port = 5178) {
  const server = createServer((request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    let answer = null;
    try {
      answer = route(new URL(request.url, origin), origin);
    } catch {
      answer = null;
    }
    if (!answer) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": answer.type, "cache-control": "no-store", ...answer.headers }).end(answer.body);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === import.meta.filename) {
  const server = await start(Number(process.env.PORT ?? 5178));
  const { port } = server.address();
  console.log(`games preview: http://127.0.0.1:${port}/?game=tictactoe   (&lang=ar, &dark, &layout=tablet)`);
}
