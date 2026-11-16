export const CORNER = 40;

const PAD = 8;
const FRAME = 5;
const SLOT_WIDE = 120;
const SLOT_TALL = 88;
const SLOT_MOST = 160;
const CELL_MOST = 72;

const box = (x, y, w, h) => ({ x, y, w, h });
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function barOf(width, height, rival) {
  const tiny = height < 420;
  const tall = height >= 600;
  const row = tiny ? 48 : 56;
  const bar = box(PAD, PAD, width - 2 * PAD, tall ? row + 32 : row);
  const right = bar.x + bar.w;
  const music = box(right - row, bar.y, row, row);
  const speaker = box(music.x - row, bar.y, row, row);
  const pause = box(speaker.x - row, bar.y, row, row);
  const badge = tall ? 32 : 40;
  const rivalAt = !rival ? null : tall ? { x: right - 14 - badge / 2, y: bar.y + row + 15, size: badge } : { x: pause.x - 4 - badge / 2, y: bar.y + row / 2, size: badge };
  const lineEnd = rivalAt && tall ? rivalAt.x - badge / 2 - 64 : right - 14;
  const progress = tall ? box(bar.x + 14, bar.y + row + 10, lineEnd - bar.x - 14, 12) : box(bar.x + 14, bar.y + bar.h - 9, pause.x - bar.x - 28 - (rivalAt ? badge + 48 : 0), 5);
  return { bar, row, gap: tiny ? 8 : 12, controls: { pause, speaker, music }, rival: rivalAt, progress, best: tall || !rival };
}

function trayTall(cell, count) {
  return Math.round(clamp(cell * 2.5, count === 1 ? SLOT_WIDE : 96, 132));
}

function fitCell(limit, size) {
  return Math.floor(clamp(limit / size, 0, CELL_MOST));
}

function upright(width, height, { size, tray, fill, squeeze = false }, top, gap) {
  const zone = Math.min(SLOT_MOST, Math.floor(width / tray));
  if (zone < SLOT_WIDE && !squeeze) return null;
  const bottom = fill ? CORNER : PAD;
  const room = height - top - bottom - 2 * FRAME - gap;
  let cell = fitCell(Math.min(width - 2 * PAD - 2 * FRAME, room - 96), size);
  cell = fitCell(Math.min(width - 2 * PAD - 2 * FRAME, room - trayTall(cell, tray)), size);
  const tall = trayTall(cell, tray);
  const span = cell * size;
  const spare = Math.max(0, room - span - tall);
  const courtY = top + FRAME + spare;
  const slotY = courtY + span + FRAME + gap;
  const left = (width - tray * zone) / 2;
  const slots = Array.from({ length: tray }, (_, at) => box(left + at * zone, slotY, zone, tall));
  return { mode: "upright", court: { x: (width - span) / 2, y: courtY, cell, size }, slots };
}

function besideColumn(width, height, { size, tray, fill }, top, gap) {
  const bottom = fill ? CORNER : PAD;
  const each = Math.min(SLOT_MOST, Math.floor((height - top - bottom) / tray));
  if (each < SLOT_TALL) return null;
  const zone = Math.max(SLOT_WIDE, Math.min(SLOT_MOST, each));
  const cell = fitCell(Math.min(height - top - PAD - 2 * FRAME, width - 2 * PAD - zone - gap - 2 * FRAME), size);
  const span = cell * size;
  const left = (width - (span + 2 * FRAME + gap + zone)) / 2;
  const court = { x: left + FRAME, y: top + FRAME + Math.floor((height - top - PAD - span - 2 * FRAME) / 2), cell, size };
  const slotTop = top + Math.floor((height - top - bottom - tray * each) / 2);
  const slots = Array.from({ length: tray }, (_, at) => box(left + span + 2 * FRAME + gap, slotTop + at * each, zone, each));
  return { mode: "beside", court, slots };
}

function besideRow(width, height, { size, tray, fill }, top, gap) {
  const bottom = fill ? CORNER : PAD;
  const cell = fitCell(height - top - PAD - 2 * FRAME, size);
  const span = cell * size;
  const area = width - 2 * PAD - span - 2 * FRAME - gap;
  const zone = Math.min(SLOT_MOST, Math.floor(area / tray));
  const tall = Math.min(132, height - top - bottom);
  if (zone < SLOT_WIDE || tall < SLOT_TALL) return null;
  const left = (width - (span + 2 * FRAME + gap + tray * zone)) / 2;
  const court = { x: left + FRAME, y: top + FRAME + Math.floor((height - top - PAD - span - 2 * FRAME) / 2), cell, size };
  const slotY = top + Math.floor((height - top - bottom - tall) / 2);
  const slots = Array.from({ length: tray }, (_, at) => box(left + span + 2 * FRAME + gap + at * zone, slotY, zone, tall));
  return { mode: "beside", court, slots };
}

export function playLayout(width, height, { size = 8, tray = 3, rival = false, fill = false } = {}) {
  const top = barOf(width, height, rival);
  const start = top.bar.y + top.bar.h + top.gap;
  const options = { size, tray, fill };
  const found = [upright, besideColumn, besideRow].map((arrange) => arrange(width, height, options, start, top.gap)).filter(Boolean);
  const best = found.length ? found.reduce((one, two) => (two.court.cell > one.court.cell ? two : one)) : upright(width, height, { ...options, squeeze: true }, start, top.gap);
  const { speaker } = top.controls;
  const volume = box(Math.max(PAD, Math.min(width - PAD - 240, speaker.x + speaker.w / 2 - 120)), top.bar.y + top.bar.h + 6, 240, 64);
  return { width, height, fill, ...top, ...best, volume, lift: best.court.cell * 1.5 };
}

export function playTargets(layout, { volume = false } = {}) {
  const { pause, speaker, music } = layout.controls;
  const targets = [
    ...layout.slots.map((slot, at) => ({ kind: "slot", value: at, ...slot })),
    { kind: "pause", value: "pause", ...pause },
    { kind: "speaker", value: "speaker", ...speaker },
    { kind: "music", value: "music", ...music },
  ];
  return volume ? [{ kind: "volume", value: "volume", ...layout.volume }, ...targets] : targets;
}
