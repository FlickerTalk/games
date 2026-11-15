import { describe, expect, it } from "vitest";
import { KIT_TEXTS } from "../../src/i18n.js";
import { SOUND_TEXTS } from "../../src/sound/texts.js";
import { checkTexts } from "../helpers.js";

describe("the texts of the sound controls", () => {
  it("speak the app's 21 languages in the kit's order, every key in each", () => {
    checkTexts(SOUND_TEXTS);
    expect(Object.keys(SOUND_TEXTS)).toEqual(Object.keys(KIT_TEXTS));
  });

  it("name the speaker, the music switch and the volume line", () => {
    expect(SOUND_TEXTS.en).toEqual({ sound: "Sound", music: "Music", volume: "Volume" });
    expect(SOUND_TEXTS.es).toEqual({ sound: "Sonido", music: "Música", volume: "Volumen" });
  });
});
