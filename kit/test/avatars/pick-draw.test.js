import { describe, expect, it } from "vitest";
import { HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { drawAvatar } from "../../src/avatars/face.js";
import { drawPick } from "../../src/avatars/pick-draw.js";
import { pickLayout, pickPress, pickRename, startPick } from "../../src/avatars/pick.js";
import { colours, contains, draw, shapes } from "../canvas/recorder.js";

const YELLOW = "#FFCF3F";

function screen(state, width = 384, height = 556, options = {}) {
  const layout = pickLayout(state, width, height, options.lang);
  return { layout, ctx: draw((ctx) => drawPick(ctx, layout, state, options)) };
}

const avatarAt = (x, y, size, options) => shapes(draw((ctx) => drawAvatar(ctx, x, y, size, options)));

function lookState(choice) {
  const first = startPick(choice);
  return pickPress(first, pickLayout(first, 384, 556).targets.find((one) => one.value === first.choice.who)).state;
}

describe("the drawn pick screen", () => {
  it("draws every profile's face on its tile, with its name under it, the current one marked", () => {
    const { layout, ctx } = screen(startPick({ who: "juno" }));
    const drawn = shapes(ctx);
    for (const target of layout.targets) {
      const size = Math.min(target.w, target.h) * 0.58;
      expect(contains(drawn, avatarAt(target.x + target.w / 2, target.y + target.h * 0.42, size, { who: target.value, hair: "none", face: "happy" })), target.value).toBe(true);
    }
    const texts = ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
    expect(texts).toEqual(["Who are you?", ...PROFILES.map((one) => one.name)]);
    expect(colours(ctx).filter((one) => one === YELLOW)).toHaveLength(1 + PROFILES.filter((one) => one.colour === YELLOW).length);
  });

  it("draws the chosen avatar large, its name as plain text, and each hairstyle and colour to choose", () => {
    const state = pickRename(lookState({ who: "nico", hair: "bun", hairColour: "golden" }), "<b>Lia</b>");
    const { layout, ctx } = screen(state, 384, 556, { time: 1.2 });
    const drawn = shapes(ctx);
    const { preview } = layout;
    expect(contains(drawn, avatarAt(preview.x + preview.w / 2, preview.y + preview.h / 2, preview.size, { ...state.choice, face: "happy", time: 1.2 }))).toBe(true);
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["<b>Lia</b>"]);
    for (const target of layout.targets.filter((one) => one.kind === "hair")) {
      const face = avatarAt(target.x + target.w / 2, target.y + target.h / 2, target.w * 0.7, { ...state.choice, hair: target.value, face: "neutral" });
      expect(contains(drawn, face), target.value).toBe(target.visible);
    }
    for (const target of layout.targets.filter((one) => one.kind === "colour" && one.visible)) expect(colours(ctx), target.value).toContain(HAIR_COLOURS.find((one) => one.id === target.value).colour);
    expect(ctx.calls.filter((call) => call.op === "clip")).toHaveLength(2);
    expect(colours(ctx).filter((one) => one === YELLOW)).toHaveLength(2);
  });

  it("shows the profile's own name when the player has none", () => {
    const { ctx } = screen(lookState({ who: "umi" }));
    expect(ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text)).toEqual(["Umi"]);
  });

  it("draws the same calls for the same time, at any frame, and leaves the context as it found it", () => {
    for (const state of [startPick({ who: "val" }), lookState({ who: "val", hair: "curls" })]) {
      for (const [width, height] of [[384, 556], [844, 338], [1280, 748]]) {
        const one = screen(state, width, height, { time: 0.5 }).ctx;
        expect(shapes(one)).toEqual(shapes(screen(state, width, height, { time: 0.5 }).ctx));
        expect(one.depth).toBe(0);
        expect(one.matrix).toEqual([1, 0, 0, 1, 0, 0]);
      }
    }
  });

  it("points the way back the other way in a right-to-left language", () => {
    const state = lookState({ who: "kit" });
    const offsets = (lang) => {
      const { layout, ctx } = screen(state, 384, 556, { lang });
      const back = layout.targets.find((one) => one.kind === "back");
      const within = ([x, y]) => x > back.x + 4 && x < back.x + back.w - 4 && y > back.y + 4 && y < back.y + back.h - 4;
      return ctx.calls.flatMap((call) => call.points).filter(within).map(([x]) => Math.round((x - back.x - back.w / 2) * 100) / 100 + 0);
    };
    const sorted = (list) => [...list].sort((one, two) => one - two);
    const mirrored = (list) => sorted(list.map((x) => -x + 0));
    expect(sorted(offsets("ar"))).toEqual(mirrored(offsets("en")));
    expect(sorted(offsets("en"))).not.toEqual(mirrored(offsets("en")));
  });
});
