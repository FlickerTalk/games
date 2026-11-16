import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fromBase64url, hex, sha256, toBase64url, utf8 } from "../src/sha256.js";

describe("SHA-256 worked out at once", () => {
  it("gives the standard's digests", () => {
    expect(hex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("agrees with the platform's own on messages of every length around a block, given in parts", () => {
    for (let length = 0; length < 140; length += 1) {
      const bytes = Uint8Array.from({ length }, (_, at) => (at * 31 + 7) & 255);
      const expected = createHash("sha256").update(bytes).digest("hex");
      expect(hex(sha256(bytes.slice(0, 5), bytes.slice(5))), String(length)).toBe(expected);
    }
  });

  it("writes bytes as base64url and reads them back, refusing anything else", () => {
    const bytes = Uint8Array.from({ length: 12 }, (_, at) => 250 - at * 17);
    const text = toBase64url(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect([...fromBase64url(text)]).toEqual([...bytes]);
    expect(toBase64url(sha256(utf8("abc")))).toHaveLength(43);
    expect(fromBase64url("a b")).toBeNull();
    expect(fromBase64url("a")).toBeNull();
    expect(fromBase64url(12)).toBeNull();
  });
});
