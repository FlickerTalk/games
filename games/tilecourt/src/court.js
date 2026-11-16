export const EMPTY = -1;

export function emptyCourt(size = 8) {
  return { size, cells: Array(size * size).fill(EMPTY) };
}

export function cellsOf(court, piece, at) {
  const { size } = court;
  if (!Number.isInteger(at) || at < 0 || at >= size * size) return null;
  const left = at % size;
  const top = Math.floor(at / size);
  if (left + piece.width > size || top + piece.height > size) return null;
  return piece.cells.map(([x, y]) => (top + y) * size + left + x);
}

export function fits(court, piece, at) {
  const cells = cellsOf(court, piece, at);
  return Boolean(cells) && cells.every((cell) => court.cells[cell] === EMPTY);
}

export function spots(court, piece) {
  const found = [];
  for (let at = 0; at < court.cells.length; at += 1) if (fits(court, piece, at)) found.push(at);
  return found;
}

export function fitsAnywhere(court, pieces) {
  return pieces.some((piece) => court.cells.some((_, at) => fits(court, piece, at)));
}

function allLines(size, beds) {
  const range = (count, of) => Array.from({ length: count }, (_, at) => of(at));
  const found = [];
  for (let index = 0; index < size; index += 1) found.push({ kind: "row", index, cells: range(size, (x) => index * size + x) });
  for (let index = 0; index < size; index += 1) found.push({ kind: "column", index, cells: range(size, (y) => y * size + index) });
  if (beds && size % 3 === 0) {
    const across = size / 3;
    for (let index = 0; index < across * across; index += 1) {
      const left = (index % across) * 3;
      const top = Math.floor(index / across) * 3;
      found.push({ kind: "bed", index, cells: range(9, (at) => (top + Math.floor(at / 3)) * size + left + (at % 3)) });
    }
  }
  return found;
}

export function fullLines(court, { beds = false } = {}) {
  return allLines(court.size, beds).filter((line) => line.cells.every((cell) => court.cells[cell] !== EMPTY));
}

function cleared(court, lines) {
  const cells = [...court.cells];
  const taken = lines.map(({ kind, index, cells: line }) => ({ kind, index, cells: line.map((at) => ({ at, family: court.cells[at] })) }));
  for (const line of lines) for (const at of line.cells) cells[at] = EMPTY;
  return { court: { size: court.size, cells }, lines: taken };
}

export function place(court, piece, at, { beds = false } = {}) {
  if (!fits(court, piece, at)) return null;
  const tiles = cellsOf(court, piece, at);
  const filled = { size: court.size, cells: [...court.cells] };
  for (const cell of tiles) filled.cells[cell] = piece.family;
  const after = cleared(filled, fullLines(filled, { beds }));
  return { court: after.court, tiles, lines: after.lines, emptied: after.lines.length > 0 && after.court.cells.every((cell) => cell === EMPTY) };
}

export function fullest(court) {
  let best = null;
  for (const line of allLines(court.size, false)) {
    const count = line.cells.filter((cell) => court.cells[cell] !== EMPTY).length;
    if (count > 0 && (!best || count > best.count)) best = { kind: line.kind, index: line.index, cells: line.cells, count };
  }
  return best && { kind: best.kind, index: best.index, cells: best.cells };
}

export function rescue(court) {
  const line = fullest(court);
  if (!line) return null;
  const taken = line.cells.filter((cell) => court.cells[cell] !== EMPTY);
  const after = cleared(court, [{ ...line, cells: taken }]);
  return { court: after.court, line: after.lines[0] };
}
