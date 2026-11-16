import { describe, expect, it } from "vitest";
import { checkTexts } from "../../../kit/test/helpers.js";
import { labelFor, say } from "../src/labels.js";
import { freshRound } from "../src/rounds.js";
import { TEXTS } from "../src/texts.js";

const LANGS = ["en", "es", "fr", "de", "it", "pt", "ro", "pl", "ru", "uk", "tr", "ar", "hi", "bn", "id", "vi", "th", "ja", "ko", "zh-CN", "zh-TW"];
const SETUP = { team: true, tier: 0, golems: 4, hits: 4, caps: 0, most: 100, seed: "AbCdEfGh" };

function playing(extra = {}) {
  const round = freshRound({ kind: "flick", setup: SETUP, now: 0 });
  round.core = { ...round.core, golems: [{ number: 12, cap: null }], value: 12, count: 1, last: null, at: 0 };
  return { lang: "es", mode: "flick", looks: "mallet", screen: "play", round: { ...round, ...extra } };
}

describe("the words outside the canvas", () => {
  it("are in the app's 21 languages, English the source, with the same keys and gaps, translated rather than copied", () => {
    checkTexts(TEXTS);
    expect(Object.keys(TEXTS)).toEqual(LANGS);
    for (const lang of LANGS) expect(TEXTS[lang].name, lang).toBe("Shard Splitter");
    for (const lang of LANGS.slice(1)) {
      const same = Object.keys(TEXTS.en).filter((key) => !["name", "flick"].includes(key) && TEXTS[lang][key] === TEXTS.en[key]);
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThanOrEqual(3);
    }
  });

  it("never call the game one for children", () => {
    for (const lang of LANGS) for (const text of Object.values(TEXTS[lang])) expect(text).not.toMatch(/child|kid|niñ|enfant|Kinder|bambin|criança|copii|dziec|дет|діт|çocuk|أطفال|बच्च|শিশু|anak|trẻ em|เด็ก|子ども|子供|어린이|儿童|兒童/i);
  });

  it("say what a divisor button would do to the number the golems carry now", () => {
    const state = playing();
    expect(labelFor({ kind: "hit", value: 2 }, state)).toBe("Dividir 12 entre 2");
    expect(labelFor({ kind: "hit", value: 4 }, { ...state, lang: "en" })).toBe("Divide 12 by 4");
    const capped = playing();
    capped.round.core = { ...capped.round.core, golems: [{ number: 12, cap: 4 }] };
    expect(labelFor({ kind: "hit", value: 4 }, { ...capped, lang: "en" })).toBe("4 is under the cap: try another divisor");
    const theirs = playing({ mySide: 1 });
    expect(labelFor({ kind: "hit", value: 3 }, { ...theirs, lang: "en" })).toBe("3: it is your teammate's turn");
    expect(labelFor({ kind: "hit", value: 2 }, { lang: "en", screen: "play", round: null })).toBe("Divisor 2");
  });

  it("name every other button the canvas draws, in the player's language", () => {
    const state = playing();
    expect(labelFor({ kind: "play" }, { ...state, screen: "home" })).toBe("Jugar");
    expect(labelFor({ kind: "again" }, state)).toBe("Jugar otra vez");
    expect(labelFor({ kind: "pause" }, state)).toBe("Pausa");
    expect(labelFor({ kind: "look", value: 1 }, state)).toBe("Mazo 2");
    expect(labelFor({ kind: "look", value: 0 }, { ...state, looks: "place" })).toBe("Lugar 1");
    expect(labelFor({ kind: "tab", value: "place" }, state)).toBe("Lugares");
    expect(labelFor({ kind: "tab", value: "mallet" }, state)).toBe("Mazos");
    expect(labelFor({ kind: "rival" }, state)).toBe("FlickerTalk");
    expect(labelFor({ kind: "rival" }, { ...state, mode: "friend" })).toBe("Volver a llamar a tu amigo");
    expect(labelFor({ kind: "speaker" }, state)).toBe("Sonido");
    expect(labelFor({ kind: "profile", label: "Ari" }, state)).toBe("Ari");
  });

  it("fall back on English for a language it does not have, and take a regional tag", () => {
    expect(say("xx", "play")).toBe("Play");
    expect(say("pt-BR", "play")).toBe("Jogar");
    expect(say("zh-TW", "home")).toBe(TEXTS["zh-TW"].home);
  });
});
