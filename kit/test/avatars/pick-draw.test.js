import { describe, expect, it } from "vitest";
import { HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { drawAvatar } from "../../src/avatars/face.js";
import { drawPick } from "../../src/avatars/pick-draw.js";
import { pickLayout, pickPress, pickRename, startPick } from "../../src/avatars/pick.js";
import { themeFromTokens } from "../../src/canvas/theme.js";
import { colours, contains, draw, shapes } from "../canvas/recorder.js";
import { APP_THEMES, tokensFor } from "../canvas/themes.js";

const UI = themeFromTokens(tokensFor("aurora-dark"));
const OWN_INTERFACE = ["#FFF8E8", "#EDF5EF", "#EEF3F7", "#E8E1F2"];
const edges = (ctx, colour) => ctx.calls.filter((call) => call.op === "set" && call.name === "strokeStyle" && call.value === colour).length;
const fills = (ctx, colour) => ctx.calls.filter((call) => call.op === "set" && call.name === "fillStyle" && call.value === colour).length;
const avatarColours = (options) => colours(draw((ctx) => drawAvatar(ctx, 0, 0, 64, options)));

function screen(state, width = 384, height = 556, options = {}) {
  const layout = pickLayout(state, width, height, options.lang);
  return { layout, ctx: draw((ctx) => drawPick(ctx, layout, state, { ui: UI, ...options })) };
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
    expect(edges(ctx, UI.accent)).toBe(1);
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
    expect(edges(ctx, UI.accent)).toBe(3);
    expect(fills(ctx, UI.accent)).toBe(1);
  });

  it("paints the page, the tiles, the words and the controls in the app's colours, in each of its themes", () => {
    for (const name of Object.keys(APP_THEMES)) {
      const ui = themeFromTokens(tokensFor(name));
      for (const state of [startPick({ who: "juno" }), lookState({ who: "juno", hair: "bob" })]) {
        const { ctx } = screen(state, 384, 556, { ui });
        const page = ctx.calls.findIndex((call) => call.op === "fillRect");
        expect(ctx.calls[page].points, name).toEqual([[0, 0], [384, 556]]);
        expect(ctx.calls.slice(0, page).findLast((call) => call.name === "fillStyle").value, name).toBe(ui.page);
        ctx.calls.forEach((call, at) => {
          if (call.op === "fillText") expect(ctx.calls.slice(0, at).findLast((one) => one.name === "fillStyle").value, name).toBe(ui.text);
        });
        expect(colours(ctx), name).toContain(ui.surface);
        expect(colours(ctx), name).toContain(ui.border);
        for (const old of OWN_INTERFACE) expect(colours(ctx), name).not.toContain(old);
      }
    }
  });

  it("keeps the faces, the hair and the hair colours in their own colours on a dark page", () => {
    const profiles = screen(startPick({ who: "juno" })).ctx;
    for (const profile of PROFILES) for (const colour of avatarColours({ who: profile.id, hair: "none", face: "happy" })) expect(colours(profiles), profile.id).toContain(colour);
    const state = lookState({ who: "nico", hair: "bun", hairColour: "golden" });
    const look = screen(state).ctx;
    for (const colour of avatarColours({ ...state.choice, face: "happy" })) expect(colours(look)).toContain(colour);
  });

  it("shows a control pressed from the moment a finger is on it, and not once the finger drags", () => {
    const state = lookState({ who: "kit" });
    const held = { ...state, press: { target: { kind: "done", value: "done" }, moved: false } };
    const rest = fills(screen(state).ctx, UI.pressed);
    expect(fills(screen(held).ctx, UI.pressed)).toBe(rest + 1);
    expect(fills(screen(held).ctx, UI.accent)).toBe(0);
    expect(fills(screen({ ...held, press: { ...held.press, moved: true } }).ctx, UI.pressed)).toBe(rest);
  });

  it("uses the kit's own light palette when it is given no theme", () => {
    const state = startPick({ who: "val" });
    const layout = pickLayout(state, 384, 556);
    const ctx = draw((one) => drawPick(one, layout, state, {}));
    expect(colours(ctx)).toContain(themeFromTokens(null).page);
    expect(colours(ctx)).toContain(themeFromTokens(null).surface);
  });

  it("clips the profiles to their strip where they scroll, and draws only the ones in it", () => {
    const state = startPick({ who: "ari" });
    const { layout, ctx } = screen(state, 328, 343);
    const [strip] = layout.strips;
    const clip = ctx.calls.findIndex((call) => call.op === "clip");
    expect(ctx.calls.slice(0, clip).findLast((call) => call.op === "rect").points).toEqual([[strip.x - 4, strip.y - 4], [strip.x + strip.w + 4, strip.y + strip.h + 4]]);
    const names = ctx.calls.filter((call) => call.op === "fillText").map((call) => call.text);
    expect(names).toEqual(["Who are you?", ...layout.targets.filter((one) => one.visible).map((one) => PROFILES.find((profile) => profile.id === one.value).name)]);
    expect(names.length).toBeLessThan(1 + PROFILES.length);
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
