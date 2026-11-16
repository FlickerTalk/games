export const MAX_STAGE_WIDTH = 520;
const PORTRAIT = 0.66;

export function stageFor({ width, height }) {
  if (!(width > 0 && height > 0)) return { x: 0, width: 0, height: 0 };
  const stageWidth = Math.min(width, Math.floor(height * PORTRAIT), MAX_STAGE_WIDTH);
  return { x: Math.round((width - stageWidth) / 2), width: stageWidth, height };
}

const SWITCH = { size: 44, inset: 8, gap: 6, line: 200 };
export const SWITCH_ROOM = SWITCH.inset + SWITCH.size + SWITCH.gap;
export const SWITCH_BAND = SWITCH_ROOM;

export function soundSwitchPlaces(area) {
  const stage = stageFor(area);
  const { size, inset } = SWITCH;
  return {
    sound: { x: stage.x + inset, y: inset, size },
    music: { x: stage.x + stage.width - inset - size, y: inset, size },
    volume: { x: stage.x + inset, y: SWITCH_BAND, width: size, length: Math.max(0, Math.min(SWITCH.line, area.height - SWITCH_BAND - inset)) },
  };
}
