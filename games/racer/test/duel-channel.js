import { createDuel } from '../src/duel.js';
import { normalizeProfile } from '../src/profile.js';
import { clearPathX } from '../src/robot.js';

export const FRAME_MS = 16;

export function channel({ delay = 30, holdFrom = Infinity, holdTo = Infinity, batchEvery = 0 } = {}) {
  const queue = [];
  const sent = { a: [], b: [] };
  const ends = {};
  let refuse = { a: false, b: false };
  const side = (from, to) => ({
    live: {
      send(data) {
        sent[from].push(data);
        if (refuse[from]) return Promise.resolve(false);
        if (ends[to].open) queue.push({ to, data, at: ends.now + delay });
        return Promise.resolve(true);
      },
    },
  });
  ends.now = 0;
  ends.a = { open: true };
  ends.b = { open: true };
  return {
    sent,
    ends,
    ft: { a: side('a', 'b'), b: side('b', 'a') },
    refuse: (from) => {
      refuse = { ...refuse, [from]: true };
    },
    deliver(now, duels) {
      ends.now = now;
      if (now >= holdFrom && now < holdTo) return;
      if (batchEvery && now % batchEvery >= FRAME_MS) return;
      const due = queue.filter((one) => one.at <= now);
      for (const one of due) {
        queue.splice(queue.indexOf(one), 1);
        if (ends[one.to].open) duels[one.to].heard(one.data);
      }
    },
  };
}

export function driver(game) {
  const obstacles = [...game.track.traffic, ...game.track.hazards];
  return { accelerate: true, steer: 0, targetX: clearPathX(game.player, obstacles, 16) };
}

export const idle = () => ({ accelerate: false, steer: 0, targetX: null });

let ids = 0;
const nextId = (prefix) => () => `${prefix}${(ids += 1).toString(36).padStart(12, '0')}`;

export function pair(net, { a = {}, b = {}, timing = {} } = {}) {
  let now = 0;
  const clock = () => now;
  const won = { a: 0, b: 0 };
  const make = (name, fields) => createDuel({
    ft: net.ft[name],
    profile: normalizeProfile(fields),
    clock,
    timing: { answer: 400, silence: 6000, ...timing },
    newId: nextId(name),
    onWin: () => {
      won[name] += 1;
    },
  });
  const duels = { a: make('a', a), b: make('b', b) };
  const flush = async () => {
    for (let turn = 0; turn < 4; turn += 1) await null;
  };
  return {
    duels,
    won,
    get now() {
      return now;
    },
    async play(ms, { drive = { a: driver, b: driver }, until = () => false, watch = () => {} } = {}) {
      const end = now + ms;
      while (now < end && !until()) {
        now += FRAME_MS;
        net.deliver(now, duels);
        for (const name of ['a', 'b']) {
          if (!net.ends[name].open) continue;
          const game = duels[name].game;
          duels[name].frame(now, game ? (drive[name] ?? idle)(game) : idle());
        }
        watch(now);
        await flush();
      }
    },
  };
}
