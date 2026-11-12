// Nothing of the app is copied: the bridge is written from the Plugin API (plugin-sdk, MIT).
import { build } from "esbuild";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const root = join(import.meta.dirname, "..");

/** The CSP ft-plugins gives a plugin frame without network, for `origin`. */
export function policy(origin) {
  return (
    `default-src 'none'; script-src ${origin}; style-src ${origin} 'unsafe-inline'; ` +
    `img-src ${origin} data: blob:; font-src ${origin}; connect-src 'none'; base-uri 'none'; ` +
    `form-action 'none'; child-src 'none'; frame-ancestors ${origin}`
  );
}

function frameHtml(component) {
  return `<!doctype html>
<html lang="en" data-ionic="${IONIC}">
<head>
<meta charset="utf-8">
<style>html{color-scheme:light dark}html,body{margin:0;padding:0;background:transparent}</style>
<link rel="stylesheet" href="./ionic/ionic.css">
<script type="module" src="./ionic/ionic.js"></script>
<script type="module" src="./frame.js"></script>
</head>
<body>
<${component} id="view"></${component}>
</body>
</html>
`;
}

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
// How tall the game is, as the app measures it: the bottom of the body.
const tell = () => post({ type: "ft.height", height: Math.ceil(document.body.getBoundingClientRect().bottom + scrollY) });
/** The app's colours on the root, as the app's frame sets them: Ionic's variables and data-dark. */
const THEMED = ["--ion-background-color", "--ion-text-color", "--ion-color-medium", "--ion-item-background", "--ion-border-color", "--ion-color-primary", "--ion-color-primary-contrast", "--ion-color-success", "--ion-color-danger"];
const theme = (vars, dark) => {
  for (const name of THEMED) {
    if (vars && vars[name]) document.documentElement.style.setProperty(name, vars[name]);
    else document.documentElement.style.removeProperty(name);
  }
  if (dark) document.documentElement.dataset.dark = "1";
  else delete document.documentElement.dataset.dark;
};
addEventListener("message", (event) => {
  const said = event.data;
  if (!said || typeof said.type !== "string") return;
  if (said.type === "ft.open") {
    theme(said.theme, said.dark);
    document.documentElement.lang = said.lang;
    for (const handler of opened) handler({ text: "", dark: Boolean(said.dark), lang: String(said.lang), file: null, ref: null, reminder: null, live: Boolean(said.live), chat: typeof said.chat === "string" ? said.chat : undefined });
    requestAnimationFrame(tell);
  } else if (said.type === "ft.theme") {
    theme(said.theme, said.dark);
  } else if (said.type === "ft.live") {
    for (const handler of heard) handler(String(said.data));
  } else if (said.type === "ft.done") {
    const answer = waiting.get(said.id);
    waiting.delete(said.id);
    if (answer) answer(said.answer ?? null);
  }
});
const sizes = new ResizeObserver(tell);
sizes.observe(document.documentElement);
sizes.observe(document.body);
post({ type: "ft.ready" });
`;

const LENT = ["ion-alert", "ion-button", "ion-buttons", "ion-content", "ion-header", "ion-title", "ion-toolbar"];

const IONIC_CSS = join(root, "node_modules", "@ionic", "core", "css");
const IONIC = JSON.parse(readFileSync(join(root, "node_modules", "@ionic", "core", "package.json"), "utf8")).version;

/** ionic.bundle.css minus structure.css's body rules, so a frame sized by its content can follow it. */
function ionicCss() {
  const read = (name) => readFileSync(join(IONIC_CSS, `${name}.css`), "utf8").replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*$/, "").trim();
  const first = /^\*\{[^}]*\}/.exec(read("structure"));
  if (!first) throw new Error("structure.css no longer starts with its * rule");
  return [...["normalize", "core", "typography", "display", "padding", "float-elements", "text-alignment", "text-transformation", "flex-utils"].map(read), first[0]].join("\n");
}

let lender = null;
function ionicLender() {
  lender ??= build({
    stdin: {
      contents: `import { initialize } from "@ionic/core/components";\n${LENT.map((tag, at) => `import { defineCustomElement as c${at} } from "@ionic/core/components/${tag}.js";`).join("\n")}\ninitialize();\n${LENT.map((_, at) => `c${at}();`).join("\n")}\n`,
      resolveDir: root,
      loader: "js",
    },
    bundle: true,
    format: "esm",
    minify: true,
    legalComments: "none",
    write: false,
    logLevel: "silent",
  }).then((out) => out.outputFiles[0].contents);
  return lender;
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8" };

function gameDir(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  const dir = join(root, "games", name);
  return existsSync(join(dir, "module.json")) ? dir : null;
}

async function route(url, origin) {
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
  if (file === "ionic/ionic.js") return framed(await ionicLender(), TYPES[".js"]);
  if (file === "ionic/ionic.css") return framed(ionicCss(), TYPES[".css"]);
  if (!file.startsWith("dist/")) return null;
  const dist = join(dir, "dist");
  const target = normalize(join(dir, file));
  if (!target.startsWith(dist + sep) || !existsSync(target) || !statSync(target).isFile()) return null;
  return framed(readFileSync(target), TYPES[extname(target)] ?? "application/octet-stream");
}

export function start(port = 5178) {
  const server = createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    let answer = null;
    try {
      answer = await route(new URL(request.url, origin), origin);
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
