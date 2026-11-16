const PASS_GAP = 1;
const WHOOSH_REST_SECONDS = 1.5;
const RACE_SCENES = new Set(['countdown', 'racing', 'finished', 'paused']);
const CRASH_CUES = { bump: 'bump', splash: 'splash' };

export function createCueWatcher() {
  const memory = { previous: null, heard: new WeakSet(), place: 'level', lastWhoosh: -Infinity };
  return (snapshot) => {
    const cues = memory.previous ? [
      ...sceneCues(memory.previous, snapshot, memory),
      ...countdownCues(memory.previous, snapshot),
      ...garageCues(memory.previous, snapshot),
      ...crashCues(snapshot, memory),
      ...passCues(snapshot, memory),
    ] : [];
    for (const moment of snapshot.moments) memory.heard.add(moment);
    memory.previous = snapshot;
    return cues;
  };
}

function sceneCues(previous, current, memory) {
  const from = previous.scene;
  const to = current.scene;
  if (from === to) return [];
  if (to === 'countdown') {
    memory.place = 'level';
    return ['tick'];
  }
  if (to === 'racing' && from === 'countdown') return ['go'];
  if (to === 'finished') return current.crossed ? ['finish'] : [];
  if (to === 'gift') return ['gift'];
  if (to === 'card' && RACE_SCENES.has(from)) return resultCues(current.result);
  if (to === 'garage' || from === 'garage' || from === 'gift') return ['tap'];
  return [];
}

function resultCues(result) {
  if (result === 'won') return ['win'];
  if (result === 'lost' || result === 'second') return ['lose'];
  return [];
}

function countdownCues(previous, current) {
  if (previous.scene !== 'countdown' || current.scene !== 'countdown') return [];
  const half = current.countdown.length / 2;
  return previous.countdown.timer > half && current.countdown.timer <= half ? ['tick'] : [];
}

function garageCues(previous, current) {
  if (previous.scene !== 'garage' || current.scene !== 'garage') return [];
  const before = previous.garage;
  const now = current.garage;
  if (now.kind !== before.kind || now.color !== before.color) return ['pick'];
  if (now.page !== before.page) return ['tap'];
  if (now.nudgeAt !== null && now.nudgeAt !== before.nudgeAt) return ['nudge'];
  return [];
}

function crashCues(snapshot, memory) {
  return snapshot.moments
    .filter((moment) => !memory.heard.has(moment) && moment.by === 'player' && CRASH_CUES[moment.kind])
    .map((moment) => CRASH_CUES[moment.kind]);
}

function passCues({ scene, lead, time }, memory) {
  if (scene !== 'racing' || lead === null) return [];
  if (lead < -PASS_GAP) memory.place = 'behind';
  if (lead <= PASS_GAP) return [];
  const passed = memory.place === 'behind' && time - memory.lastWhoosh >= WHOOSH_REST_SECONDS;
  memory.place = 'ahead';
  if (!passed) return [];
  memory.lastWhoosh = time;
  return ['whoosh'];
}
