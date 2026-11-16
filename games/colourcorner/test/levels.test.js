import { describe, expect, it } from "vitest";
import { FREE_PAGES, PAGE_ORDER } from "../src/pages.js";
import { PROGRESS, finishPicture, openPages } from "../src/levels.js";

describe("the pages a player has", () => {
  it("are the first twelve from the start, the rest wrapped until it is their turn", () => {
    const fresh = PROGRESS.fresh();
    expect(openPages(fresh)).toEqual(PAGE_ORDER.slice(0, FREE_PAGES));
  });

  it("grow by one page, in the same order for everyone, after a few finished pictures, and never ask for anything else", () => {
    let record = PROGRESS.fresh();
    const gifts = [];
    for (let picture = 0; picture < 40; picture += 1) {
      const done = finishPicture(record);
      record = done.record;
      if (done.gift) gifts.push(done.gift);
    }
    expect(gifts).toEqual(PAGE_ORDER.slice(FREE_PAGES));
    expect(openPages(record)).toEqual(PAGE_ORDER);
    expect(Object.keys(record).sort()).toEqual(["best", "chosen", "level", "losses", "received", "v", "wins"]);
  });

  it("can be reached by colouring each page once", () => {
    let record = PROGRESS.fresh();
    const coloured = new Set();
    for (let step = 0; step < 100; step += 1) {
      const next = openPages(record).find((id) => !coloured.has(id));
      if (!next) break;
      coloured.add(next);
      record = finishPicture(record).record;
    }
    expect(openPages(record)).toEqual(PAGE_ORDER);
  });
});
