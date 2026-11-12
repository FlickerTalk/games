// Our own marker sprite, cm-chessboard's is CC BY-SA and does not ship.

export const MARKERS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">' +
  '<g id="ftcSquare"><rect width="40" height="40"/></g>' +
  '<g id="ftcDot"><circle cx="20" cy="20" r="6"/></g>' +
  '<g id="ftcRing"><path d="M0 0h40v40H0zM20 3a17 17 0 1 0 0 34a17 17 0 1 0 0-34z" fill-rule="evenodd"/></g>' +
  '<g id="ftcGlow"><circle cx="20" cy="20" r="19"/></g>' +
  "</svg>";

export const MARKER = {
  pick: { class: "ftc-pick", slice: "ftcSquare" },
  last: { class: "ftc-last", slice: "ftcSquare" },
  pending: { class: "ftc-pending", slice: "ftcSquare" },
  move: { class: "ftc-move", slice: "ftcDot", position: "above" },
  capture: { class: "ftc-capture", slice: "ftcRing" },
  check: { class: "ftc-check", slice: "ftcGlow" },
};
