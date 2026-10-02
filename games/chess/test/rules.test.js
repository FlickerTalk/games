// The rules of chess as the kit asks for them, all through chess.js: side 0 (who starts the round)
// plays white, side 1 black. A move is UCI: from, to and, for a promotion, the piece (`e2e4`,
// `e7e8q`). Checkmate wins; stalemate, insufficient material, a threefold repetition and the
// fifty-move rule end the round in a draw on their own, as chess.js reports them.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { START, initial, line, pgn, play, result, turn, verdict } from "../src/rules.js";

/** Plays the moves in order, the sides taking turns from white. */
function after(...moves) {
  let state = initial();
  for (const move of moves) {
    const played = play(state, move, turn(state));
    if (played.error) throw new Error(`${move}: ${played.error}`);
    state = played.state;
  }
  return state;
}

// Morphy against the Duke of Brunswick and Count Isouard, Paris 1858: the "Opera game".
const OPERA = "e2e4 e7e5 g1f3 d7d6 d2d4 c8g4 d4e5 g4f3 d1f3 d6e5 f1c4 g8f6 f3b3 d8e7 b1c3 c7c6 c1g5 b7b5 c3b5 c6b5 c4b5 b8d7 e1c1 a8d8 d1d7 d8d7 h1d1 e7e6 b5d7 f6d7 b3b8 d7b8 d1d8".split(" ");
// Sam Loyd's stalemate in ten moves.
const LOYD = "e2e3 a7a5 d1h5 a8a6 h5a5 h7h5 h2h4 a6h6 a5c7 f7f6 c7d7 e8f7 d7b7 d8d3 b7b8 d3h7 b8c8 f7g6 c8e6".split(" ");
// A white pawn that walks to b7 with a8, b8 and c8 to take.
const TO_PROMOTE = "a2a4 b7b5 a4b5 a7a6 b5a6 c8b7 a6b7 b8c6".split(" ");

