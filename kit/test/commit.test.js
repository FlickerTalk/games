// Commit and reveal with SHA-256 (README, "Commit and reveal"): the coin that says who starts,
// dice (batch 3) and a hidden fleet (batch 3). The expected values are fixed vectors computed
// apart from this code: by `kit/test/vectors.py` (Python's hashlib) and checked with `shasum`;
// node:crypto rebuilds the same bytes here by hand as a third witness.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalFleet,
  coinCommit,
  coinToss,
  diceCommit,
  fleetCommit,
  fromHex,
  hex,
  randomBytes,
  rollDice,
  sha256,
  verifyCoin,
  verifyDice,
  verifyFleet,
} from "../src/commit.js";

const G = "match-1";
const R = Uint8Array.from({ length: 32 }, (_, at) => at); // 00 01 … 1f
const O = Uint8Array.from({ length: 32 }, (_, at) => 0xff - at); // ff fe … e0
const SALT = new Uint8Array(32).fill(0x5a);

// From kit/test/vectors.py, cross-checked with shasum (see the README).
const COIN_COMMIT = "97ef4dc55efe32e6f988b2bcabb461202b9da0cb4be70296142daf2720d2fcd2";
const COIN_OUT = "7b3b4e78df4e0fbbed308ebc533e823db88424145e12253fc123612a3d2a3dfb";
const DICE_COMMIT = "84f1ef6babd8bea665ca510bc015d0f407fba092a5a8ef4779b1f0723caecfd6";
const DICE_OUT = "fc933aa01aa06f111dd75a897b6d5b0620e0d2c458fe5a16fe159bfa69d0e0bd";
const DICE_40 = [4, 5, 5, 3, 5, 4, 6, 6, 6, 1, 6, 4, 2, 2, 1, 3, 3, 1, 5, 5, 1, 5, 4, 6, 5, 4, 5, 3, 4, 2, 1, 6, 3, 1, 4, 3, 2, 5, 2, 6];
const FLEET = "A9,A10;E3,E4,E5";
const FLEET_COMMIT = "116b3c477d1eacfaa46b8b9ac2dc4c76b70e2d97f941832904cf80f6534b1e1d";

/** The same layout, built with node:crypto and Buffer, without the kit. */
const node = (...parts) => createHash("sha256").update(Buffer.concat(parts.map((part) => Buffer.from(part)))).digest("hex");
const u32 = (n) => {
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(n);
  return bytes;
};
const zero = Buffer.from([0]);

describe("SHA-256 through WebCrypto", () => {
  it("hashes what it is given, in order, and speaks hex", async () => {
    expect(hex(await sha256(new TextEncoder().encode("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(await sha256(new Uint8Array([1]), new Uint8Array([2])))).toBe(node(Buffer.from([1, 2])));
    expect(fromHex("00ff10")).toEqual(new Uint8Array([0, 255, 16]));
    expect(fromHex("zz")).toBeNull();
    expect(fromHex("abc")).toBeNull();
    const one = randomBytes();
    expect(one).toHaveLength(32);
    expect(hex(one)).not.toBe(hex(randomBytes()));
  });
});

describe("the coin that says who starts", () => {
  it("commits to the committer's bytes with the fixed layout", async () => {
    expect(await coinCommit(G, R)).toBe(COIN_COMMIT);
    expect(node("ftgames-coin-v1", zero, G, zero, u32(0), R)).toBe(COIN_COMMIT);
  });

  it("lands on the side the outcome's first byte says: even, the committer; odd, the other", async () => {
    expect(node("ftgames-coin-v1/out", zero, G, zero, u32(0), R, O)).toBe(COIN_OUT);
    expect(parseInt(COIN_OUT.slice(0, 2), 16) % 2).toBe(1);
    expect(await coinToss(G, R, O)).toBe(1);
    // Another seed that lands even, found with node:crypto, not with the kit.
    let seed = 0;
    const other = () => Uint8Array.from({ length: 32 }, () => seed);
    while (parseInt(node("ftgames-coin-v1/out", zero, G, zero, u32(0), R, other()).slice(0, 2), 16) % 2 !== 0) seed += 1;
    expect(await coinToss(G, R, other())).toBe(0);
  });

  it("accepts the reveal that matches the commitment, and nothing else", async () => {
    expect(await verifyCoin(G, R, COIN_COMMIT)).toBe(true);
    const wrong = R.slice();
    wrong[0] = 1;
    expect(await verifyCoin(G, wrong, COIN_COMMIT)).toBe(false);
    expect(await verifyCoin("match-2", R, COIN_COMMIT)).toBe(false);
    expect(await verifyCoin(G, R.slice(0, 31), COIN_COMMIT)).toBe(false);
  });
});

describe("dice", () => {
  it("commits to roll n with the fixed layout", async () => {
    expect(await diceCommit(G, 15, R)).toBe(DICE_COMMIT);
    expect(node("ftgames-dice-v1", zero, G, zero, u32(15), R)).toBe(DICE_COMMIT);
    expect(await verifyDice(G, 15, R, DICE_COMMIT)).toBe(true);
    expect(await verifyDice(G, 14, R, DICE_COMMIT)).toBe(false);
  });

  it("drops the bytes from 252 up, and hashes again with a counter when the bytes run out", async () => {
    expect(node("ftgames-dice-v1/out", zero, G, zero, u32(15), R, O)).toBe(DICE_OUT);
    // This outcome starts with 0xfc (252): the first die comes from the second byte.
    expect(DICE_OUT.slice(0, 2)).toBe("fc");
    expect(await rollDice(G, 15, R, O, 2)).toEqual([4, 5]);
    // 40 dice need more than 32 bytes: the rest come from SHA-256(d ‖ 1 as u32).
    expect(await rollDice(G, 15, R, O, 40)).toEqual(DICE_40);
  });
});

describe("a hidden fleet", () => {
  it("writes a fleet one way only: cells by letter then number, ships by their first cell", () => {
    expect(canonicalFleet([["E5", "E4", "E3"], ["A10", "A9"]])).toBe(FLEET);
    expect(canonicalFleet([["A9", "A10"], ["E3", "E5", "E4"]])).toBe(FLEET);
  });

  it("commits to salt and fleet with the fixed layout, and checks the reveal", async () => {
    const ships = [["E5", "E4", "E3"], ["A10", "A9"]];
    expect(await fleetCommit(G, SALT, ships)).toBe(FLEET_COMMIT);
    expect(node("ftgames-ships-v1", zero, G, zero, SALT, FLEET)).toBe(FLEET_COMMIT);
    expect(await verifyFleet(G, SALT, ships, FLEET_COMMIT)).toBe(true);
    expect(await verifyFleet(G, SALT, [["E5", "E4", "E3"], ["A10", "B10"]], FLEET_COMMIT)).toBe(false);
  });
});
