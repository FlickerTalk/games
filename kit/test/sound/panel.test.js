import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSound } from "../../src/sound/sound.js";
import { mountSoundControls } from "../../src/sound/panel.js";
import { SOUND_ICONS } from "../../src/sound/icons.js";
import { SOUND_KEY } from "../../src/sound/settings.js";

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(|\b(?:white|black|gr[ae]y|silver)\b/i;

function fakeFt(kept) {
  const writes = [];
  return {
    writes,
    store: {
      get: async (key) => (key === SOUND_KEY && kept ? JSON.stringify(kept) : null),
      set: async (key, value) => writes.push([key, value]) > 0,
    },
  };
}

async function mounted({ kept, lang = "en", dir = "ltr" } = {}) {
  document.body.innerHTML = `<div class="ftg" dir="${dir}"><ion-toolbar class="ftg-bar"><ion-buttons slot="end" data-part="actions"><ion-button data-kit="resign"></ion-button></ion-buttons></ion-toolbar></div>`;
  const root = document.querySelector(".ftg");
  const bar = root.querySelector("ion-toolbar");
  const actions = root.querySelector('[data-part="actions"]');
  const ft = fakeFt(kept);
  const sound = createSound({}, { ft, page: document, AudioContextClass: null });
  await sound.ready;
  const panel = mountSoundControls(sound, { bar, before: actions, layer: root, lang });
  const group = bar.querySelector(".ftg-sound-buttons");
  const speaker = group.querySelector('[data-sound="speaker"]');
  const music = group.querySelector('[data-sound="music"]');
  const line = root.querySelector(".ftg-volume");
  return { root, bar, group, ft, sound, panel, speaker, music, line, range: line.querySelector("ion-range") };
}

const aria = (node, name) => node.getAttribute(name) ?? node.shadowRoot?.querySelector(".button-native")?.getAttribute(name) ?? null;
const drag = (range, value) => range.dispatchEvent(new CustomEvent("ionInput", { detail: { value } }));
const letGo = (range, value) => range.dispatchEvent(new CustomEvent("ionChange", { detail: { value } }));
function paths(markup) {
  const holder = document.createElement("template");
  holder.innerHTML = markup;
  return [...holder.content.querySelectorAll("path")].map((path) => path.getAttribute("d"));
}
const drawn = (button) => paths(button.innerHTML);
const icon = (name) => paths(SOUND_ICONS[name]);
const SLASH = "M416 432 64 80";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.head.querySelectorAll("style[data-ftg-sound]").forEach((style) => style.remove());
});

describe("the sound controls in a page", () => {
  it("put a speaker and a music button in the bar before its other buttons, named in the user's language, the line folded", async () => {
    const { bar, group, speaker, music, line, range } = await mounted({ lang: "es" });
    expect(bar.firstElementChild).toBe(group);
    expect(group.nextElementSibling.dataset.part).toBe("actions");
    expect(group.getAttribute("slot")).toBe("end");
    expect(group.querySelectorAll("[data-sound]")).toHaveLength(2);
    expect(speaker.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(aria(speaker, "aria-label")).toBe("Sonido");
    expect(aria(music, "aria-label")).toBe("Música");
    expect(range.getAttribute("aria-label")).toBe("Volumen");
    expect(line.getAttribute("role")).toBe("group");
    expect(line.getAttribute("aria-label")).toBe("Volumen");
    expect(aria(speaker, "aria-pressed")).toBe("false");
    expect(aria(music, "aria-pressed")).toBe("true");
    expect(line.hidden).toBe(true);
    expect(document.head.querySelectorAll("style[data-ftg-sound]")).toHaveLength(1);
  });

  it("unfold the line under the speaker with one tap, and fold it with another", async () => {
    const { speaker, line } = await mounted();
    speaker.getBoundingClientRect = () => ({ left: 300, right: 344, top: 6, bottom: 50, width: 44, height: 44 });
    speaker.click();
    expect(line.hidden).toBe(false);
    expect(aria(speaker, "aria-pressed")).toBe("true");
    expect(line.style.top).toBe("54px");
    speaker.click();
    expect(line.hidden).toBe(true);
  });

  it("set the whole volume while the line is dragged, crossing the speaker out at zero, and keep it with a sample when let go", async () => {
    const { sound, speaker, range, ft } = await mounted();
    const played = vi.spyOn(sound, "play");
    speaker.click();
    expect(range.value).toBe(100);
    expect(drawn(speaker)).toEqual(icon("volume-high-outline"));
    drag(range, 30);
    expect(sound.settings.volume).toBe(0.3);
    expect(drawn(speaker)).toEqual(icon("volume-low-outline"));
    drag(range, 0);
    expect(drawn(speaker)).toEqual(icon("volume-mute-outline"));
    expect(ft.writes).toEqual([]);
    drag(range, 40);
    letGo(range, 40);
    await vi.advanceTimersByTimeAsync(0);
    expect(ft.writes.at(-1)).toEqual([SOUND_KEY, '{"volume":0.4,"music":true}']);
    expect(played).toHaveBeenCalledWith("tap");
  });

  it("turn the music off and on with the note button, striking it through while off", async () => {
    const { sound, music, ft } = await mounted();
    music.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(sound.settings.music).toBe(false);
    expect(aria(music, "aria-pressed")).toBe("false");
    expect(drawn(music)).toEqual([...icon("musical-notes-outline"), SLASH]);
    expect(icon("volume-mute-outline")[0]).toBe(SLASH);
    expect(ft.writes.at(-1)).toEqual([SOUND_KEY, '{"volume":1,"music":false}']);
    music.click();
    expect(drawn(music)).toEqual(icon("musical-notes-outline"));
  });

  it("fold the line on a tap anywhere else, on Escape, and a few seconds after it is let go", async () => {
    const { root, speaker, line, range } = await mounted();
    speaker.click();
    range.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(line.hidden).toBe(false);
    root.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(line.hidden).toBe(true);
    speaker.click();
    line.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(line.hidden).toBe(true);
    expect(document.activeElement).toBe(speaker);
    speaker.click();
    letGo(range, 60);
    await vi.advanceTimersByTimeAsync(2900);
    expect(line.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(line.hidden).toBe(true);
  });

  it("show the kept settings once they arrive, and speak another language when told", async () => {
    const { speaker, music, range, panel } = await mounted({ kept: { volume: 0, music: false } });
    expect(drawn(speaker)).toEqual(icon("volume-mute-outline"));
    expect(aria(music, "aria-pressed")).toBe("false");
    expect(range.value).toBe(0);
    panel.update("ar");
    expect(aria(speaker, "aria-label")).toBe("الصوت");
  });

  it("leave nothing behind when taken away", async () => {
    const { root, bar, sound, panel, speaker } = await mounted();
    speaker.click();
    panel.destroy();
    expect(bar.querySelector("[data-sound]")).toBeNull();
    expect(bar.querySelector(".ftg-sound-buttons")).toBeNull();
    expect(root.querySelector(".ftg-volume")).toBeNull();
    expect(() => sound.set({ volume: 0.2 })).not.toThrow();
    expect(() => root.dispatchEvent(new Event("pointerdown", { bubbles: true }))).not.toThrow();
  });

  it("take their colours only from the kit's tokens", () => {
    const css = readFileSync(join(import.meta.dirname, "..", "..", "src", "sound", "sound.css"), "utf8");
    for (const line of css.split("\n")) expect(line).not.toMatch(COLOUR);
    expect(css).toMatch(/min-height: 44px/);
  });
});
