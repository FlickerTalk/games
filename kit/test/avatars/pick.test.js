import { describe, expect, it } from "vitest";
import { HAIRS, HAIR_COLOURS, PROFILES } from "../../src/avatars/cast.js";
import { PICK_TARGET, pickAt, pickLayout, pickPointer, pickPress, pickRename, startPick } from "../../src/avatars/pick.js";

const FRAMES = [
  [384, 556],
  [360, 588],
  [384, 853],
  [360, 740],
  [844, 338],
  [1280, 748],
];

const start = (choice = { who: "milo", hair: "quiff", hairColour: "copper", name: "" }) => startPick(choice);
const look = (choice) => pickPress(start(choice), pickLayout(start(choice), 384, 556).targets.find((one) => one.kind === "profile" && one.value === (choice?.who ?? "milo"))).state;
const centre = (target) => [target.x + target.w / 2, target.y + target.h / 2];
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const shown = (layout) => layout.targets.filter((one) => one.visible);

describe("the pick screen", () => {
  it("starts on the profiles with the player's current choice, cleaned", () => {
    expect(start({ who: "flick", hair: "afro", hairColour: "copper", name: " Lia " })).toMatchObject({ step: "profile", choice: { who: "ari", hair: "none", hairColour: "copper", name: "Lia" } });
  });

  it("offers the twelve profiles and never Flick, the current one marked, each named with its emblem", () => {
    const layout = pickLayout(start(), 384, 556, "en");
    const profiles = layout.targets.filter((one) => one.kind === "profile");
    expect(profiles.map((one) => one.value)).toEqual(PROFILES.map((one) => one.id));
    expect(layout.targets.filter((one) => one.kind !== "profile")).toEqual([]);
    expect(profiles.filter((one) => one.selected).map((one) => one.value)).toEqual(["milo"]);
    expect(profiles[2].label).toBe("Milo, diamond");
    expect(pickLayout(start(), 384, 556, "es").targets[0].label).toBe("Ari, sol");
    expect(layout.title.text).toBe("Who are you?");
  });

  it("then offers the way back, the name, every hairstyle, every hair colour and done", () => {
    const layout = pickLayout(look(), 384, 556, "en");
    const kinds = (kind) => layout.targets.filter((one) => one.kind === kind);
    expect(kinds("hair").map((one) => one.value)).toEqual(HAIRS.map((one) => one.id));
    expect(kinds("colour").map((one) => one.value)).toEqual(HAIR_COLOURS.map((one) => one.id));
    expect(kinds("back")).toHaveLength(1);
    expect(kinds("done")).toHaveLength(1);
    expect(kinds("rename")).toHaveLength(1);
    expect(kinds("profile")).toEqual([]);
    expect(kinds("hair").find((one) => one.selected).value).toBe("quiff");
    expect(kinds("colour").find((one) => one.selected).value).toBe("copper");
    expect(kinds("hair").find((one) => one.value === "long-fringe").label).toBe("Long hair with a fringe");
    expect(kinds("colour").find((one) => one.value === "copper").label).toBe("Red");
    expect(kinds("rename")[0].label).toBe("Change your name");
    expect(kinds("back")[0].label).toBe("Back");
    expect(kinds("done")[0].label).toBe("Done");
    expect(layout.strips.map((one) => [one.kind, one.label])).toEqual([["hair", "Hair"], ["colour", "Hair colour"]]);
  });

  it("fits a phone's game room, a tall phone, one held sideways and a tablet, every target 88 px or more and apart", () => {
    for (const [width, height] of FRAMES) {
      for (const state of [start(), look()]) {
        const layout = pickLayout(state, width, height);
        const where = `${state.step} at ${width}×${height}`;
        for (const target of layout.targets) {
          expect(Math.min(target.w, target.h), `${target.kind} ${where}`).toBeGreaterThanOrEqual(PICK_TARGET);
        }
        const inside = (box, what) => {
          expect(box.x, what).toBeGreaterThanOrEqual(0);
          expect(box.y, what).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w, what).toBeLessThanOrEqual(width);
          expect(box.y + box.h, what).toBeLessThanOrEqual(height);
        };
        for (const target of layout.targets.filter((one) => !one.strip)) inside(target, `${target.kind} ${where}`);
        for (const strip of layout.strips) {
          inside(strip, `${strip.kind} strip ${where}`);
          for (const item of layout.targets.filter((one) => one.strip === strip.kind)) {
            expect(item.y >= strip.y && item.y + item.h <= strip.y + strip.h, `${item.value} ${where}`).toBe(true);
            expect(item.visible, `${item.value} ${where}`).toBe(item.x < strip.x + strip.w && item.x + item.w > strip.x);
          }
        }
        if (layout.preview) inside(layout.preview, `preview ${where}`);
        const solid = layout.targets.filter((one) => !one.strip);
        for (const one of solid) for (const two of solid) if (one !== two) expect(overlap(one, two), `${one.kind} ${one.value} and ${two.kind} ${two.value} ${where}`).toBe(false);
        for (const strip of layout.strips) for (const one of solid) expect(overlap(strip, one), `${strip.kind} strip and ${one.kind} ${where}`).toBe(false);
        if (layout.preview) for (const one of solid.filter((target) => target.kind !== "rename")) expect(overlap(layout.preview, one), `preview and ${one.kind} ${where}`).toBe(false);
        if (layout.preview) expect(layout.preview.size, where).toBeGreaterThanOrEqual(96);
      }
    }
  });

  it("keeps the chosen avatar right above its name, and the hair step's two columns centred on a wide frame", () => {
    for (const [width, height] of FRAMES) {
      const layout = pickLayout(look(), width, height);
      const rename = layout.targets.find((one) => one.kind === "rename");
      const { preview } = layout;
      expect(preview.y + preview.h, `${width}×${height}`).toBe(rename.y + 20);
      expect(preview.h, `${width}×${height}`).toBeLessThanOrEqual(Math.ceil(preview.size * 1.3));
      if (width < height * 1.25) continue;
      const above = preview.y;
      const under = height - (rename.y + rename.h);
      expect(Math.abs(above - under), `${width}×${height}`).toBeLessThanOrEqual(1);
      const back = layout.targets.find((one) => one.kind === "back");
      const colour = layout.strips[1];
      expect(Math.abs(back.y - (height - colour.y - colour.h)), `${width}×${height}`).toBeLessThanOrEqual(1);
    }
  });

  it("finds what is under a finger, and nothing where nothing is or where a strip hides it", () => {
    const layout = pickLayout(look(), 384, 556);
    for (const target of shown(layout)) {
      const strip = layout.strips.find((one) => one.kind === target.strip);
      const [x, y] = centre(target);
      if (!strip || (x > strip.x && x < strip.x + strip.w)) expect(pickAt(layout, x, y), `${target.kind} ${target.value}`).toBe(target);
    }
    expect(pickAt(layout, -5, -5)).toBeNull();
    const hidden = layout.targets.find((one) => one.strip === "hair" && !one.visible);
    expect(hidden).toBeDefined();
    expect(pickAt(layout, ...centre(hidden))).toBeNull();
  });

  it("goes to the hair with the profile picked, and back to the profiles", () => {
    const first = start();
    const picked = pickPress(first, pickLayout(first, 384, 556).targets.find((one) => one.value === "sam"));
    expect(picked).toMatchObject({ ask: null, state: { step: "look", choice: { who: "sam", hair: "quiff", hairColour: "copper" } } });
    expect(first.step).toBe("profile");
    const back = pickPress(picked.state, pickLayout(picked.state, 384, 556).targets.find((one) => one.kind === "back"));
    expect(back.state).toMatchObject({ step: "profile", choice: { who: "sam" } });
  });

  it("chooses a hairstyle and a colour, asks the host for a name, and says when it is done", () => {
    const state = look();
    const layout = pickLayout(state, 384, 556);
    const press = (kind, value) => pickPress(state, layout.targets.find((one) => one.kind === kind && (value === undefined || one.value === value)));
    expect(press("hair", "braids").state.choice.hair).toBe("braids");
    expect(press("colour", "silver").state.choice.hairColour).toBe("silver");
    expect(press("rename")).toEqual({ state, ask: "rename" });
    expect(press("done")).toEqual({ state, ask: "done" });
    expect(pickPress(state, null)).toEqual({ state, ask: null });
    expect(pickPress(state, { kind: "hair", value: "afro" }).state.choice.hair).toBe("quiff");
  });

  it("takes a new name cleaned, and the profile's own when it is left empty", () => {
    expect(pickRename(look(), "  Lia‮  Rose ").choice.name).toBe("Lia Rose");
    expect(pickRename(look(), "   ").choice.name).toBe("");
  });

  it("shows the chosen hairstyle in its strip when the hair step opens", () => {
    for (const hair of ["none", "mini-twists", "bob"]) {
      const layout = pickLayout(look({ who: "rio", hair }), 384, 556);
      const strip = layout.strips[0];
      const chosen = layout.targets.find((one) => one.kind === "hair" && one.value === hair);
      expect(chosen.x, hair).toBeGreaterThanOrEqual(strip.x);
      expect(chosen.x + chosen.w, hair).toBeLessThanOrEqual(strip.x + strip.w);
    }
  });

  it("taps what is under the finger, and scrolls a strip that is dragged without tapping", () => {
    const state = look({ who: "milo", hair: "none", hairColour: "copper" });
    const layout = pickLayout(state, 384, 556);
    const strip = layout.strips[0];
    const ponytail = layout.targets.find((one) => one.kind === "hair" && one.value === "ponytail");
    const [x, y] = centre(ponytail);
    let step = pickPointer(state, layout, { type: "down", x, y });
    step = pickPointer(step.state, layout, { type: "up", x: x + 3, y });
    expect(step.ask).toBeNull();
    expect(step.state.choice.hair).toBe("ponytail");

    const sx = strip.x + strip.w - 20;
    const sy = strip.y + strip.h / 2;
    let drag = pickPointer(state, layout, { type: "down", x: sx, y: sy });
    drag = pickPointer(drag.state, layout, { type: "move", x: sx - 150, y: sy + 4 });
    const moved = pickLayout(drag.state, 384, 556);
    expect(moved.strips[0].scroll).toBe(layout.strips[0].scroll + 150);
    drag = pickPointer(drag.state, moved, { type: "up", x: sx - 150, y: sy + 4 });
    expect(drag.state.choice).toEqual(state.choice);
    drag = pickPointer(drag.state, moved, { type: "down", x: sx, y: sy });
    drag = pickPointer(drag.state, moved, { type: "move", x: sx + 9000, y: sy });
    expect(pickLayout(drag.state, 384, 556).strips[0].scroll).toBe(0);
    drag = pickPointer(drag.state, moved, { type: "move", x: sx - 9000, y: sy });
    expect(pickLayout(drag.state, 384, 556).strips[0].scroll).toBe(moved.strips[0].most);
  });

  it("does not tap when the finger lifts somewhere else, or after a cancel", () => {
    const state = look();
    const layout = pickLayout(state, 384, 556);
    const done = layout.targets.find((one) => one.kind === "done");
    const back = layout.targets.find((one) => one.kind === "back");
    const down = pickPointer(state, layout, { type: "down", x: centre(done)[0], y: centre(done)[1] });
    expect(pickPointer(down.state, layout, { type: "up", x: centre(back)[0], y: centre(back)[1] }).ask).toBeNull();
    const cancelled = pickPointer(down.state, layout, { type: "cancel" });
    expect(pickPointer(cancelled.state, layout, { type: "up", x: centre(done)[0], y: centre(done)[1] }).ask).toBeNull();
    expect(pickPointer(down.state, layout, { type: "up", x: centre(done)[0], y: centre(done)[1] }).ask).toBe("done");
    expect(pickPointer(state, layout, { type: "up", x: centre(done)[0], y: centre(done)[1] }).ask).toBeNull();
  });
});
