import STYLE from "./sound.css";
import { soundControls } from "./controls.js";
import { SOUND_ICONS, soundIcon } from "./icons.js";

const LEVELS = { mute: "volume-mute-outline", low: "volume-low-outline", high: "volume-high-outline" };
const MUTE = SOUND_ICONS["volume-mute-outline"];
const SLASH = MUTE.slice(0, MUTE.indexOf("/>") + 2);
const REST_MS = 3000;

function addStyle(page) {
  if (page.head.querySelector("style[data-ftg-sound]")) return;
  const style = page.createElement("style");
  style.dataset.ftgSound = "";
  style.textContent = STYLE;
  page.head.append(style);
}

function label(node, name) {
  if (node.getAttribute("aria-label") === name) return;
  node.setAttribute("aria-label", name);
  node.setAttribute("title", name);
}

function redraw(node, key, value, markup) {
  if (node.dataset[key] === value) return;
  node.dataset[key] = value;
  node.innerHTML = markup();
}

function parse(page, html) {
  const holder = page.createElement("template");
  holder.innerHTML = html;
  return holder.content.firstElementChild;
}

// Ionic's ion-buttons emulates slots by patching DOM insertion, so the group is filled before it is placed.
function build(bar, before, layer) {
  const page = bar.ownerDocument;
  addStyle(page);
  const group = parse(page, '<ion-buttons slot="end" class="ftg-sound-buttons"><ion-button class="ftg-sound" data-sound="speaker"></ion-button><ion-button class="ftg-sound" data-sound="music"></ion-button></ion-buttons>');
  const line = parse(page, '<div class="ftg-volume" role="group" hidden><ion-range min="0" max="100" step="1" color="primary"></ion-range></div>');
  bar.insertBefore(group, before ?? null);
  layer.append(line);
  const speaker = group.querySelector('[data-sound="speaker"]');
  return { page, group, speaker, music: group.querySelector('[data-sound="music"]'), line, range: line.querySelector("ion-range") };
}

function paint(parts, controls, sound, lang) {
  const { speaker, music, line, range } = parts;
  const names = controls.labels(lang);
  redraw(speaker, "level", controls.icon, () => soundIcon(LEVELS[controls.icon], "icon-only"));
  redraw(music, "music", String(controls.music), () => soundIcon("musical-notes-outline", "icon-only").replace("</svg>", controls.music ? "</svg>" : `${SLASH}</svg>`));
  label(speaker, names.sound);
  label(music, names.music);
  label(range, names.volume);
  label(line, names.volume);
  speaker.setAttribute("aria-pressed", String(controls.open));
  music.setAttribute("aria-pressed", String(controls.music));
  line.hidden = !controls.open;
  const value = Math.round(sound.settings.volume * 100);
  if (range.value !== value) range.value = value;
}

function place(line, speaker) {
  const box = speaker.getBoundingClientRect();
  const rtl = speaker.closest("[dir]")?.getAttribute("dir") === "rtl";
  const width = speaker.ownerDocument.documentElement.clientWidth;
  line.style.top = `${Math.round(box.bottom + 4)}px`;
  line.style.left = rtl ? `${Math.max(8, Math.round(box.left))}px` : "";
  line.style.right = rtl ? "" : `${Math.max(8, Math.round(width - box.right))}px`;
}

function listen(bindings) {
  for (const [target, type, handler, capture] of bindings) target.addEventListener(type, handler, capture);
  return () => {
    for (const [target, type, handler, capture] of bindings) target.removeEventListener(type, handler, capture);
  };
}

export function mountSoundControls(sound, { bar, before = null, layer = bar, lang = "en" }) {
  const parts = build(bar, before, layer);
  const { page, group, speaker, music, line, range } = parts;
  const controls = soundControls(sound);
  let words = lang;
  let rest = null;
  const repaint = () => paint(parts, controls, sound, words);
  const fold = () => {
    clearTimeout(rest);
    controls.fold();
    repaint();
  };
  const restLater = () => {
    clearTimeout(rest);
    rest = setTimeout(fold, REST_MS);
  };
  const valueOf = (event) => (event.detail?.value ?? range.value) / 100;
  const unlisten = listen([
    [speaker, "click", () => {
      if (controls.toggle()) place(line, speaker);
      if (controls.open) restLater();
      repaint();
    }],
    [music, "click", () => controls.toggleMusic()],
    [range, "ionInput", (event) => {
      clearTimeout(rest);
      controls.slide(valueOf(event));
    }],
    [range, "ionChange", (event) => {
      controls.slide(valueOf(event));
      controls.release();
      restLater();
    }],
    [line, "keydown", (event) => {
      if (event.key !== "Escape") return;
      fold();
      speaker.focus();
    }],
    [page, "pointerdown", (event) => {
      if (controls.open && !line.contains(event.target) && !speaker.contains(event.target)) fold();
    }, true],
  ]);
  const unwatch = sound.onChange(repaint);
  repaint();
  return {
    update(next) {
      words = next;
      repaint();
    },
    destroy() {
      clearTimeout(rest);
      unlisten();
      unwatch();
      group.remove();
      line.remove();
    },
  };
}
