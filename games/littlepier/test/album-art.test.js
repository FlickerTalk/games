import { describe, expect, it } from "vitest";
import { bounds, colours, draw, painted } from "../../../kit/test/canvas/recorder.js";
import { drawAlbum, drawAlbumBadge } from "../src/album-art.js";
import { THEME } from "../src/theme.js";

const { art, ui } = THEME;
const texts = (ctx) => ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);

const state = (album) => ({ width: 384, height: 801, fill: true, album, lang: "en", sound: { level: "high", music: true, open: false, volume: 1 }, press: null, layout: null });

describe("the sticker album", () => {
  it("shows how many creatures have been met, in a small book that stays in its place", () => {
    const area = { x: 200, y: 12, w: 48, h: 48 };
    const ctx = draw((pen) => drawAlbumBadge(pen, area, 7, THEME, 0));
    expect(texts(ctx)).toEqual(["7"]);
    const box = bounds(painted(ctx));
    expect(box.left).toBeGreaterThanOrEqual(area.x - 1);
    expect(box.right).toBeLessThanOrEqual(area.x + area.w + 1);
    expect(colours(ctx)).toContain(ui.surface2);
  });

  it("fills a whole page in colour once all twenty-four are met, with nothing left as a quiet shape", () => {
    const all = Array.from({ length: 24 }, (_, kind) => kind);
    const ctx = draw((pen) => drawAlbum(pen, state(all), THEME, 1));
    expect(colours(ctx)).not.toContain(art.silhouette);
    expect(texts(ctx)).toContain("24/24");
    expect(ctx.depth).toBe(0);
  });

  it("shows every place as a quiet shape before the first catch", () => {
    const ctx = draw((pen) => drawAlbum(pen, state([]), THEME, 1));
    expect(colours(ctx)).toContain(art.silhouette);
    expect(colours(ctx)).not.toContain(art.creatures[6]);
    expect(texts(ctx)).toContain("0/24");
  });
});
