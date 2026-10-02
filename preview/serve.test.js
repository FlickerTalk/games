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
    const code = await fetch(`${base}/frame/tictactoe/b/dist/index.js`);
    expect(code.headers.get("content-type")).toContain("javascript");
    expect(code.headers.get("content-security-policy")).toBe(policy(base));
  });

  it("serves the host page, and nothing outside a game's dist/", async () => {
    expect((await fetch(`${base}/?game=tictactoe`)).status).toBe(200);
    expect((await fetch(`${base}/frame/tictactoe/a/src/rules.js`)).status).toBe(404);
    expect((await fetch(`${base}/frame/tictactoe/a/dist/..%2F..%2Fmodule.json`)).status).toBe(404);
    expect((await fetch(`${base}/frame/nope/a/frame.html`)).status).toBe(404);
  });
});