describe("chess", () => {
  it("starts from the usual position, white (side 0) to move, and the sides take turns", () => {
    const state = initial();
    expect(state.fen).toBe(START);
    expect(START).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(line(state)).toEqual([]);
    expect(turn(state)).toBe(0);
    expect(turn(after("e2e4"))).toBe(1);
    expect(turn(after("e2e4", "e7e5"))).toBe(0);
    // chess.js names the en passant square only when a pawn could take there.
    expect(after("e2e4").fen).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
    expect(after("e2e4", "a7a6", "e4e5", "d7d5").fen).toBe("rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3");
    expect(result(after("e2e4"))).toBeNull();
  });

  it("refuses an illegal move, the wrong side, a move after the end, and what is not a move", () => {
    expect(play(initial(), "e2e5", 0)).toEqual({ error: "illegal" });
    expect(play(initial(), "e7e5", 0)).toEqual({ error: "illegal" }); // black's pawn, on white's turn
    expect(play(initial(), "e2e4", 1)).toEqual({ error: "turn" });
    expect(play(after("e2e4", "e7e5"), "e1e2", 1)).toEqual({ error: "turn" });
    const mated = after("f2f3", "e7e5", "g2g4", "d8h4");
    expect(play(mated, "a2a3", 0)).toEqual({ error: "over" });
    for (const bad of ["e2", "E2E4", "e2e4 ", "e2e4x", "i2i4", "e0e4", "--", "Nf3", "", 42, null, undefined, { from: "e2", to: "e4" }]) {
      expect(play(initial(), bad, 0), String(bad)).toEqual({ error: "bad" });
    }
    // One way to write each move: no promotion letter where nothing is promoted, none missing where it is.
    expect(play(initial(), "e2e4q", 0)).toEqual({ error: "bad" });
    expect(play(after(...TO_PROMOTE), "b7b8", 0)).toEqual({ error: "bad" });
    expect(play(after(...TO_PROMOTE), "b7b8k", 0)).toEqual({ error: "bad" });
  });

  it("promotes to each piece", () => {
    const ready = after(...TO_PROMOTE);
    for (const [piece, letter] of [["q", "Q"], ["r", "R"], ["b", "B"], ["n", "N"]]) {
      const played = play(ready, `b7a8${piece}`, 0);
      expect(played.error, piece).toBeUndefined();
      expect(played.state.fen.split("/")[0], piece).toBe(`${letter}2qkbnr`);
      expect(played.state.san).toMatch(new RegExp(`^bxa8=${letter}`));
    }
    expect(play(ready, "b7b8n", 0).state.san).toBe("b8=N");
  });

  it("castles on both sides, and takes en passant", () => {
    const kingside = after("e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "e1g1", "g8f6");
    expect(kingside.prev.san).toBe("O-O");
    expect(kingside.fen.split(" ")[0].split("/")[7]).toBe("RNBQ1RK1");
    const queenside = after("d2d4", "d7d5", "b1c3", "b8c6", "c1f4", "c8f5", "d1d2", "d8d7", "e1c1", "e8c8");
    expect(line(queenside).slice(-2)).toEqual([{ move: "e1c1", san: "O-O-O" }, { move: "e8c8", san: "O-O-O" }]);
    expect(queenside.fen.split(" ")[0]).toMatch(/^2kr1bnr\/.*\/2KR1BNR$/);
    // A king that has moved, even back to its square, may no longer castle.
    expect(play(after("e2e4", "e7e5", "e1e2", "e8e7", "e2e1", "e7e8", "g1f3", "g8f6", "f1c4", "f8c5"), "e1g1", 0)).toEqual({ error: "illegal" });
    const passant = after("e2e4", "a7a6", "e4e5", "d7d5", "e5d6");
    expect(passant.san).toBe("exd6");
    expect(passant.fen.split(" ")[0]).toBe("rnbqkbnr/1pp1pppp/p2P4/8/8/8/PPPP1PPP/RNBQKBNR");
    // Only right after the double step.
    expect(play(after("e2e4", "a7a6", "e4e5", "d7d5", "h2h3", "h7h6"), "e5d6", 0)).toEqual({ error: "illegal" });
  });

  it("ends in checkmate: fool's mate for black, scholar's mate for white", () => {
    const fools = after("f2f3", "e7e5", "g2g4", "d8h4");
    expect(result(fools)).toEqual({ winner: 1, reason: "checkmate" });
    expect(fools.check).toBe(true);
    const scholars = after("e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7");
    expect(result(scholars)).toEqual({ winner: 0, reason: "checkmate" });
    expect(scholars.san).toBe("Qxf7#");
  });

  it("knows check from checkmate", () => {
    const check = after("e2e4", "f7f6", "d1h5");
    expect(check.check).toBe(true);
    expect(result(check)).toBeNull();
    expect(after("e2e4").check).toBe(false);
  });

  it("ends in a draw by stalemate and by a threefold repetition, from the moves", () => {
    expect(result(after(...LOYD))).toEqual({ winner: null, reason: "stalemate" });
    const shuffle = ["g1f3", "g8f6", "f3g1", "f6g8"];
    expect(result(after(...shuffle))).toBeNull();
    expect(result(after(...shuffle, ...shuffle))).toEqual({ winner: null, reason: "repetition" });
  });

  it("ends in a draw by insufficient material and by the fifty-move rule, mate first", () => {
    const bare = new Chess("4k3/8/8/8/8/8/8/3qK3 w - - 0 1");
    bare.move({ from: "e1", to: "d1" });
    expect(verdict(bare)).toEqual({ winner: null, reason: "material" });
    const fifty = new Chess("4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
    fifty.move({ from: "a1", to: "a2" });
    expect(verdict(fifty)).toEqual({ winner: null, reason: "fifty" });
    // A mate on the hundredth half-move is a mate.
    const mate = new Chess("k7/8/1K6/8/8/8/8/7R w - - 99 80");
    mate.move({ from: "h1", to: "h8" });
    expect(verdict(mate)).toEqual({ winner: 0, reason: "checkmate" });
    expect(verdict(new Chess())).toBeNull();
  });

  it("writes a game as PGN movetext with its result, on one line (the chat wraps it)", () => {
    const opera = after(...OPERA);
    expect(result(opera)).toEqual({ winner: 0, reason: "checkmate" });
    expect(pgn(opera, "1-0")).toBe(
      "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. " +
        "Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. " +
        "Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0",
    );
    expect(pgn(after("e2e4", "e7e5", "d1h5"), "0-1")).toBe("1. e4 e5 2. Qh5 0-1");
    expect(pgn(initial(), "1/2-1/2")).toBe("1/2-1/2");
  });

  it("never changes the state it is given, and plays from it again", () => {
    const state = after("e2e4");
    const before = structuredClone(state);
    const one = play(state, "e7e5", 1).state;
    expect(state).toEqual(before);
    expect(Object.isFrozen(one)).toBe(true);
    expect(play(state, "c7c5", 1).state.fen).toBe("rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");
    // A refused move leaves it as it was.
    expect(play(one, "e4e5", 0)).toEqual({ error: "illegal" });
    expect(line(play(one, "g1f3", 0).state).map(({ move }) => move)).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("gives back the same state for a move it has already played, so a replay is quick", () => {
    expect(initial()).toBe(initial());
    const one = play(after("e2e4"), "e7e5", 1).state;
    expect(play(after("e2e4"), "e7e5", 1).state).toBe(one);
    // A line that went another way from there is rebuilt from its moves, and is right.
    const sicilian = play(after("e2e4"), "c7c5", 1).state;
    expect(play(one, "g1f3", 0).state.san).toBe("Nf3");
    expect(play(sicilian, "g1f3", 0).state.fen).toBe("rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2");
  });
});
