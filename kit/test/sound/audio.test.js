import { beforeEach, describe, expect, it } from "vitest";
import { DRONE_LEVEL, LIMITER, MASTER_LEVEL, MUSIC_LEVEL, droneLayers, openAudio } from "../../src/sound/audio.js";
import { TUNES } from "../../src/sound/tunes.js";
import { compileScore } from "../../src/sound/score.js";
import { instrumentVoices } from "../../src/sound/instruments.js";
import { hold, noise, pluck, shape } from "../../src/sound/voices.js";
import { loudestMoment } from "./checks.js";
import { FakeAudioContext, nodesOf, reaches, sourcesOf } from "./fake-audio.js";

beforeEach(() => {
  FakeAudioContext.made = [];
});

const opened = () => {
  const audio = openAudio(FakeAudioContext);
  return { audio, context: FakeAudioContext.made[0] };
};

const masterOf = (context) => nodesOf(context, "gain").find((node) => node.outputs.includes(nodesOf(context, "compressor")[0]));

describe("opening Web Audio", () => {
  it("gives nothing when the page has no Web Audio or refuses to make it", () => {
    expect(openAudio(undefined)).toBeNull();
    class Refused {
      constructor() {
        throw new DOMException("not allowed", "NotAllowedError");
      }
    }
    expect(openAudio(Refused)).toBeNull();
  });

  it("starts a silent sample at once, so a phone that waits for a sound inside the touch lets audio out", () => {
    const { context } = opened();
    const [blank] = nodesOf(context, "buffer");
    expect(blank.started).toBe(0);
    expect(blank.buffer.length).toBe(1);
    expect(blank.outputs).toEqual([context.destination]);
  });

  it("sends effects, music and continuous voices through one master level and a limiter", () => {
    const { audio, context } = opened();
    const [limiter] = nodesOf(context, "compressor");
    for (const bus of ["effects", "music", "drones"]) expect(reaches(audio.buses[bus], context.destination), bus).toBe(true);
    expect(limiter.outputs).toEqual([context.destination]);
    for (const [name, value] of Object.entries(LIMITER)) expect(limiter[name].value, name).toBe(value);
    expect(masterOf(context).gain.value).toBe(MASTER_LEVEL);
    expect(audio.buses.music.gain.value).toBe(MUSIC_LEVEL);
    expect(audio.buses.drones.gain.value).toBe(DRONE_LEVEL);
    expect(audio.buses.effects.gain.value).toBe(1);
  });

  it("keeps a continuous voice at its loudest under the music at its usual level", () => {
    for (const [name, tune] of Object.entries(TUNES)) {
      const voices = compileScore(tune).events.flatMap((event) => instrumentVoices(event).map((voice) => ({ ...voice, start: event.time })));
      expect(DRONE_LEVEL, name).toBeLessThan(MUSIC_LEVEL * loudestMoment(voices));
    }
  });
});

describe("a voice played", () => {
  it("starts and stops on time in its bus, shaped by its envelope, and lets go of its nodes when it ends", () => {
    const { audio, context } = opened();
    const before = sourcesOf(context).length;
    const voice = pluck("triangle", 440, 0.1, 0.2, 0.3, { toFrequency: 220 });
    audio.voice(voice, 2, "effects");
    const [source] = sourcesOf(context).slice(before);
    expect(source.started).toBeCloseTo(2.1, 12);
    expect(source.stopped).toBeGreaterThan(2.3);
    expect(source.frequency.events.map((event) => event.type)).toEqual(["set", "exponential"]);
    expect(reaches(source, audio.buses.effects)).toBe(true);
    const level = source.outputs[0];
    expect(level.gain.events.map(({ type, value, time }) => [type, value, time])).toEqual(
      shape(voice, 2).map(([kind, value, time]) => [kind === "set" ? "set" : kind, value, time]),
    );
    source.onended();
    expect(level.disconnected).toBe(true);
  });

  it("plays noise from one shared buffer through its filter, sweeping it", () => {
    const { audio, context } = opened();
    audio.voice(noise(0, 0.3, 0.1, { type: "bandpass", frequency: 400, toFrequency: 2000, q: 1.2 }), 0, "music");
    const source = sourcesOf(context).at(-1);
    expect(source.buffer).toBe(audio.noise);
    expect(source.loop).toBe(true);
    const [filter] = source.outputs;
    expect(filter.kind).toBe("filter");
    expect(filter.type).toBe("bandpass");
    expect(filter.Q.value).toBe(1.2);
    expect(filter.frequency.events.at(-1)).toMatchObject({ type: "exponential", value: 2000 });
    expect(reaches(source, audio.buses.music)).toBe(true);
    expect(audio.noise.length).toBe(context.sampleRate);
  });

  it("moves a bus's level smoothly from a moment on, forgetting what was planned after it", () => {
    const { audio } = opened();
    audio.level("music", 0.03, 5, 0.2);
    expect(audio.buses.music.gain.events).toEqual([{ type: "cancel", time: 5 }, { type: "target", value: 0.03, time: 5, constant: 0.2 }]);
  });
});

