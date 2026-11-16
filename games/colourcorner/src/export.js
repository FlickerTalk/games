import { PAGE_H, PAGE_W } from "./geometry.js";
import { drawPicture } from "./menus-art.js";
import { LIGHT } from "./theme.js";

const SCALE = 2;

export function pictureData(picture, { page = globalThis.document } = {}) {
  const canvas = page?.createElement("canvas");
  if (!canvas) return null;
  canvas.width = PAGE_W * SCALE;
  canvas.height = PAGE_H * SCALE;
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return null;
  drawPicture(ctx, picture, { x: 0, y: 0, w: canvas.width, h: canvas.height, scale: SCALE }, LIGHT);
  return canvas.toDataURL("image/png").split(",")[1] ?? null;
}
