import { describe, expect, it } from "vitest";
import { recorder } from "../../../kit/test/canvas/recorder.js";
import { pictureData } from "../src/export.js";

function fakePage(context) {
  const made = [];
  return {
    made,
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context, toDataURL: (type) => `data:${type};base64,QUJD` };
      made.push(canvas);
      return canvas;
    },
  };
}

describe("a picture sent to the chat", () => {
  it("is drawn in full colour on a canvas of its own and handed over as PNG data", () => {
    const ctx = recorder();
    const page = fakePage(ctx);
    const data = pictureData({ kind: "page", page: "cat", work: { fills: { 0: "3" }, items: [] } }, { page });
    expect(data).toBe("QUJD");
    expect([page.made[0].width, page.made[0].height]).toEqual([600, 720]);
    expect(ctx.calls.length).toBeGreaterThan(50);
  });

  it("gives nothing when the frame cannot draw", () => {
    expect(pictureData({ kind: "free", drawing: { paper: "light", items: [] } }, { page: fakePage(null) })).toBeNull();
    expect(pictureData({ kind: "free", drawing: { paper: "light", items: [] } }, { page: null })).toBeNull();
  });
});
