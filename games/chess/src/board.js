// cm-chessboard fetches its sprites with XMLHttpRequest unless a div with the sprite's id is already in
// the document, and the frame has connect-src 'none', so both go into document.body first.

import { BORDER_TYPE, COLOR, Chessboard, INPUT_EVENT_TYPE } from "cm-chessboard/src/Chessboard.js";
import { Markers } from "cm-chessboard/src/extensions/markers/Markers.js";
import { PROMOTION_DIALOG_RESULT_TYPE, PromotionDialog } from "cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";
import { Chess } from "chess.js";
import STYLE from "./board.css";
import { MARKER, MARKERS } from "./markers.js";
import { PIECES } from "./pieces.js";

export { STYLE };

export const SIDES = ["wk", "bk"].map((id) => `<svg class="ftc-side" viewBox="0 0 40 40" aria-hidden="true"><use href="#${id}"/></svg>`);

function addSprite(id, svg) {
  if (document.getElementById(id)) return;
  const holder = document.createElement("div");
  holder.id = id;
  holder.style.position = "absolute";
  holder.style.transform = "scale(0)";
  holder.setAttribute("aria-hidden", "true");
  holder.insertAdjacentHTML("afterbegin", svg);
  document.body.append(holder);
}

const PIECE_NAMES = { q: "queen", r: "rook", b: "bishop", n: "knight" };

const squaresOf = (move) => (typeof move === "string" ? [move.slice(0, 2), move.slice(2, 4)] : []);

function kingSquare(chess) {
  const colour = chess.turn();
  for (const row of chess.board()) for (const cell of row) if (cell?.type === "k" && cell.color === colour) return cell.square;
  return null;
}

class ChessView {
  constructor(host, ctx) {
    addSprite("cm-chessboard-sprite", PIECES);
    addSprite("cm-chessboard-markers", MARKERS);
    host.innerHTML = '<div class="ftc" role="group"><div class="ftc-board"></div></div>';
    this.frame = host.querySelector(".ftc");
    this.host = host;
    this.ctx = ctx;
    this.inputOn = false;
    this.promoting = false;
    this.chess = null;
    this.facing = this.colour(ctx);
    this.board = new Chessboard(host.querySelector(".ftc-board"), {
      position: ctx.state.fen,
      orientation: this.colour(ctx),
      assetsCache: true,
      style: { cssClass: "ftc-theme", showCoordinates: true, borderType: BORDER_TYPE.none, animationDuration: 200, pieces: { tileSize: 40 } },
      extensions: [
        { class: Markers, props: { autoMarkers: MARKER.pick } },
        { class: PromotionDialog, props: { language: "en" } },
      ],
    });
    this.dialog = this.board.getExtension(PromotionDialog);
    this.input = this.input.bind(this);
    this.update(ctx);
  }

  colour(ctx) {
    return ctx.mySide === 1 ? COLOR.black : COLOR.white;
  }

  game() {
    if (this.chess?.fen() !== this.ctx.state.fen) this.chess = new Chess(this.ctx.state.fen);
    return this.chess;
  }

  update(ctx) {
    if (!this.board) return;
    this.ctx = ctx;
    const board = this.board;
    const t = ctx.t;
    const colour = this.colour(ctx);
    // cm-chessboard queues a turn of the board behind the moves being drawn, so ask once
    if (this.facing !== colour) {
      this.facing = colour;
      board.setOrientation(colour);
    }
    if (!this.promoting) board.setPosition(ctx.state.fen, true);
    this.host.dataset.fen = ctx.state.fen;

    for (const type of [MARKER.last, MARKER.pending, MARKER.check]) board.removeMarkers(type);
    for (const square of squaresOf(ctx.last)) board.addMarker(ctx.pending ? MARKER.pending : MARKER.last, square);
    if (ctx.state.check) board.addMarker(MARKER.check, kingSquare(this.game()));

    this.frame.setAttribute("aria-label", ctx.state.check ? `${t("board")} · ${t("check")}` : t("board"));

    // cm-chessboard's promotion dialog only speaks English and German
    this.dialog.t = { choosePromotion: t("choosePromotion"), pieces: { q: t("queen"), r: t("rook"), b: t("bishop"), n: t("knight") } };
    this.dialog.promotionDialogGroup.setAttribute("aria-label", t("choosePromotion"));

    const can = Boolean(ctx.canPlay && !ctx.result);
    if (can && !this.inputOn) {
      board.enableMoveInput(this.input, colour);
      this.inputOn = true;
    } else if (!can && this.inputOn) {
      // cm-chessboard drops a held piece back itself once input is off. Cancelling here would cut short
      // a move it is still drawing.
      board.disableMoveInput();
      this.inputOn = false;
      this.hideMoves();
      board.removeMarkers(MARKER.pick);
      if (this.promoting) {
        this.promoting = false;
        this.dialog.setDisplayState("hidden");
        board.setPosition(ctx.state.fen, true);
      }
    }
  }

  destroy() {
    if (!this.board) return;
    this.board.destroy();
    this.board = null;
    this.host.innerHTML = "";
  }

  showMoves(moves) {
    for (const move of moves) {
      if (move.promotion && move.promotion !== "q") continue;
      this.board.addMarker(move.captured ? MARKER.capture : MARKER.move, move.to);
    }
  }

  hideMoves() {
    this.board.removeMarkers(MARKER.move);
    this.board.removeMarkers(MARKER.capture);
  }

  input(event) {
    const ctx = this.ctx;
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      this.hideMoves();
      if (!ctx.canPlay || ctx.result) return false;
      const moves = this.game().moves({ square: event.squareFrom, verbose: true });
      this.showMoves(moves);
      return moves.length > 0;
    }
    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      this.hideMoves();
      if (!ctx.canPlay || ctx.result) return false;
      const moves = this.game().moves({ square: event.squareFrom, verbose: true }).filter((move) => move.to === event.squareTo);
      if (!moves.length) return false;
      if (moves.some((move) => move.promotion)) this.promote(event.squareFrom, event.squareTo);
      else ctx.play(`${event.squareFrom}${event.squareTo}`);
      return true;
    }
    if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) this.hideMoves();
    return undefined;
  }

  promote(from, to) {
    this.promoting = true;
    this.board.showPromotionDialog(to, this.colour(this.ctx), (chosen) => {
      if (!this.promoting) return;
      this.promoting = false;
      if (chosen.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
        const piece = chosen.piece.charAt(1);
        // cm-chessboard announces the focused piece, not the tapped one
        this.dialog.announce?.(this.ctx.t(PIECE_NAMES[piece]));
        this.ctx.play(`${from}${to}${piece}`);
      } else {
        this.dialog.announce?.("");
        this.board.setPosition(this.ctx.state.fen, true);
      }
    });
  }
}

export const board = {
  mount(host, ctx) {
    const shown = new ChessView(host, ctx);
    return { update: (next) => shown.update(next), destroy: () => shown.destroy() };
  },
};
