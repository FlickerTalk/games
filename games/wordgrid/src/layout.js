import { boardFrame } from "../../../kit/src/tabletop/frame.js";
import { gridIn } from "../../../kit/src/tabletop/grid.js";
import { SIZE } from "./rules.js";

// [least px, share of the board square in %, most px]
export const ROWS = Object.freeze({ gap: [4, 2, 12], scores: [20, 6.5, 28], word: [32, 12, 48], lists: [36, 13.5, 60] });

export const SMALL = 260;

const PADDING = 0.03;

const span = ([least, share, most], size) => Math.min(most, Math.max(least, (share * size) / 100));
const css = ([least, share, most]) => `clamp(${least}px, ${share}cqh, ${most}px)`;

export const ROWS_STYLE = `.fwg{position:absolute;inset:0;container-type:size;display:flex;flex-direction:column;pointer-events:none}
.fwg-bottom{justify-content:flex-end}
.fwg-scores{flex:none;height:${css(ROWS.scores)}}
.fwg-word{flex:none;height:${css(ROWS.word)}}
.fwg-lists{flex:none;height:${css(ROWS.lists)};line-height:calc(${css(ROWS.lists)} / 3)}
.fwg-word+.fwg-lists{margin-top:${css(ROWS.gap)}}
@container (max-height: ${SMALL}px){.fwg-bottom:not(.play) .fwg-word,.fwg-bottom:not(.done) .fwg-lists{display:none}.fwg-bottom.done .fwg-lists{height:50cqh}}`;

export function rowsFor(size, phase) {
  const [gap, scores, word, lists] = ["gap", "scores", "word", "lists"].map((name) => span(ROWS[name], size));
  if (size > SMALL) return { gap, scores, word, lists };
  return { gap, scores, word: phase === "play" ? word : 0, lists: phase === "done" ? size / 2 : 0 };
}

const moved = (box, dx, dy) => ({ ...box, x: box.x + dx, y: box.y + dy });

const layouts = new Map();

export function layoutFor(size, phase = "play") {
  const key = `${size}/${size > SMALL ? "" : phase}`;
  if (layouts.has(key)) return layouts.get(key);
  const rows = rowsFor(size, phase);
  const bottom = rows.word + rows.lists + (rows.word && rows.lists ? rows.gap : 0);
  const top = rows.scores + rows.gap;
  const area = { x: 0, y: top, w: size, h: Math.max(0, size - top - bottom - (bottom ? rows.gap : 0)) };
  const side = Math.min(area.w, area.h);
  const [dx, dy] = [(size - side) / 2, area.y + (area.h - side) / 2];
  const plain = boardFrame(side, { padding: PADDING });
  const frame = { ...plain, outer: moved(plain.outer, dx, dy), inner: moved(plain.inner, dx, dy) };
  const layout = Object.freeze({ size, rows, area, frame, grid: gridIn(frame.inner, { columns: SIZE }) });
  layouts.set(key, layout);
  return layout;
}
