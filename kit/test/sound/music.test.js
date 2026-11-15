import { describe, expect, it } from "vitest";
import { LOOKAHEAD, musicPlayer } from "../../src/sound/music.js";
import { compileScore } from "../../src/sound/score.js";
import { instrumentVoices } from "../../src/sound/instruments.js";

const TUNES = {
  one: { key: "C major", tempo: 120, stepsPerBeat: 2, beatsPerBar: 4, bars: 1, tracks: [{ instrument: "harp", notes: "C4:2 E4:2 G4:2 C5:2" }] },
  two: { key: "G major", tempo: 120, stepsPerBeat: 2, beatsPerBar: 4, bars: 1, tracks: [{ instrument: "drums", notes: "k h s h" }] },
};

const voicesPerLoop = (name) => compileScore(TUNES[name]).events.reduce((sum, event) => sum + instrumentVoices(event).length, 0);
const starts = (due) => due.map(({ voice, at }) => Number((at + voice.start).toFixed(6)));

describe("the music player", () => {
  it("has nothing to play until a tune is asked for", () => {
    const player = musicPlayer(TUNES);
    expect(player.due(0)).toEqual([]);
    expect(player.playing).toBeNull();
    player.play("nothing-like-this", 0);
    expect(player.playing).toBeNull();
    expect(player.due(1)).toEqual([]);
  });

  it("gives only the notes that start within the lookahead", () => {
    const player = musicPlayer(TUNES);
    player.play("one", 0);
    const due = player.due(0);
    expect(due.length).toBeGreaterThan(0);
    expect(starts(due).every((time) => time < LOOKAHEAD)).toBe(true);
    expect(player.playing).toBe("one");
  });

  it("asked frame after frame, plays every note once, round the loop, with no gap", () => {
    const player = musicPlayer(TUNES);
    player.play("one", 0);
    const heard = [];
    for (let now = 0; now <= 6.2; now += 1 / 60) heard.push(...starts(player.due(now)));
    const loop = compileScore(TUNES.one).loopSeconds;
    expect(heard.length).toBeGreaterThanOrEqual(voicesPerLoop("one") * Math.floor((6.2 + LOOKAHEAD) / loop));
    expect(new Set(heard).size).toBe(heard.length);
    const notes = [...new Set(heard)].sort((one, two) => one - two);
    const gaps = notes.slice(1).map((time, at) => time - notes[at]);
    expect(gaps.every((gap) => Math.abs(gap - 0.5) < 1e-6)).toBe(true);
  });

  it("does not restart the tune already playing, and starts another from its beginning", () => {
    const player = musicPlayer(TUNES);
    player.play("one", 0);
    player.due(0);
    player.play("one", 0.1);
    expect(starts(player.due(0.1))).toEqual([0.55]);
    player.play("two", 2);
    expect(player.playing).toBe("two");
    expect(Math.min(...starts(player.due(2)))).toBeCloseTo(2.05, 9);
  });

  it("stops when asked for no tune", () => {
    const player = musicPlayer(TUNES);
    player.play("one", 0);
    player.due(0);
    player.play(null, 1);
    expect(player.playing).toBeNull();
    expect(player.due(1)).toEqual([]);
  });

  it("after a long stall, does not rush out the notes it missed", () => {
    const player = musicPlayer(TUNES);
    player.play("one", 0);
    player.due(0);
    expect(starts(player.due(30)).every((time) => time >= 30)).toBe(true);
  });

  it("refuses a tune that cannot be played as soon as it is given", () => {
    expect(() => musicPlayer({ bad: { ...TUNES.one, tracks: [{ instrument: "harp", notes: "C4:3" }] } })).toThrow("do not fill");
  });
});
