import { DAY_THEME } from './art-palette.js';

const { ground, hud } = DAY_THEME;
const SKY = `var(--racer-sky,${ground.sky})`;
const PANEL = `var(--racer-panel,${hud.strip})`;
const EDGE = `var(--racer-edge,${hud.edge})`;
const TEXT = `var(--racer-text,${hud.text})`;
const OFF = `var(--racer-off,${hud.off})`;
const OFF_TEXT = `var(--racer-off-text,${hud.offText})`;

export const STYLE = `ft-racer{display:block;position:relative;width:100%;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;background:${SKY}}
ft-racer canvas{display:block;width:100%;height:100%;touch-action:none}
ft-racer .go{position:absolute;margin:0;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;touch-action:none;-webkit-appearance:none;appearance:none}
ft-racer .go[hidden]{display:none}
ft-racer .go:focus-visible{outline:4px solid ${TEXT};outline-offset:2px}
ft-racer .sound-switch{position:absolute;z-index:1;box-sizing:border-box;width:44px;height:44px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;border:3px solid ${EDGE};border-radius:50%;background:${PANEL};color:${TEXT};box-shadow:0 3px 0 #243247;cursor:pointer;touch-action:manipulation;-webkit-appearance:none;appearance:none}
ft-racer .sound-switch svg{width:24px;height:24px;pointer-events:none}
ft-racer .sound-switch[aria-pressed=false]{background:${OFF};color:${OFF_TEXT}}
ft-racer .sound-switch[data-level=off]{background:${OFF};color:${OFF_TEXT}}
ft-racer .volume-pop{position:absolute;z-index:1;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:3px solid ${EDGE};border-radius:22px;background:${PANEL};box-shadow:0 3px 0 #243247;touch-action:none}
ft-racer .volume-pop[hidden]{display:none}
ft-racer .volume{flex:none;margin:0;padding:0;direction:ltr;background:transparent;transform:rotate(-90deg);-webkit-appearance:none;appearance:none;touch-action:none;cursor:pointer}
ft-racer .volume:focus-visible{outline:4px solid ${TEXT};outline-offset:2px}
ft-racer .volume::-webkit-slider-runnable-track{height:10px;border-radius:5px;background:${TEXT}}
ft-racer .volume::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:40px;height:40px;margin-top:-15px;border:3px solid #243247;border-radius:50%;background:#FFCF3F}
ft-racer .volume::-moz-range-track{height:10px;border-radius:5px;background:${TEXT}}
ft-racer .volume::-moz-range-thumb{box-sizing:border-box;width:40px;height:40px;border:3px solid #243247;border-radius:50%;background:#FFCF3F}
ft-racer .sound-switch:focus-visible{outline:4px solid ${TEXT};outline-offset:2px}`;

export function injectStyle(page) {
  if (page.head.querySelector('style[data-ft-racer]')) return;
  const style = page.createElement('style');
  style.dataset.ftRacer = '';
  style.textContent = STYLE;
  page.head.append(style);
}
