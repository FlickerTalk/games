import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeCore, phones, settle } from "../../../kit/test/helpers.js";
import { Duo } from "../src/duo.js";
import { required } from "../src/geometry.js";
import { pageOf } from "../src/pages.js";

async function open(core, opening = { live: true }, onChange = () => {}) {
  const duo = new Duo({ ft: core.ft, opening: { chat: core.chat, lang: "en", ...opening }, app: "1.0.0", onChange, timing: { think: 20 } });
  await duo.ready();
  return duo;
}

const both = (...duos) => settle(duos.map((duo) => duo.table), 20);

function blankZone(duo) {
  const { state } = duo.status;
  return required(pageOf(state.page)).find((zone) => state.fills[zone] === undefined);
}

afterEach(() => vi.useRealTimers());

describe("two phones colouring one page", () => {
  it("says nothing when the game opens", async () => {
    const core = fakeCore();
    const duo = await open(core);
    expect(core.sent).toEqual([]);
    expect(duo.status).toMatchObject({ phase: "none", here: false, myTurn: false });
  });

  it("lets the side the coin chose pick the page, then both paint it in turns until it is full", async () => {
    vi.useFakeTimers();
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    await one.start();
    await both(one, two);
    expect(two.status.here).toBe(true);
    expect(one.status.phase).toBe("play");
    const [chooser, other] = one.status.myTurn ? [one, two] : [two, one];
    await chooser.choose("cat");
    await both(one, two);
    expect(other.status.state.page).toBe("cat");
    expect(other.status.myTurn).toBe(true);
    let turns = 0;
    while (one.status.phase === "play" && turns < 60) {
      const painter = one.status.myTurn ? one : two;
      await painter.fill(blankZone(painter), "3");
      await both(one, two);
      turns += 1;
    }
    expect(one.status.phase).toBe("over");
    expect(two.status.state.fills).toEqual(one.status.state.fills);
    await one.again();
    await both(one, two);
    expect(two.status.phase).toBe("play");
    expect(two.status.state.page).toBeNull();
  });

  it("refuses a turn that is not the player's", async () => {
    vi.useFakeTimers();
    const { a, b } = phones();
    const one = await open(a);
    const two = await open(b);
    await one.start();
    await both(one, two);
    const waiting = one.status.myTurn ? two : one;
    await waiting.choose("cat");
    expect(waiting.status.state.page).toBeNull();
  });
});

describe("colouring with Flick", () => {
  it("plays a whole page on this phone, Flick taking its turns, and never touches the live channel", async () => {
    const core = fakeCore();
    let changed = 0;
    const duo = await open(core, { solo: true, live: false }, () => (changed += 1));
    await duo.start();
    const until = async (done) => {
      for (let wait = 0; wait < 400 && !done(); wait += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    };
    await until(() => duo.status.myTurn || duo.status.state.page);
    if (duo.status.state.page === null) await duo.choose("flower");
    for (let turns = 0; turns < 80 && duo.status.phase === "play"; turns += 1) {
      await until(() => duo.status.myTurn || duo.status.phase !== "play");
      if (duo.status.phase !== "play") break;
      await duo.fill(blankZone(duo), "4");
    }
    expect(duo.status.phase).toBe("over");
    expect(Object.values(duo.status.state.fills).some((paint) => paint !== "4")).toBe(true);
    expect(core.ft.live.send).not.toHaveBeenCalled();
    expect(changed).toBeGreaterThan(5);
  }, 60_000);
});
