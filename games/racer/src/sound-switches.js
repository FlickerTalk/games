import { volumeIcon } from './sound-volume.js';

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const SPEAKER = '<path d="M3.5 9.5h3.8L12 5.5v13l-4.7-4H3.5z" fill="currentColor"/>';
const NOTES = `<path d="M9 17.5V6.5l10-2.2v11" ${STROKE}/><circle cx="6.6" cy="17.6" r="2.6" fill="currentColor"/><circle cx="16.6" cy="15.4" r="2.6" fill="currentColor"/>`;

const svg = (inside) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inside}</svg>`;

const SPEAKER_ICONS = {
  high: svg(`${SPEAKER}<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" ${STROKE}/>`),
  low: svg(`${SPEAKER}<path d="M15.5 9a4 4 0 0 1 0 6" ${STROKE}/>`),
  off: svg(`${SPEAKER}<path d="M16 9.5l5 5M21 9.5l-5 5" ${STROKE}/>`),
};
const MUSIC_ICONS = { on: svg(NOTES), off: svg(`${NOTES}<path d="M3.5 3.5l17 17" ${STROKE}/>`) };

function button(page, name, icon) {
  const made = page.createElement('button');
  made.type = 'button';
  made.className = `sound-switch ${name}`;
  made.innerHTML = icon;
  return made;
}

function line(page) {
  const volume = page.createElement('div');
  volume.className = 'volume-pop';
  volume.hidden = true;
  const range = page.createElement('input');
  Object.assign(range, { type: 'range', min: '0', max: '100', step: '1', className: 'volume' });
  volume.append(range);
  return { volume, range };
}

export function createSwitches(page) {
  return { sound: button(page, 'sound', SPEAKER_ICONS.high), music: button(page, 'music', MUSIC_ICONS.on), ...line(page) };
}

export function paintSwitches(switches, { volume, music }, { open }) {
  const level = volumeIcon(volume);
  if (switches.sound.dataset.level !== level) {
    switches.sound.dataset.level = level;
    switches.sound.innerHTML = SPEAKER_ICONS[level];
  }
  switches.sound.setAttribute('aria-expanded', String(open));
  switches.music.setAttribute('aria-pressed', String(music));
  switches.music.innerHTML = MUSIC_ICONS[music ? 'on' : 'off'];
  switches.volume.hidden = !open;
  const value = String(Math.round(volume * 100));
  if (switches.range.value !== value) switches.range.value = value;
}

export function labelSwitches(switches, labels) {
  for (const [name, target] of [['sound', switches.sound], ['music', switches.music], ['volume', switches.range]]) {
    if (target.getAttribute('aria-label') !== labels[name]) target.setAttribute('aria-label', labels[name]);
  }
}

const px = (value) => `${value}px`;

export function placeSwitches(switches, { sound, music, volume }) {
  for (const [target, { x, y, size }] of [[switches.sound, sound], [switches.music, music]]) {
    Object.assign(target.style, { left: px(x), top: px(y), width: px(size), height: px(size) });
  }
  Object.assign(switches.volume.style, { left: px(volume.x), top: px(volume.y), width: px(volume.width), height: px(volume.length) });
  Object.assign(switches.range.style, { width: px(volume.length), height: px(volume.width) });
}
