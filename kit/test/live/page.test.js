import { describe, expect, it } from "vitest";
import { direction as kitDirection, translator as kitTranslator } from "../../src/i18n.js";
import { FRAME_START as kitStart } from "../../src/shell.js";
import { FRAME_START, direction, escape, fitView, formatTime, translator, whenDrawn } from "../../src/live/page.js";

describe("the real-time page", () => {
  it("opens at the height the turn-based games open at", () => {
    expect(FRAME_START).toBe(kitStart);
  });

  it("in a conversation's room, takes the width it is given, up to a size, controls under it or beside it on a wide screen", () => {
    const pads = { aspect: 1.2, pad: 68, side: 128, gap: 10 };
    expect(fitView({ ...pads, width: 352 })).toEqual({ mode: "column", width: 352, height: 293 });
    expect(fitView({ ...pads, width: 328 })).toEqual({ mode: "column", width: 328, height: 273 });
    expect(fitView({ ...pads, width: 640 })).toEqual({ mode: "column", width: 480, height: 400 });
    expect(fitView({ ...pads, width: 1232 })).toEqual({ mode: "row", width: 480, height: 400 });
  });

  it("full screen, fills what it measures in any shape, the controls where the track is biggest", () => {
    const pads = { aspect: 1.2, pad: 68, side: 128, gap: 10, most: Infinity };
    expect(fitView({ ...pads, width: 360, height: 484 })).toEqual({ mode: "column", width: 360, height: 300 });
    expect(fitView({ ...pads, width: 390, height: 688 })).toEqual({ mode: "column", width: 390, height: 325 });
    expect(fitView({ ...pads, width: 1280, height: 644 })).toEqual({ mode: "row", width: 772, height: 644 });
    expect(fitView({ ...pads, width: 740, height: 300 })).toEqual({ mode: "row", width: 360, height: 300 });
    expect(fitView({ ...pads, width: 360, height: 200 })).toEqual({ mode: "column", width: 192, height: 160 });
  });

  it("writes a race time as minutes, seconds and tenths, in the user's numbers, never rounding up", () => {
    expect(formatTime(41_349, "en")).toBe("0:41.3");
    expect(formatTime(41_399, "es")).toBe("0:41,3");
    expect(formatTime(65_050, "en")).toBe("1:05.0");
    expect(formatTime(5_000, "de")).toBe("0:05,0");
    expect(formatTime(Number.NaN, "en")).toBe("–");
  });

  it("translates and picks the direction exactly as the turn-based kit does", () => {
    const catalogue = { en: { a: "Lap {n}", b: "x" }, es: { a: "Vuelta {n}" }, "zh-TW": { a: "第 {n} 圈" } };
    const ours = translator(catalogue);
    const theirs = kitTranslator(catalogue);
    for (const [lang, key, vars] of [["es", "a", { n: 2 }], ["es-MX", "a", { n: 1 }], ["zh-TW", "a", { n: 3 }], ["fr", "a", {}], ["es", "b"], ["en", "nope"]]) {
      expect(ours(lang, key, vars)).toBe(theirs(lang, key, vars));
    }
    for (const lang of ["ar", "ar-EG", "en", "he", undefined]) expect(direction(lang)).toBe(kitDirection(lang));
  });

  it("waits for Ionic to have drawn its components, and not for elements nobody registered", async () => {
    customElements.define("ftl-stand-in", class extends HTMLElement {});
    const one = document.createElement("ftl-stand-in");
    const two = document.createElement("ftl-stand-in");
    const plain = document.createElement("ftl-not-registered");
    document.body.append(one, two, plain);
    let done = false;
    const waiting = whenDrawn([one, two, plain]).then(() => (done = true));
    one.classList.add("hydrated");
    await Promise.resolve();
    expect(done).toBe(false);
    two.classList.add("hydrated");
    await waiting;
    expect(done).toBe(true);
    await whenDrawn([one, plain]);
  });

  it("escapes what goes into markup", () => {
    expect(escape(`<b a="1">'&'</b>`)).toBe("&lt;b a=&quot;1&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
  });
});
