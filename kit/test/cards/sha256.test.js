import { describe, expect, it } from "vitest";
import { fromBase64url, hex, sha256, toBase64url, utf8 } from "../../src/cards/sha256.js";

describe("SHA-256 computed in step with the rules", () => {
  it("gives the standard's digests", () => {
    expect(hex(sha256(utf8("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(utf8("a"), utf8("bc")))).toBe(hex(sha256(utf8("abc"))));
    expect(hex(sha256(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe("248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  });

  it("writes bytes as text a move can carry, and reads them back", () => {
    const bytes = Uint8Array.from({ length: 24 }, (_, at) => at * 9);
    expect(toBase64url(bytes)).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(fromBase64url(toBase64url(bytes))).toEqual(bytes);
    expect(fromBase64url("not base64!")).toBeNull();
  });
});
