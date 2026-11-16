const MOST = 160;

const MAKERS = [(width, height) => globalThis.OffscreenCanvas && new globalThis.OffscreenCanvas(width, height), () => globalThis.document?.createElement("canvas")];

function canvasOf(width, height) {
  for (const make of MAKERS) {
    const canvas = make(width, height);
    if (!canvas) continue;
    canvas.width = width;
    canvas.height = height;
    if (canvas.getContext?.("2d")) return canvas;
  }
  return null;
}

export function createSprites({ make = canvasOf, most = MOST } = {}) {
  const pictures = new Map();
  const render = (at, width, height, paint) => {
    const canvas = make(width, height);
    if (!canvas) return null;
    const pen = canvas.getContext("2d");
    pen.setTransform(width / at.w, 0, 0, height / at.h, 0, 0);
    paint(pen, at);
    return canvas;
  };
  return {
    get size() {
      return pictures.size;
    },
    clear() {
      pictures.clear();
    },
    draw(ctx, key, box, paint, ratio = 1, at = box) {
      const [width, height] = [Math.max(1, Math.round(at.w * ratio)), Math.max(1, Math.round(at.h * ratio))];
      const id = `${key}@${width}x${height}`;
      if (!pictures.has(id)) {
        if (pictures.size >= most) pictures.clear();
        pictures.set(id, render(at, width, height, paint));
      }
      const picture = pictures.get(id);
      if (picture) {
        ctx.drawImage(picture, box.x, box.y, box.w, box.h);
        return;
      }
      ctx.save();
      ctx.translate(box.x, box.y);
      paint(ctx, box);
      ctx.restore();
    },
  };
}
