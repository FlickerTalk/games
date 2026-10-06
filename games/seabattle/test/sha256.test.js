// The game's own SHA-256, which the rules run synchronously: the same bytes in give the same hash
// as the kit's WebCrypto digest and node:crypto, including the kit's fixed vector for a fleet.
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalFleet, fleetCommitHex } from "../src/rules.js";
import { fromBase64url, hex, sha256, toBase64url, utf8 } from "../src/sha256.js";

describe("the game's SHA-256", () => {
  it("hashes the FIPS vectors and what node:crypto hashes, at every length around a block", () => {
    expect(hex(sha256(utf8("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(new Uint8Array(0)))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    for (let length = 0; length < 200; length += 1) {
      const bytes = randomBytes(length);
      expect(hex(sha256(new Uint8Array(bytes))), String(length)).toBe(createHash("sha256").update(bytes).digest("hex"));
    }
    expect(hex(sha256(new Uint8Array([1]), new Uint8Array([2])))).toBe(createHash("sha256").update(Buffer.from([1, 2])).digest("hex"));
  });

  it("writes the kit's fleet commitment with the kit's layout, given the kit's vector", () => {
    // kit/test/commit.test.js: g = "match-1", salt = 5a × 32, fleet "A9,A10;E3,E4,E5".
    const salt = new Uint8Array(32).fill(0x5a);
    const kit = hex(sha256(utf8("ftgames-ships-v1"), new Uint8Array([0]), utf8("match-1"), new Uint8Array([0]), salt, utf8("A9,A10;E3,E4,E5")));
    expect(kit).toBe("116b3c477d1eacfaa46b8b9ac2dc4c76b70e2d97f941832904cf80f6534b1e1d");
    // The game's own commitment uses the same layout with no match id (the rules do not know it).
    const ships = [{ start: 8, o: "h", len: 2 }, { start: 42, o: "h", len: 3 }];
    expect(canonicalFleet(ships)).toBe("A9,A10;E3,E4,E5");
    expect(fleetCommitHex(salt, ships)).toBe(hex(sha256(utf8("ftgames-ships-v1"), new Uint8Array([0]), new Uint8Array([0]), salt, utf8("A9,A10;E3,E4,E5"))));
  });

  it("speaks base64url without padding, both ways", () => {
    for (let length = 0; length < 60; length += 1) {
      const bytes = new Uint8Array(randomBytes(length));
      const text = toBase64url(bytes);
      expect(text).toBe(Buffer.from(bytes).toString("base64url"));
      expect(hex(fromBase64url(text))).toBe(hex(bytes));
    }
    expect(fromBase64url("a")).toBeNull();
    expect(fromBase64url("ab+/")).toBeNull();
    expect(fromBase64url(42)).toBeNull();
  });
});
