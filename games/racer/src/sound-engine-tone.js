export const ENGINE_LOUDEST = 0.0616;

const IDLE = { frequency: 64, gain: 0.0224, cutoff: 260, purr: 9 };
const RISE = { frequency: 92, gain: 0.0322, cutoff: 900, purr: 16 };
const PEDAL_GAIN = 0.007;

export function engineTone({ share, pressing }) {
  const speed = Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0;
  const curve = speed ** 0.8;
  return {
    frequency: IDLE.frequency + RISE.frequency * curve,
    gain: Math.min(ENGINE_LOUDEST, IDLE.gain + RISE.gain * curve + (pressing ? PEDAL_GAIN : 0)),
    cutoff: IDLE.cutoff + RISE.cutoff * curve,
    purr: IDLE.purr + RISE.purr * curve,
  };
}
