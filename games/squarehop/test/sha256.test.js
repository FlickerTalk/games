import { describe, expect, it } from "vitest";
import { fromBase64url, hex, sha256, toBase64url, utf8 } from "../src/sha256.js";

describe("the synchronous SHA-256", () => {
  it("gives the standard digests", () => {
    expect(hex(sha256(utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(utf8("a"), utf8("bc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("writes bytes as base64url and reads them back, refusing anything else", () => {
    const bytes = Uint8Array.from({ length: 24 }, (_, at) => at * 11);
    const text = toBase64url(bytes);
    expect(text).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect([...fromBase64url(text)]).toEqual([...bytes]);
    expect(fromBase64url("a+b/")).toBeNull();
    expect(fromBase64url("abcde")).toBeNull();
    expect(fromBase64url(7)).toBeNull();
  });
});
