import { describe, expect, it } from "vitest";
import { CORNER, playLayout, playTargets } from "../src/layout.js";

const FILL = [[360, 588], [384, 801], [390, 792], [430, 880], [844, 338], [1280, 748]];
const ROOM = [[384, 556], [360, 443], [360, 343], [1280, 503], [430, 635]];
const COURTS = [{ size: 8, tray: 3 }, { size: 6, tray: 1 }, { size: 9, tray: 3 }];

const inside = (box, width, height) => box.x >= 0 && box.y >= 0 && box.x + box.w <= width + 0.5 && box.y + box.h <= height + 0.5;
const overlap = (one, two) => one.x < two.x + two.w && two.x < one.x + one.w && one.y < two.y + two.h && two.y < one.y + one.h;
const courtBox = ({ court }) => ({ x: court.x - 5, y: court.y - 5, w: court.cell * court.size + 10, h: court.cell * court.size + 10 });

function each(run) {
  for (const [sizes, fill] of [[FILL, true], [ROOM, false]]) {
    for (const [width, height] of sizes) {
      for (const court of COURTS) for (const rival of [false, true]) run({ width, height, fill, rival, ...court });
    }
  }
}

describe("the play screen's layout", () => {
  it("keeps the bar, the court and the tray inside the frame, apart from each other", () => {
    each(({ width, height, ...options }) => {
      const layout = playLayout(width, height, options);
      const name = `${width}x${height} ${JSON.stringify(options)}`;
      expect(inside(layout.bar, width, height), name).toBe(true);
      expect(inside(courtBox(layout), width, height), name).toBe(true);
      expect(overlap(courtBox(layout), layout.bar), name).toBe(false);
      for (const slot of layout.slots) {
        expect(inside(slot, width, height), name).toBe(true);
        expect(overlap(slot, courtBox(layout)), name).toBe(false);
        expect(overlap(slot, layout.bar), name).toBe(false);
      }
    });
  });

  it("gives every tray slot a zone at least 120 wide and 88 tall, and nothing to touch overlapping", () => {
    each(({ width, height, ...options }) => {
      const targets = playTargets(playLayout(width, height, options));
      const name = `${width}x${height} ${JSON.stringify(options)}`;
      for (const slot of targets.filter((target) => target.kind === "slot")) {
        expect(slot.w, name).toBeGreaterThanOrEqual(120);
        expect(slot.h, name).toBeGreaterThanOrEqual(88);
      }
      for (const control of targets.filter((target) => target.kind !== "slot")) {
        expect(Math.min(control.w, control.h), `${name} ${control.kind}`).toBeGreaterThanOrEqual(48);
      }
      targets.forEach((one, at) => targets.slice(at + 1).forEach((two) => expect(overlap(one, two), `${name} ${one.kind} ${two.kind}`).toBe(false)));
    });
  });

  it("puts nothing to touch in the bottom corners of a full screen", () => {
    for (const [width, height] of FILL) {
      for (const court of COURTS) {
        const corners = [{ x: 0, y: height - CORNER, w: CORNER, h: CORNER }, { x: width - CORNER, y: height - CORNER, w: CORNER, h: CORNER }];
        for (const target of playTargets(playLayout(width, height, { ...court, fill: true }))) {
          for (const corner of corners) expect(overlap(target, corner), `${width}x${height} ${target.kind}`).toBe(false);
        }
      }
    }
  });

  it("puts the pause, the speaker and the music side by side at the top", () => {
    const layout = playLayout(384, 801, { fill: true });
    const { pause, speaker, music } = layout.controls;
    expect(pause.y).toBe(speaker.y);
    expect(speaker.y).toBe(music.y);
    expect(pause.x < speaker.x && speaker.x < music.x).toBe(true);
    expect(pause.y).toBeLessThan(layout.court.y);
  });

  it("makes the court's cells as large as the frame allows, from the room of a small phone to a tablet", () => {
    expect(playLayout(360, 588, { fill: true }).court.cell).toBeGreaterThanOrEqual(40);
    expect(playLayout(384, 556, {}).court.cell).toBeGreaterThanOrEqual(40);
    expect(playLayout(384, 801, { fill: true }).court.cell).toBeGreaterThanOrEqual(43);
    expect(playLayout(1280, 748, { fill: true }).court.cell).toBeGreaterThanOrEqual(64);
    expect(playLayout(360, 343, {}).court.cell).toBeGreaterThanOrEqual(24);
    expect(playLayout(844, 338, { fill: true }).court.cell).toBeGreaterThanOrEqual(26);
  });

  it("lays the tray under the court on a phone held upright and beside it on a wide frame", () => {
    const upright = playLayout(384, 801, { fill: true });
    expect(upright.slots.every((slot) => slot.y >= upright.court.y + upright.court.cell * 8)).toBe(true);
    const wide = playLayout(1280, 748, { fill: true });
    expect(wide.slots.every((slot) => slot.x >= wide.court.x + wide.court.cell * 8)).toBe(true);
  });

  it("lifts a piece one and a half cells above the finger", () => {
    const layout = playLayout(384, 801, { fill: true });
    expect(layout.lift).toBe(layout.court.cell * 1.5);
  });

  it("makes room in the bar for the rival when there is one", () => {
    expect(playLayout(384, 801, { fill: true }).rival).toBeNull();
    const versus = playLayout(384, 801, { fill: true, rival: true });
    expect(versus.rival.size).toBeGreaterThanOrEqual(32);
    expect(inside({ x: versus.rival.x - versus.rival.size / 2, y: versus.rival.y - versus.rival.size / 2, w: versus.rival.size, h: versus.rival.size }, 384, 801)).toBe(true);
  });
});

describe("the space a tall frame has to spare", () => {
  it("goes above the court, where the courtyard shows, and keeps the tray low within reach", () => {
    const layout = playLayout(384, 801, { fill: true });
    const trayBottom = Math.max(...layout.slots.map((slot) => slot.y + slot.h));
    expect(801 - CORNER - trayBottom).toBeLessThan(2);
    expect(layout.court.y - (layout.bar.y + layout.bar.h)).toBeGreaterThan(60);
  });
});
