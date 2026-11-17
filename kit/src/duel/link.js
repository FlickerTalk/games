import { Follow } from "../live/follow.js";
import { LiveClock } from "./clock.js";
import { ScoredSession } from "./session.js";

const AWAY = ["notOpen", "left", "unreachable", "silent", "update"];
const PLAYING = ["countdown", "running", "finished", "over"];

const saysPaused = (s) => s?.g?.p === 1;

function wrap(check) {
  return (s) => {
    if (!s || typeof s !== "object") return null;
    const g = check(s.g);
    if (g === null || g === undefined) return null;
    return { g, o: Number.isFinite(s.o) ? s.o : null };
  };
}

// A canvas game's live link to the other phone: only with a person, never against FlickerTalk; silent until start().
export class CanvasDuel {
  constructor({ ft, g, gv, app, check, clock = () => performance.now(), timing = {}, onChange = () => {}, onState = () => {}, newId }) {
    this.clock = new LiveClock();
    this.follow = new Follow();
    this.onChange = onChange;
    this.onState = onState;
    this.latest = null;
    this.latestT = null;
    this.match = null;
    this.session = new ScoredSession({
      ft, g, gv, app, clock, timing,
      check: wrap(check),
      paused: saysPaused,
      onChange: () => this.changed(),
      onState: (s, t, at) => this.heard(s, t, at),
      ...(newId ? { newId } : {}),
    });
    ft.live?.onMessage?.((data) => this.session.heard(data));
  }

  get phase() {
    return this.session.phase;
  }

  get seat() {
    return this.session.seat;
  }

  get notice() {
    return this.session.notice;
  }

  get result() {
    const found = this.session.result;
    return found ? { mine: found.mine?.g ?? null, theirs: found.theirs?.g ?? null } : null;
  }

  get status() {
    const { phase, notice, ready } = this.session;
    const away = phase === "left" || AWAY.includes(notice);
    return {
      phase,
      notice,
      here: !away && (phase === "lobby" || PLAYING.includes(phase)),
      calling: !away && phase === "waiting",
      away,
      update: notice === "update",
      ready: { ...ready },
    };
  }

  changed() {
    const { phase, id } = this.session;
    if (phase === "countdown" && id !== this.match) {
      this.match = id;
      this.clock.reset();
      this.follow.reset();
      this.latest = null;
      this.latestT = null;
    }
    this.onChange();
  }

  heard(s, t, at) {
    this.clock.heard(t, this.raceTime(at));
    this.clock.told(s.o);
    if (this.latestT !== null && t <= this.latestT) return;
    this.latest = s.g;
    this.latestT = t;
    this.follow.push(s.g, t, at);
    this.onState(s.g, t, at);
  }

  start() {
    this.session.start();
  }

  frame(now) {
    this.session.tick(now);
  }

  until(now) {
    return this.session.until(now);
  }

  raceTime(now) {
    return this.session.startAt === null ? 0 : Math.max(0, now - this.session.startAt);
  }

  wrapped(state) {
    const offset = this.clock.offset;
    return { g: state, o: offset === null ? null : Math.round(offset) };
  }

  send(t, state, now, { soon = false } = {}) {
    this.session.run(t, this.wrapped(state), now, { soon });
  }

  end(t, state) {
    this.session.end(t, this.wrapped(state));
  }

  // ms since moment t of the other phone's race
  age(t, now) {
    return this.clock.age(t, this.raceTime(now));
  }

  other(now) {
    return this.follow.at(now);
  }

  leave() {
    this.session.stop();
  }
}
