export const PATH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const POINTS = [1, 1, 3, 0];
const VALUE = new Map([...PATH_ALPHABET].map((char, at) => [char, at]));
const decoded = new Map();

function read(text) {
  const ops = [];
  let at = 0;
  let x = 0;
  let y = 0;
  const unsigned = () => {
    let value = 0;
    let weight = 1;
    let digit;
    do {
      digit = VALUE.get(text[at++]);
      value += (digit & 31) * weight;
      weight *= 32;
    } while (digit & 32);
    return value;
  };
  const signed = () => {
    const value = unsigned();
    return value % 2 ? -(value + 1) / 2 : value / 2;
  };
  while (at < text.length) {
    const run = unsigned();
    const op = run % 4;
    for (let step = 0; step <= Math.floor(run / 4); step += 1) {
      ops.push(op);
      for (let point = 0; point < POINTS[op]; point += 1) {
        x += signed();
        y += signed();
        ops.push(x, y);
      }
    }
  }
  return ops;
}

export function decodePath(text) {
  if (!decoded.has(text)) decoded.set(text, read(text));
  return decoded.get(text);
}

export function tracePath(ctx, ops) {
  let at = 0;
  while (at < ops.length) {
    const op = ops[at++];
    if (op === 0) ctx.moveTo(ops[at++], ops[at++]);
    else if (op === 1) ctx.lineTo(ops[at++], ops[at++]);
    else if (op === 2) {
      ctx.bezierCurveTo(ops[at], ops[at + 1], ops[at + 2], ops[at + 3], ops[at + 4], ops[at + 5]);
      at += 6;
    } else ctx.closePath();
  }
}
