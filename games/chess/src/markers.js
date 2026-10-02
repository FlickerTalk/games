// The marks on the board, drawn by cm-chessboard's Markers extension from a sprite of our own
// (its own sprite is CC BY-SA, and does not ship): plain shapes in the 40-unit tile, coloured by
// board.css. A marker type is the class it gets and the shape (`slice`) it uses; `above` draws it
// over the pieces.

export const MARKERS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">' +
  '<g id="ftcSquare"><rect width="40" height="40"/></g>' +
  '<g id="ftcDot"><circle cx="20" cy="20" r="6"/></g>' +
  '<g id="ftcRing"><path d="M0 0h40v40H0zM20 3a17 17 0 1 0 0 34a17 17 0 1 0 0-34z" fill-rule="evenodd"/></g>' +
  '<g id="ftcGlow"><circle cx="20" cy="20" r="19"/></g>' +
  "</svg>";

export const MARKER = {
  /** The square of the piece picked up, and the one it is dragged over. */
  pick: { class: "ftc-pick", slice: "ftcSquare" },
  /** Where the last move came from and went. */
  last: { class: "ftc-last", slice: "ftcSquare" },
  /** The same, while the other phone has not confirmed it. */
  pending: { class: "ftc-pending", slice: "ftcSquare" },
  /** An empty square the picked piece may go to. */
  move: { class: "ftc-move", slice: "ftcDot", position: "above" },
  /** A piece the picked piece may take. */
  capture: { class: "ftc-capture", slice: "ftcRing" },
  /** The king in check. */
  check: { class: "ftc-check", slice: "ftcGlow" },
};
