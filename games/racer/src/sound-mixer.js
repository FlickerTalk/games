import { MASTER_LEVEL, MUSIC_LEVEL, DUCKED_SHARE, LIMITER } from './sound-levels.js';

function level(context, value, output) {
  const node = context.createGain();
  node.gain.value = value;
  node.connect(output);
  return node;
}

function whiteNoise(context) {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  return buffer;
}

export function createMixer(context) {
  const limiter = context.createDynamicsCompressor();
  for (const [name, value] of Object.entries(LIMITER)) limiter[name].value = value;
  limiter.connect(context.destination);
  const master = level(context, MASTER_LEVEL, limiter);
  const music = level(context, MUSIC_LEVEL, master);
  return {
    effects: level(context, 1, master),
    engine: level(context, 1, master),
    music,
    noise: whiteNoise(context),
    setVolume(now, gain) {
      master.gain.setTargetAtTime(MASTER_LEVEL * gain, now, 0.04);
    },
    duckMusic(now, seconds) {
      music.gain.cancelScheduledValues(now);
      music.gain.setTargetAtTime(MUSIC_LEVEL * DUCKED_SHARE, now, 0.03);
      music.gain.setTargetAtTime(MUSIC_LEVEL, now + seconds, 0.25);
    },
  };
}
