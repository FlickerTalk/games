import { lineValue } from "../sound/index.js";
import { within } from "./layout.js";

export const FOLD_MS = 3000;

export function pressTargets(state, targets, event, onPress) {
  const hit = targets.find((target) => within(target, event)) ?? null;
  if (event.type === "down") {
    state.press = hit && { kind: hit.kind, value: hit.value };
    return;
  }
  if (event.type === "cancel") state.press = null;
  if (event.type !== "up") return;
  const pressed = state.press;
  state.press = null;
  if (hit && pressed && hit.kind === pressed.kind && hit.value === pressed.value) onPress(hit);
}

export const soundState = (sound, controls) => ({ level: controls.icon, music: sound.settings.music, open: controls.open, volume: sound.settings.volume });

function slide(state, { x }, { volume, controls, now, sync }) {
  controls.slide(lineValue(x, volume.x + 24, volume.x + volume.w - 24));
  state.volumeAt = now();
  sync();
}

export function volumePointer(state, event, options) {
  const { volume, controls, targets, sync } = options;
  if (state.press?.kind === "volume") {
    if (event.type === "move") slide(state, event, options);
    if (event.type === "up" || event.type === "cancel") {
      if (event.type === "up") slide(state, event, options);
      controls.release();
      state.press = null;
      sync();
    }
    return true;
  }
  if (event.type !== "down" || !state.sound.open || !volume) return false;
  if (within(volume, event)) {
    state.press = { kind: "volume", value: "volume" };
    slide(state, event, options);
    return true;
  }
  const speaker = targets.find((one) => one.kind === "speaker");
  if (!speaker || !within(speaker, event)) {
    controls.fold();
    sync();
  }
  return false;
}

export function foldWhenIdle(state, controls, time) {
  if (!state.sound.open || time - state.volumeAt <= FOLD_MS) return false;
  controls.fold();
  return true;
}
