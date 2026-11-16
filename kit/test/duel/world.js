import { fakeCore } from "../helpers.js";

export function liveWorld({ latency = 40, make }) {
  const clock = { now: 1000 };
  const queue = [];
  const held = { a: false, b: false };
  const phones = {};
  for (const name of ["a", "b"]) {
    const core = fakeCore();
    phones[name] = { name, core, closed: false };
  }
  for (const name of ["a", "b"]) phones[name].made = make(phones[name], { clock: () => clock.now });
  const other = (name) => (name === "a" ? phones.b : phones.a);
  for (const name of ["a", "b"]) {
    phones[name].core.wire = (data) => {
      if (!other(name).closed) queue.push({ to: other(name), data, due: clock.now + latency });
    };
  }
  const flush = async () => {
    for (let at = 0; at < 4; at += 1) await Promise.resolve();
  };
  const deliver = async () => {
    await flush();
    const due = queue.filter((one) => one.due <= clock.now && !held[one.to.name]);
    for (const one of due) {
      queue.splice(queue.indexOf(one), 1);
      if (!one.to.closed) await one.to.core.hear(one.data);
    }
    await flush();
  };
  const pass = async (ms, each = () => {}, frame = 16) => {
    const end = clock.now + ms;
    while (clock.now < end) {
      clock.now = Math.min(end, clock.now + frame);
      for (const phone of [phones.a, phones.b]) if (!phone.closed) each(phone, clock.now);
      await deliver();
    }
  };
  return { phones, clock, queue, held, pass, deliver };
}
