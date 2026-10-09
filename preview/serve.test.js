// The review harness (`npm run preview`): two phones side by side, each game in a sandboxed frame
// served like the app serves a plugin — the same Content-Security-Policy as the core builds for a
// plugin without network (`ft-plugins`, `content_security_policy`), with this server's origin in
// place of the plugin scheme, and CORS for module scripts in a frame with an opaque origin.
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
    // The conversation the game is open in reaches onOpen, as the app hands it over.
    expect(bridge).toMatch(/chat: typeof said\.chat === "string" \? said\.chat : undefined/);
    // The app's colours land on the frame's root at opening, and again whenever the theme changes.
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
    // Nothing the frame's policy refuses.
    expect(code).not.toMatch(/\beval\(|new Function\(|\bimport\(/);
    // Ionic's stylesheet but for structure.css's body rules (its first rule stays): a frame sized
    // by its content, as the game room's is, keeps growing and shrinking with it.
    const sheet = await fetch(`${base}/frame/tictactoe/a/ionic/ionic.css`);
    expect(sheet.headers.get("content-type")).toContain("text/css");
    const rules = await sheet.text();
    expect(rules).toContain("ion-color-primary");
    expect(rules).not.toMatch(/body\s*\{[^}]*position:\s*fixed/);
    expect(rules).toMatch(/\*\s*\{[^}]*box-sizing:\s*border-box/);
  });

  it("serves the host page, and nothing outside a game's dist/", async () => {
    expect((await fetch(`${base}/?game=tictactoe`)).status).toBe(200);
    expect((await fetch(`${base}/frame/tictactoe/a/src/rules.js`)).status).toBe(404);
    expect((await fetch(`${base}/frame/tictactoe/a/dist/..%2F..%2Fmodule.json`)).status).toBe(404);
    expect((await fetch(`${base}/frame/nope/a/frame.html`)).status).toBe(404);
  });
});
