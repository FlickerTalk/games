import { describe, expect, it } from "vitest";
import { KIT_TEXTS, joinTexts, translator } from "../../../kit/src/i18n.js";
import { checkTexts } from "../../../kit/test/helpers.js";
import { TEXTS } from "../src/texts.js";

const t = translator(joinTexts(KIT_TEXTS, TEXTS));

describe("the chess texts", () => {
  it("speak the 21 languages, the kit's and the game's together, with the same keys and gaps", () => {
    checkTexts(joinTexts(KIT_TEXTS, TEXTS));
    expect(t("es", "name")).toBe("Ajedrez");
    expect(t("de", "knight")).toBe("Springer");
    expect(t("ar", "checkmate")).toBe("كش مات");
  });

  it("name every ending, both colours, the four promotion pieces and the result for the chat", () => {
    for (const key of ["checkmate", "stalemate", "material", "repetition", "fifty", "resignation", "white", "black", "board", "check"]) {
      expect(TEXTS.en[key], key).toEqual(expect.any(String));
    }
    for (const key of ["choosePromotion", "king", "queen", "rook", "bishop", "knight", "pawn"]) expect(TEXTS.en[key], key).toEqual(expect.any(String));
    expect(t("en", "sayWin", { game: "Chess", result: "I won", side: "white", how: "Checkmate", n: 17 })).toBe("Chess: I won (white) · Checkmate · moves: 17");
    expect(t("en", "sayDrawn", { game: "Chess", result: "a draw", how: "Stalemate", n: 10 })).toBe("Chess: a draw · Stalemate · moves: 10");
  });

  it("name what stands on each square of the board for a screen reader", () => {
    expect(t("en", "onSquare", { square: "e4", piece: t("en", "pawn"), side: t("en", "white") })).toBe("e4: Pawn (white)");
    expect(t("es", "onSquare", { square: "g8", piece: t("es", "knight"), side: t("es", "black") })).toBe("g8: Caballo (negras)");
    expect(t("en", "emptySquare", { square: "d5" })).toBe("d5: empty");
    expect(t("de", "emptySquare", { square: "d5" })).toBe("d5: leer");
  });
});
