import { describe, expect, it } from "vitest";
import { keyValue, lineValue, loudness, soundControls } from "../../src/sound/controls.js";

function fakeSound(settings = { volume: 1, music: true }) {
  const heard = { saves: 0, played: [] };
  return {
    heard,
    get settings() {
      return { ...settings };
    },
    set(change) {
      Object.assign(settings, change);
    },
    save() {
      heard.saves += 1;
      return Promise.resolve(true);
    },
    play(name) {
      heard.played.push(name);
      return true;
    },
  };
}

describe("the speaker", () => {
  it("shows the level: crossed out at zero, one wave when low, more when high", () => {
    expect(loudness(0)).toBe("mute");
    expect(loudness(0.01)).toBe("low");
    expect(loudness(0.49)).toBe("low");
    expect(loudness(0.5)).toBe("high");
    expect(loudness(1)).toBe("high");
  });

  it("unfolds the volume line and folds it again", () => {
    const controls = soundControls(fakeSound());
    expect(controls.open).toBe(false);
    expect(controls.toggle()).toBe(true);
    expect(controls.open).toBe(true);
    controls.toggle();
    expect(controls.open).toBe(false);
    controls.toggle();
    controls.fold();
    expect(controls.open).toBe(false);
  });
});

describe("the volume line", () => {
  it("sets the volume while dragged, and keeps it with a short sample only when let go", () => {
    const sound = fakeSound();
    const controls = soundControls(sound);
    controls.slide(0.304);
    expect(sound.settings.volume).toBe(0.3);
    expect(controls.icon).toBe("low");
    expect(sound.heard).toEqual({ saves: 0, played: [] });
    controls.release();
    expect(sound.heard).toEqual({ saves: 1, played: ["tap"] });
  });

  it("let go at zero, is kept silent: no sample", () => {
    const sound = fakeSound();
    const controls = soundControls(sound);
    controls.slide(-3);
    controls.release();
    expect(sound.settings.volume).toBe(0);
    expect(controls.icon).toBe("mute");
    expect(sound.heard.played).toEqual([]);
    controls.slide(9);
    expect(sound.settings.volume).toBe(1);
  });

  it("turns a point on a line of any direction into a volume, held at its ends", () => {
    expect(lineValue(150, 100, 300)).toBe(0.25);
    expect(lineValue(250, 300, 100)).toBe(0.25);
    expect(lineValue(40, 200, 0)).toBe(0.8);
    expect(lineValue(-10, 0, 100)).toBe(0);
    expect(lineValue(500, 0, 100)).toBe(1);
    expect(lineValue(5, 5, 5)).toBe(0);
  });
});

describe("the keyboard", () => {
  it("moves the volume a tenth with the arrows, to the ends with Home and End", () => {
    expect(keyValue("ArrowUp", 0.5)).toBe(0.6);
    expect(keyValue("ArrowRight", 0.5)).toBe(0.6);
    expect(keyValue("ArrowDown", 0.5)).toBe(0.4);
    expect(keyValue("ArrowLeft", 0.5)).toBe(0.4);
    expect(keyValue("ArrowUp", 0.2)).toBe(0.3);
    expect(keyValue("ArrowUp", 0.95)).toBe(1);
    expect(keyValue("ArrowDown", 0.05)).toBe(0);
    expect(keyValue("Home", 0.5)).toBe(0);
    expect(keyValue("End", 0.5)).toBe(1);
    expect(keyValue("a", 0.5)).toBeNull();
  });

  it("follows the line's direction right to left", () => {
    expect(keyValue("ArrowLeft", 0.5, { rtl: true })).toBe(0.6);
    expect(keyValue("ArrowRight", 0.5, { rtl: true })).toBe(0.4);
    expect(keyValue("ArrowUp", 0.5, { rtl: true })).toBe(0.6);
  });

  it("drives the controls: a step is kept at once, Escape folds the line, other keys are left alone", () => {
    const sound = fakeSound({ volume: 0.5, music: true });
    const controls = soundControls(sound);
    controls.toggle();
    expect(controls.key("ArrowDown")).toBe(true);
    expect(sound.settings.volume).toBe(0.4);
    expect(sound.heard.saves).toBe(1);
    expect(controls.key("Escape")).toBe(true);
    expect(controls.open).toBe(false);
    expect(controls.key("Tab")).toBe(false);
  });
});

describe("the music switch", () => {
  it("turns the music off and on, and keeps the choice", () => {
    const sound = fakeSound();
    const controls = soundControls(sound);
    controls.toggleMusic();
    expect(controls.music).toBe(false);
    controls.toggleMusic();
    expect(controls.music).toBe(true);
    expect(sound.heard.saves).toBe(2);
  });
});

describe("the labels", () => {
  it("name each control in the user's language, and say the volume in their digits", () => {
    const controls = soundControls(fakeSound({ volume: 0.4, music: true }));
    expect(controls.labels("en")).toEqual({ sound: "Sound", music: "Music", volume: "Volume", value: "40%" });
    expect(controls.labels("de")).toMatchObject({ sound: "Ton", volume: "Lautstärke", value: "40\u00a0%" });
    expect(controls.labels("tr").value).toBe("%40");
    expect(controls.labels("es-MX").sound).toBe("Sonido");
    expect(controls.labels("zh-TW").music).toBe("音樂");
    expect(controls.labels("xx").sound).toBe("Sound");
    expect(controls.labels(undefined).sound).toBe("Sound");
  });
});
