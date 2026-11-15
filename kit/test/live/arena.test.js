import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRAME_START } from "../../src/live/page.js";
import { defineLiveGame } from "../../src/live/index.js";
import { LIVE_TIMING } from "../../src/live/session.js";
import { fakeCore, phones, words } from "../helpers.js";

const built = { mounts: 0, resets: [], frames: [], sizes: [], destroyed: 0, finishAt: 5000, rival: 6000, ctx: null, heard: [] };

const toy = {
  id: "toyrace",
  gv: 1,
  tag: "ft-toyrace",
  app: "1.0.0",
  aspect: 1.2,
  check: (state) => (state && Number.isFinite(state.d) ? { d: state.d } : null),
  texts: {
    en: { name: "Toy Race", soloIntro: "Race your phone.", liveIntro: "Race them.", lap: "Lap one" },
    es: { name: "Carrerita", soloIntro: "Contra tu teléfono.", liveIntro: "Contra la otra persona.", lap: "Vuelta uno" },
    ar: { name: "سباق", soloIntro: "سابق هاتفك.", liveIntro: "سابقهم.", lap: "اللفة" },
  },
  stage: {
    mount({ view, left, right }, ctx) {
      built.mounts += 1;
      built.ctx = ctx;
      view.innerHTML = "<canvas></canvas>";
      left.innerHTML = '<button data-pad="left">left</button>';
      right.innerHTML = '<button data-pad="gas">gas</button>';
      return {
        reset: (seat) => built.resets.push(seat),
        resize: (width, height) => built.sizes.push([width, height]),
        status: () => ctx.t("lap"),
        frame(now) {
          built.frames.push(now);
          const session = ctx.session;
          if (session.phase !== "running") return;
          const t = now - session.startAt;
          const finish = built.finishAt + session.seat * 200;
          if (ctx.solo) session.rival(Math.min(t, built.rival), t >= built.rival ? built.rival : null);
          if (t >= finish) session.finish(finish);
          else session.run(t, { d: t }, now);
        },
        heard: (state, t) => built.heard.push([state, t]),
        destroy: () => (built.destroyed += 1),
      };
    },
  },
};

defineLiveGame(toy);

const clock = { now: 10_000 };
const screen = { width: 352, height: Infinity };
const text = (element) => words(element).replace(/\s+/g, " ");

async function settle() {
  for (let round = 0; round < 6; round += 1) await vi.advanceTimersByTimeAsync(1);
}

async function phone(core, opening = {}) {
  const element = document.createElement("ft-toyrace");
  element.ft = core.ft;
  element.clock = () => clock.now;
  element.measure = () => ({ ...screen });
  document.body.append(element);
  await core.open({ live: false, solo: true, ...opening });
  await settle();
  return element;
}

async function press(element, selector) {
  element.querySelector(selector).click();
  await settle();
}

function run(element, until, every = 16) {
  for (; clock.now <= until; clock.now += every) element.frame(clock.now);
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  clock.now = 10_000;
  Object.assign(screen, { width: 352, height: Infinity });
  Object.assign(built, { mounts: 0, resets: [], frames: [], sizes: [], destroyed: 0, finishAt: 5000, rival: 6000, ctx: null, heard: [] });
});
afterEach(() => vi.useRealTimers());

