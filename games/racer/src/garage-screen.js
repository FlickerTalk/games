import {
  VEHICLE_KINDS, GIFT_REVEAL_SECONDS, garageTiles, garageColorDots, garageDoneButton, garagePageButtons, garagePageCount, hasFixedColor,
} from './art.js';
import { chooseVehicle, chooseColor } from './profile.js';

export const NUDGE_SECONDS = 0.6;

const hits = (box, { x, y }) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

function pageOf(kind, { width, height }) {
  const pages = garagePageCount(width, height, VEHICLE_KINDS);
  for (let page = 0; page < pages; page += 1) {
    if (garageTiles(width, height, VEHICLE_KINDS, page).some((tile) => tile.kind === kind)) return page;
  }
  return 0;
}

export function openGarage(profile, size) {
  return { name: 'garage', page: pageOf(profile.kind, size), nudge: null };
}

function turnPage(screen, point, { width, height }) {
  const pages = garagePageCount(width, height, VEHICLE_KINDS);
  if (pages < 2) return false;
  const button = Object.values(garagePageButtons(width, height)).find((one) => hits(one, point));
  if (!button) return false;
  screen.page = (((screen.page + button.direction) % pages) + pages) % pages;
  return true;
}

export function tapGarage(screen, profile, point, { width, height, time }) {
  if (hits(garageDoneButton(width, height), point)) return 'closed';
  if (turnPage(screen, point, { width, height })) return 'paged';
  const dot = garageColorDots(width, height).find((one) => hits(one, point));
  if (dot) return !hasFixedColor(profile.kind) && chooseColor(profile, dot.color) ? 'changed' : null;
  const tile = garageTiles(width, height, VEHICLE_KINDS, screen.page).find((one) => hits(one, point));
  if (!tile) return null;
  if (chooseVehicle(profile, tile.kind)) return 'changed';
  screen.nudge = { kind: tile.kind, startedAt: time };
  return 'nudged';
}

export function garageView(screen, profile, time) {
  const age = screen.nudge ? time - screen.nudge.startedAt : Infinity;
  return {
    kinds: VEHICLE_KINDS,
    unlocked: profile.received,
    selected: profile.kind,
    color: profile.color,
    page: screen.page,
    time,
    nudge: age < NUDGE_SECONDS ? { kind: screen.nudge.kind, progress: age / NUDGE_SECONDS } : null,
  };
}

export function openGift(kind, time) {
  return { name: 'gift', kind, startedAt: time };
}

export function tapGift(screen, time) {
  return time - screen.startedAt >= GIFT_REVEAL_SECONDS ? 'closed' : null;
}

export function giftView(screen, profile, time) {
  return { kind: screen.kind, color: profile.color, time: time - screen.startedAt };
}
