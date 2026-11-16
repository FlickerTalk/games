import { describe, expect, it, vi } from "vitest";
import { FOLD_MS, foldWhenIdle, pressTargets, soundState, volumePointer } from "../../src/canvas/input.js";

const targets = [{ kind: "play", value: "play", x: 0, y: 0, w: 100, h: 100 }, { kind: "speaker", value: "speaker", x: 200, y: 0, w: 50, h: 50 }];

function fakeControls() {
  return { open: false, icon: "high", toggle: vi.fn(function () { this.open = !this.open; }), fold: vi.fn(function () { this.open = false; }), slide: vi.fn(), release: vi.fn() };
}

describe("a press on a canvas target", () => {
  it("counts only when the finger goes down and comes up on the same target, and shows it pressed meanwhile", () => {
    const state = { press: null };
    const pressed = [];
    pressTargets(state, targets, { type: "down", x: 10, y: 10 }, (hit) => pressed.push(hit.kind));
    expect(state.press).toEqual({ kind: "play", value: "play" });
    pressTargets(state, targets, { type: "up", x: 20, y: 20 }, (hit) => pressed.push(hit.kind));
    expect(pressed).toEqual(["play"]);
    expect(state.press).toBeNull();
    pressTargets(state, targets, { type: "down", x: 10, y: 10 }, (hit) => pressed.push(hit.kind));
    pressTargets(state, targets, { type: "up", x: 210, y: 10 }, (hit) => pressed.push(hit.kind));
    expect(pressed).toEqual(["play"]);
    pressTargets(state, targets, { type: "down", x: 10, y: 10 }, () => {});
    pressTargets(state, targets, { type: "cancel", x: 10, y: 10 }, () => {});
    expect(state.press).toBeNull();
  });
});

describe("the volume line on a canvas", () => {
  it("follows a finger along it and keeps the volume when let go", () => {
    const controls = fakeControls();
    controls.open = true;
    const state = { press: null, sound: { open: true }, volumeAt: 0 };
    const volume = { x: 100, y: 100, w: 248, h: 64 };
    const options = { volume, controls, targets, now: () => 5000, sync: vi.fn() };
    expect(volumePointer(state, { type: "down", x: 224, y: 130 }, options)).toBe(true);
    expect(controls.slide).toHaveBeenLastCalledWith(0.5);
    expect(state.volumeAt).toBe(5000);
    volumePointer(state, { type: "move", x: 324, y: 130 }, options);
    expect(controls.slide).toHaveBeenLastCalledWith(1);
    volumePointer(state, { type: "up", x: 324, y: 130 }, options);
    expect(controls.release).toHaveBeenCalled();
    expect(state.press).toBeNull();
  });

  it("folds when touched anywhere but on it or the speaker, and lets that touch through", () => {
    const controls = fakeControls();
    controls.open = true;
    const state = { press: null, sound: { open: true }, volumeAt: 0 };
    const options = { volume: { x: 100, y: 100, w: 240, h: 64 }, controls, targets, now: () => 0, sync: vi.fn() };
    expect(volumePointer(state, { type: "down", x: 10, y: 10 }, options)).toBe(false);
    expect(controls.fold).toHaveBeenCalled();
    expect(volumePointer({ ...state, sound: { open: false } }, { type: "down", x: 120, y: 120 }, options)).toBe(false);
  });

  it("folds by itself after a few seconds untouched", () => {
    const controls = fakeControls();
    controls.open = true;
    const state = { sound: { open: true }, volumeAt: 1000 };
    expect(foldWhenIdle(state, controls, 1000 + FOLD_MS - 1)).toBe(false);
    expect(foldWhenIdle(state, controls, 1000 + FOLD_MS + 1)).toBe(true);
    expect(controls.fold).toHaveBeenCalledTimes(1);
  });

  it("says what the sound buttons show", () => {
    const controls = fakeControls();
    expect(soundState({ settings: { volume: 0.4, music: false } }, controls)).toEqual({ level: "high", music: false, open: false, volume: 0.4 });
  });
});