describe("a continuous voice", () => {
  it("is made of layers whose loudest sum is never above full", () => {
    const layers = droneLayers([{ wave: "sawtooth", frequency: 60, gain: 0.8 }, { wave: "noise", gain: 0.6, wobble: { rate: 4, depth: 0.5 } }]);
    const peak = layers.reduce((sum, layer) => sum + layer.gain * (1 + (layer.wobble?.depth ?? 0)), 0);
    expect(peak).toBeCloseTo(1, 12);
    expect(droneLayers([{ wave: "sine", frequency: 80, gain: 0.3 }])[0].gain).toBe(0.3);
  });

  it("runs silent into its own bus until given a level, then glides to the level and pitch it is told", () => {
    const { audio, context } = opened();
    const before = sourcesOf(context).length;
    const drone = audio.drone([{ wave: "sawtooth", frequency: 60, gain: 0.5, filter: { type: "lowpass", frequency: 300 } }, { wave: "noise", gain: 0.2, wobble: { rate: 3, depth: 0.4 } }]);
    const made = sourcesOf(context).slice(before);
    expect(made).toHaveLength(3);
    expect(made.every((source) => source.started === 0)).toBe(true);
    const [wobble] = made.filter((source) => source.kind === "oscillator" && source.frequency.value === 3);
    const heard = made.filter((source) => source !== wobble);
    expect(heard.every((source) => reaches(source, audio.buses.drones))).toBe(true);
    const level = nodesOf(context, "gain").find((node) => node.outputs.includes(audio.buses.drones));
    expect(level.gain.value).toBe(0);
    const hiss = made.find((source) => source.kind === "buffer");
    expect(wobble.outputs[0].outputs[0]).toBe(hiss.outputs[0].gain);
    drone.set(0.5, 2, 1);
    expect(level.gain.events.at(-1)).toMatchObject({ type: "target", value: 0.5, time: 1 });
    const tone = made.find((source) => source.kind === "oscillator" && source.type === "sawtooth");
    expect(tone.frequency.events.at(-1)).toMatchObject({ type: "target", value: 120, time: 1 });
    expect(tone.outputs[0].frequency.events.at(-1)).toMatchObject({ type: "target", value: 600 });
    drone.stop(2);
    expect(made.every((source) => source.stopped > 2)).toBe(true);
  });
});

describe("the page's audio", () => {
  it("wakes, sleeps and closes, and a refusal from the page never escapes", async () => {
    const refused = [];
    class Grumpy extends FakeAudioContext {
      resume() {
        refused.push("resume");
        return Promise.reject(new DOMException("no", "NotAllowedError"));
      }

      suspend() {
        refused.push("suspend");
        throw new DOMException("no", "InvalidStateError");
      }

      close() {
        refused.push("close");
        return Promise.reject(new DOMException("no", "InvalidStateError"));
      }
    }
    const audio = openAudio(Grumpy);
    audio.wake();
    audio.sleep();
    audio.close();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refused).toEqual(["resume", "suspend", "close"]);
  });

  it("says whether it is running", () => {
    const { audio, context } = opened();
    expect(audio.running).toBe(false);
    audio.wake();
    expect(context.state).toBe("running");
    expect(audio.running).toBe(true);
    expect(audio.time()).toBe(0);
    context.currentTime = 3;
    expect(audio.time()).toBe(3);
    audio.voice(hold("sine", 220, 0, 0.5, 0.1), 3, "effects");
  });
});
