// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { policy, start } from "./serve.js";

let server;
let base;

beforeAll(async () => {
  server = await start(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server.close());

describe("the review harness", () => {
  it("writes the core's policy for a plugin without network, for its own origin", () => {
    expect(policy("http://127.0.0.1:9")).toBe(
      "default-src 'none'; script-src http://127.0.0.1:9; style-src http://127.0.0.1:9 'unsafe-inline'; " +
        "img-src http://127.0.0.1:9 data: blob:; font-src http://127.0.0.1:9; connect-src 'none'; base-uri 'none'; " +
        "form-action 'none'; child-src 'none'; frame-ancestors http://127.0.0.1:9",
    );
  });

  it("serves a game's frame, its bridge and its dist/ under that policy", async () => {
    const frame = await fetch(`${base}/frame/tictactoe/a/frame.html`);
    expect(frame.status).toBe(200);
    expect(frame.headers.get("content-security-policy")).toBe(policy(base));
    expect(frame.headers.get("access-control-allow-origin")).toBe("*");
    const html = await frame.text();
    expect(html).toContain("<ft-tictactoe");
    expect(html).toContain('src="./frame.js"');
    const bridge = await (await fetch(`${base}/frame/tictactoe/a/frame.js`)).text();
    for (const call of ["ft.ready", "ft.liveSend", "ft.recordSet", "ft.text", 'import("./dist/index.js")']) expect(bridge).toContain(call);
    expect(bridge).toMatch(/chat: typeof said\.chat === "string" \? said\.chat : undefined/);
    expect(bridge).toContain('said.type === "ft.theme"');
    expect(bridge).toContain("document.documentElement.style.setProperty");
    const code = await fetch(`${base}/frame/tictactoe/b/dist/index.js`);
    expect(code.headers.get("content-type")).toContain("javascript");
    expect(code.headers.get("content-security-policy")).toBe(policy(base));
  });

  it("lends Ionic to the frame as the app does: its stylesheet and components before the game's module", async () => {
    const html = await (await fetch(`${base}/frame/tictactoe/a/frame.html`)).text();
    expect(html).toMatch(/<html lang="en" data-ionic="9\.0\.4">/);
    const css = html.indexOf('href="./ionic/ionic.css"');
    const lender = html.indexOf('src="./ionic/ionic.js"');
    expect(css).toBeGreaterThan(0);
    expect(lender).toBeGreaterThan(css);
    expect(html.indexOf('src="./frame.js"')).toBeGreaterThan(lender);
    const script = await fetch(`${base}/frame/tictactoe/a/ionic/ionic.js`);
    expect(script.status).toBe(200);
    expect(script.headers.get("content-type")).toContain("javascript");
    expect(script.headers.get("content-security-policy")).toBe(policy(base));
    const code = await script.text();
    for (const tag of ["ion-alert", "ion-button", "ion-buttons", "ion-content", "ion-header", "ion-title", "ion-toolbar"]) expect(code, tag).toContain(tag);
    expect(code).toContain("ion-range");
    expect(code).not.toMatch(/\beval\(|new Function\(|\bimport\(/);
    const sheet = await fetch(`${base}/frame/tictactoe/a/ionic/ionic.css`);
    expect(sheet.headers.get("content-type")).toContain("text/css");
    const rules = await sheet.text();
    expect(rules).toContain("ion-color-primary");
    expect(rules).not.toMatch(/body\s*\{[^}]*position:\s*fixed/);
    expect(rules).toMatch(/\*\s*\{[^}]*box-sizing:\s*border-box/);
  });

  it("lends the frame the player the app shares with every game, kept per phone across the games opened in one tab", async () => {
    const bridge = await (await fetch(`${base}/frame/tictactoe/a/frame.js`)).text();
    expect(bridge).toMatch(/player: \{\s*get: \(\) => ask\("ft\.playerGet"\)/);
    expect(bridge).toContain('ask("ft.playerSet", { player })');
    const host = await (await fetch(`${base}/?game=tictactoe`)).text();
    expect(host).toContain('case "ft.playerGet":');
    expect(host).toContain('case "ft.playerSet":');
    expect(host).toContain("sessionStorage.setItem(`player-${side}`");
  });

  it("opens one phone alone in a match against itself with &solo, as the app opens the FlickerTalk conversation", async () => {
    const bridge = await (await fetch(`${base}/frame/tictactoe/a/frame.js`)).text();
    expect(bridge).toContain("solo: said.solo === true");
    const host = await (await fetch(`${base}/?game=tictactoe&solo`)).text();
    expect(host).toContain('const solo = params.has("solo");');
    expect(host).toMatch(/live: !solo && !alone,[^\n]*solo,/);
    expect(host).toContain('if (!solo && !alone) open("b");');
    expect(host).toContain("devices.b.hidden = solo || alone;");
  });

  it("opens one phone with the game outside any conversation with &alone, as the app opens it from its own page", async () => {
    const host = await (await fetch(`${base}/?game=tilecourt&alone`)).text();
    expect(host).toContain('const alone = params.has("alone");');
    expect(host).toMatch(/live: !solo && !alone,[^\n]*chat: alone \? undefined :/);
    expect(host).toContain('tilecourt: "Tile Court"');
  });

  it("gives a game the whole window as the app does: data-fill on the frame's root from the theme message, its page as tall as the frame", async () => {
    const html = await (await fetch(`${base}/frame/tictactoe/a/frame.html`)).text();
    expect(html).toContain("html[data-fill],html[data-fill] body{height:100%}");
    const bridge = await (await fetch(`${base}/frame/tictactoe/a/frame.js`)).text();
    expect(bridge).toContain('if (said.fill === true) document.documentElement.dataset.fill = "1";');
    expect(bridge).toContain("else delete document.documentElement.dataset.fill;");
    const host = await (await fetch(`${base}/?game=tictactoe`)).text();
    expect(host).toMatch(/type: "ft\.theme", theme: theme\?\.vars \?\? null, dark, fill: phones\[side\]\.full, fullscreen: phones\[side\]\.full/);
    expect(host).toMatch(/\.device\.full \.sheet iframe \{[^}]*height: 100% !important/);
    expect(host).toContain("window.harness = { open, close, connect: (yes) => (connected = yes), phones, setTheme, fill };");
  });

  it("serves the host page, and nothing outside a game's dist/", async () => {
    expect((await fetch(`${base}/?game=tictactoe`)).status).toBe(200);
    expect((await fetch(`${base}/frame/tictactoe/a/src/rules.js`)).status).toBe(404);
    expect((await fetch(`${base}/frame/tictactoe/a/dist/..%2F..%2Fmodule.json`)).status).toBe(404);
    expect((await fetch(`${base}/frame/nope/a/frame.html`)).status).toBe(404);
  });
});
