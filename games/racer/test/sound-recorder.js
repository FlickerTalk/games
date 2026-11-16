export function soundRecorder() {
  const heard = { cues: [], engine: [], songs: [], awake: [], volume: [], music: [], unlocks: 0, ticks: 0, closed: false };
  return {
    heard,
    unlock: () => {
      heard.unlocks += 1;
    },
    cue: (name) => heard.cues.push(name),
    engine: (tone) => heard.engine.push(tone),
    song: (name) => heard.songs.push(name),
    setAwake: (awake) => heard.awake.push(awake),
    setVolume: (gain) => heard.volume.push(gain),
    setMusicOn: (on) => heard.music.push(on),
    tick: () => {
      heard.ticks += 1;
    },
    close: () => {
      heard.closed = true;
    },
  };
}
