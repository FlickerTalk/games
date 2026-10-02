#!/usr/bin/env python3
"""The fixed SHA-256 vectors of the commit-reveal, computed apart from the JavaScript.

This is an independent reference: Python's hashlib, written from the byte layout in the README,
not from the kit's code. Its output is pasted into commit.test.js; if the two ever disagree, one of
them broke the layout. Run: python3 kit/test/vectors.py
"""
import hashlib
import struct

G = "match-1".encode()
R_R = bytes(range(0x00, 0x20))          # the committer's 32 random bytes: 00 01 .. 1f
R_O = bytes(range(0xFF, 0xDF, -1))      # the other side's 32 random bytes: ff fe .. e0
SALT = bytes([0x5A]) * 32


def sha(*parts):
    return hashlib.sha256(b"".join(parts)).digest()


def u32(n):
    return struct.pack(">I", n)


def commitment(domain, n, r):
    return sha(domain.encode(), b"\0", G, b"\0", u32(n), r)


def outcome(domain, n, r, o):
    return sha((domain + "/out").encode(), b"\0", G, b"\0", u32(n), r, o)


def dice(n, count):
    d = outcome("ftgames-dice-v1", n, R_R, R_O)
    block, counter, out = d, 0, []
    while True:
        for b in block:
            if b < 252:
                out.append(b % 6 + 1)
                if len(out) == count:
                    return d, out
        counter += 1
        block = sha(d, u32(counter))


def canonical(ships):
    key = lambda cell: (cell[0], int(cell[1:]))
    sorted_ships = [sorted(ship, key=key) for ship in ships]
    sorted_ships.sort(key=lambda ship: key(ship[0]))
    return ";".join(",".join(ship) for ship in sorted_ships)


print("coin commitment n=0:", commitment("ftgames-coin-v1", 0, R_R).hex())
coin = outcome("ftgames-coin-v1", 0, R_R, R_O)
print("coin outcome n=0:   ", coin.hex(), "first byte", coin[0], "-> starts:", "a" if coin[0] % 2 == 0 else "b")
print("dice commitment n=15:", commitment("ftgames-dice-v1", 15, R_R).hex())
d, faces = dice(15, 40)
print("dice outcome n=15:   ", d.hex(), "bytes >= 252 in it:", [b for b in d if b >= 252])
print("dice n=15, 40 faces: ", faces)
print("dice block 1:       ", sha(d, u32(1)).hex())
fleet = canonical([["E5", "E4", "E3"], ["A10", "A9"]])
print("fleet canonical:    ", fleet)
print("fleet commitment:   ", sha(b"ftgames-ships-v1", b"\0", G, b"\0", SALT, fleet.encode()).hex())
who = sha(b"ftgames-who-v1", b"\0", G, b"\0", b"n0nce0000000000x", b"\0", b"wa000000000000id")
print("who proof:          ", who.hex())
