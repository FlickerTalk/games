// The envelope every game message travels in (README, "Protocol"): JSON, UTF-8, base64, under
// what the core lets through; anything that is not ours, or is newer than us, is not applied.
import { describe, expect, it } from "vitest";
import { KV, LIMIT, PROTOCOL, fromBase64, isId, seal, toBase64, unseal } from "../src/envelope.js";

const ours = { g: "tictactoe", gv: 1 };
const message = (extra = {}) => ({ p: PROTOCOL, kv: KV, g: "tictactoe", gv: 1, k: "hello", doc: "m1", who: "w1", app: "1.0.0", ...extra });

describe("the envelope", () => {
  it("is JSON in UTF-8 in base64, and comes back as it went", () => {
    const sealed = seal(message({ note: "ñ ✖️ 中" }));
    expect(typeof sealed).toBe("string");
    expect(JSON.parse(new TextDecoder().decode(fromBase64(sealed)))).toMatchObject({ p: "ftgame", kv: 1, note: "ñ ✖️ 中" });
    expect(unseal(sealed, ours)).toEqual({ message: message({ note: "ñ ✖️ 中" }) });
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  it("refuses to seal what the core would not carry", () => {
    expect(LIMIT).toBe(48 * 1024);
    expect(() => seal(message({ pad: "x".repeat(LIMIT) }))).toThrow("too_big");
  });

  it("ignores what is not ours, not well formed, or not for this game", () => {
    expect(unseal("not base64 at all!", ours)).toBeNull();
    expect(unseal(toBase64(new TextEncoder().encode("[1,2]")), ours)).toBeNull();
    expect(unseal(seal({ ...message(), p: "ftlist" }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), g: "chess" }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), k: 3 }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), k: "dance" }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), kv: "1" }), ours)).toBeNull();
    // A match id becomes a record key: only a plain name gets through.
    expect(unseal(seal({ ...message(), doc: "../../etc" }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), doc: "x".repeat(65) }), ours)).toBeNull();
    expect(unseal(seal({ ...message(), who: "" }), ours)).toBeNull();
  });

  it("says when the other phone speaks a newer protocol or newer rules, and applies nothing", () => {
    expect(unseal(seal(message({ kv: KV + 1, app: "2.0.0" })), ours)).toEqual({ newer: { app: "2.0.0" } });
    expect(unseal(seal(message({ gv: 2, app: "1.4.0" })), ours)).toEqual({ newer: { app: "1.4.0" } });
    // Without a version to show, it still says so.
    expect(unseal(seal({ ...message({ kv: 9 }), app: 3 }), ours)).toEqual({ newer: { app: "" } });
  });

  it("reads an older or equal version, and ignores fields it does not know", () => {
    expect(unseal(seal(message({ gv: 0, future: { x: 1 } })), ours).message).toMatchObject({ k: "hello", future: { x: 1 } });
  });

  it("knows a plain id when it sees one", () => {
    expect(isId("a-Z_09")).toBe(true);
    expect(isId("")).toBe(false);
    expect(isId("a/b")).toBe(false);
    expect(isId(7)).toBe(false);
  });
});