describe("a real-time game against the phone", () => {
  it("draws nothing before the app says the language, and keeps the frame at the height it opened with", async () => {
    const core = fakeCore();
    const element = document.createElement("ft-toyrace");
    element.ft = core.ft;
    document.body.append(element);
    await settle();
    expect(text(element).trim()).toBe("");
    expect(element.querySelector(".ftg").style.minHeight).toBe(`${FRAME_START}px`);
    expect(built.mounts).toBe(0);
  });

  it("opens on the track with a way to start, in the user's language, and says nothing to anyone", async () => {
    const core = fakeCore();
    const element = await phone(core, { lang: "es" });
    expect(text(element)).toContain("Carrerita");
    expect(text(element)).toContain("Contra tu teléfono.");
    expect(element.querySelector('[data-live="start"]')).not.toBeNull();
    expect(text(element)).toContain("Empezar");
    expect(built.mounts).toBe(1);
    expect(built.sizes.at(-1)).toEqual([352, 293]);
    expect(element.querySelector(".ftl").getAttribute("data-layout")).toBe("column");
    expect(element.querySelector(".ftl").hasAttribute("data-off")).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("counts down from the user's start, races, and shows who won with both times, without a word on the live channel", async () => {
    const core = fakeCore();
    const element = await phone(core);
    await press(element, '[data-live="start"]');
    expect(built.resets).toEqual([0]);
    expect(element.querySelector('[data-live="start"]')).toBeNull();
    expect(text(element)).toContain("Get ready…");
    run(element, 10_000 + LIVE_TIMING.countdown + 100);
    await settle();
    expect(built.ctx.session.phase).toBe("running");
    expect(element.querySelector(".ftl").hasAttribute("data-off")).toBe(false);
    expect(text(element)).toContain("Lap one");
    run(element, 10_000 + LIVE_TIMING.countdown + 5100);
    await settle();
    expect(built.ctx.session.phase).toBe("over");
    expect(text(element)).toContain("You won");
    expect(text(element)).toContain("0:05.0");
    expect(element.querySelector('[data-live="again"]')).not.toBeNull();
    expect(core.ft.live.send).not.toHaveBeenCalled();
  });

  it("keeps the best time and the tally of this conversation, and shows them the next time", async () => {
    const core = fakeCore();
    const element = await phone(core);
    await press(element, '[data-live="start"]');
    run(element, 10_000 + LIVE_TIMING.countdown + 5100);
    await settle();
    expect(JSON.parse(core.records.get(`best/${core.chat}`))).toEqual({ v: 1, best: 5000, won: 1, lost: 0 });
    built.finishAt = 7000;
    await press(element, '[data-live="again"]');
    expect(built.resets).toEqual([0, 0]);
    run(element, clock.now + LIVE_TIMING.countdown + 7100);
    await settle();
    expect(text(element)).toContain("You lost");
    expect(text(element)).toContain("Your phone");
    expect(text(element)).toContain("0:06.0");
    expect(JSON.parse(core.records.get(`best/${core.chat}`))).toEqual({ v: 1, best: 5000, won: 1, lost: 1 });
    document.body.innerHTML = "";
    const again = await phone(fakeCore({ records: core.records }));
    expect(text(again)).toContain("Best: 0:05.0");
  });

  it("ignores a kept record it cannot read", async () => {
    const core = fakeCore();
    core.records.set(`best/${core.chat}`, '{"v":9,"best":"soon"}');
    const element = await phone(core);
    expect(text(element)).not.toContain("Best");
    await press(element, '[data-live="start"]');
    run(element, 10_000 + LIVE_TIMING.countdown + 5100);
    await settle();
    expect(JSON.parse(core.records.get(`best/${core.chat}`))).toEqual({ v: 1, best: 5000, won: 1, lost: 0 });
  });

  it("asks to be opened from a conversation when it has none, and offers nothing to start", async () => {
    const core = fakeCore();
    const element = await phone(core, { chat: undefined });
    expect(text(element)).toContain("Open “Toy Race” from a conversation to play.");
    expect(element.querySelector('[data-live="start"]')).toBeNull();
  });

  it("reads right to left in Arabic, but never mirrors the track or the controls", async () => {
    const element = await phone(fakeCore(), { lang: "ar" });
    expect(element.querySelector(".ftg").getAttribute("dir")).toBe("rtl");
    expect(element.querySelector(".ftl-main").getAttribute("dir")).toBe("ltr");
    expect(element.querySelector(".ftg-card").getAttribute("dir")).toBe("rtl");
  });

  it("follows its own size into full screen and back in the middle of a race, without starting it again", async () => {
    const element = await phone(fakeCore());
    await press(element, '[data-live="start"]');
    run(element, 10_000 + LIVE_TIMING.countdown + 1000);
    Object.assign(screen, { width: 1280, height: 644 });
    element.fit();
    expect(built.sizes.at(-1)).toEqual([772, 644]);
    expect(element.querySelector(".ftl").getAttribute("data-layout")).toBe("row");
    expect(element.querySelector(".ftl").style.getPropertyValue("--ftl-w")).toBe("772px");
    Object.assign(screen, { width: 352, height: Infinity });
    element.fit();
    expect(built.sizes.at(-1)).toEqual([352, 293]);
    expect(element.querySelector(".ftl").getAttribute("data-layout")).toBe("column");
    expect(built.resets).toEqual([0]);
    expect(built.ctx.session.phase).toBe("running");
  });

  it("measures its own element: the width it has and, full screen, the height left under the bar", async () => {
    const element = await phone(fakeCore());
    delete element.measure;
    const root = element.querySelector(".ftl");
    Object.defineProperty(root, "clientWidth", { value: 1280, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 748, configurable: true });
    root.querySelector(":scope > ion-header").getBoundingClientRect = () => ({ height: 104 });
    root.style.rowGap = "12px";
    root.style.paddingBottom = "4px";
    expect(element.measure()).toEqual({ width: 1280, height: Infinity });
    document.documentElement.setAttribute("data-fill", "");
    try {
      expect(element.measure()).toEqual({ width: 1280, height: 628 });
      element.fit();
      expect(root.getAttribute("data-layout")).toBe("row");
      expect(built.sizes.at(-1)).toEqual([753, 628]);
    } finally {
      document.documentElement.removeAttribute("data-fill");
    }
  });

  it("full screen, takes the frame's height and gives the view what is left, controls under it or on both sides", () => {
    const css = readFileSync(join(import.meta.dirname, "..", "..", "src", "live", "arena.css"), "utf8").replace(/\s+/g, " ");
    expect(css).toMatch(/:root\[data-fill\] \[data-ftl\], :root\[data-fill\] \.ftl \{ height: 100%; \}/);
    expect(css).toMatch(/:root\[data-fill\] \.ftl > ion-content \{ flex: 1 1 auto; min-height: 0; \}/);
    expect(css).toMatch(/\.ftl-main \{[^}]*grid-template-areas: "stage stage" "left right";/);
    expect(css).toMatch(/\.ftl\[data-layout="row"\] \.ftl-main \{[^}]*grid-template-areas: "left stage right";/);
  });

  it("lets go of the track when it leaves the page", async () => {
    const element = await phone(fakeCore());
    element.remove();
    expect(built.destroyed).toBe(1);
  });
});

describe("a real-time game between two phones", () => {
  async function pair() {
    const { a, b } = phones();
    const one = await phone(a, { live: true, solo: false });
    const two = await phone(b, { live: true, solo: false });
    return { a, b, one, two };
  }

  const both = async (world, until) => {
    for (; clock.now <= until; clock.now += 16) {
      world.one.frame(clock.now);
      world.two.frame(clock.now);
      await vi.advanceTimersByTimeAsync(1);
    }
  };

  it("says nothing when opened, and the other phone offers to join when the user starts", async () => {
    const world = await pair();
    expect(world.a.sent).toEqual([]);
    expect(world.b.sent).toEqual([]);
    expect(text(world.one)).toContain("Race them.");
    world.one.querySelector('[data-live="start"]').click();
    expect(text(world.one)).toContain("Waiting for the other person to open “Toy Race” in this conversation…");
    expect(world.a.sent).toHaveLength(1);
    await settle();
    expect(text(world.two)).toContain("The other person is ready. Tap Start.");
    expect(text(world.one)).toContain("The other person is here. Waiting for them to tap Start…");
    expect(world.one.querySelector('[data-live="start"]')).toBeNull();
  });

  it("races once both have started, hands the other phone's state to the game, and both show the same winner", async () => {
    const world = await pair();
    await press(world.one, '[data-live="start"]');
    await settle();
    await press(world.two, '[data-live="start"]');
    await settle();
    expect(text(world.one)).toContain("Get ready…");
    expect(text(world.two)).toContain("Get ready…");
    await both(world, clock.now + LIVE_TIMING.countdown + 6000);
    await settle();
    expect(built.heard.length).toBeGreaterThan(20);
    const seats = [world.one, world.two].map((element) => element.session.seat);
    const [first, second] = seats[0] === 0 ? [world.one, world.two] : [world.two, world.one];
    expect(text(first)).toContain("You won");
    expect(text(second)).toContain("You lost");
    expect(text(second)).toContain("Opponent");
    expect(text(second)).toContain("0:05.0");
  });

  it("stops at the first message the core refuses, says so, and offers to try again", async () => {
    const world = await pair();
    await press(world.one, '[data-live="start"]');
    await settle();
    await press(world.two, '[data-live="start"]');
    await settle();
    await both(world, clock.now + LIVE_TIMING.countdown + 500);
    world.a.reachable = false;
    await both(world, clock.now + 300);
    await settle();
    expect(text(world.one)).toContain("The other phone cannot be reached right now.");
    expect(world.one.querySelector('[data-live="retry"]')).not.toBeNull();
    const sent = world.a.sent.length;
    await both(world, clock.now + 2000);
    expect(world.a.sent.length).toBe(sent);
  });

  it("tells the other phone it is leaving when the app closes it in a race", async () => {
    const closing = [];
    const world = phones();
    world.a.ft.onClose = (handler) => closing.push(handler);
    const one = await phone(world.a, { live: true, solo: false });
    const two = await phone(world.b, { live: true, solo: false });
    await press(one, '[data-live="start"]');
    await settle();
    await press(two, '[data-live="start"]');
    await settle();
    closing.forEach((handler) => handler());
    await settle();
    expect(text(two)).toContain("The other person left.");
  });
});

describe("defineLiveGame", () => {
  it("refuses a game without its name, its version, its stage or its check of what arrives", () => {
    for (const field of ["id", "gv", "tag", "app", "aspect", "check", "stage", "texts"]) {
      const broken = { ...toy, tag: `ft-broken-${field.toLowerCase()}` };
      delete broken[field];
      expect(() => defineLiveGame(broken), field).toThrow(field);
    }
    expect(() => defineLiveGame({ ...toy, tag: "ft-broken-mount", stage: {} })).toThrow("mount");
  });
});
