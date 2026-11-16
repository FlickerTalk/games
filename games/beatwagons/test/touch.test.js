import { describe, expect, it } from "vitest";
import { openGaps } from "../src/puzzle.js";
import { makeGame, rightIndex, tap, targetOf, until, wrongIndex } from "./harness.js";

async function solving() {
  const made = await makeGame({ seed: 23 });
  await tap(made.game, targetOf(made.game, "play"));
  await until(made, (state) => state.round.phase === "solve");
  return made;
}

const centre = (area) => ({ x: area.x + area.w / 2, y: area.y + area.h / 2 });

function drag(game, from, to) {
  game.pointer({ type: "down", ...from, id: 1 });
  game.pointer({ type: "move", x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, id: 1 });
  game.pointer({ type: "move", ...to, id: 1 });
}

describe("dragging a wagon", () => {
  it("carries it under the finger and couples it where it is let go over the train", async () => {
    const made = await solving();
    const { game } = made;
    const { round, layout } = game.state;
    const gap = openGaps(round.puzzle)[0];
    const cell = targetOf(game, "candidate", rightIndex(round));
    const over = { x: layout.train.xs[gap], y: layout.train.y };
    drag(game, centre(cell), over);
    expect(game.state.drag).toMatchObject({ index: cell.value, moved: true, x: over.x, y: over.y });
    game.pointer({ type: "up", ...over, id: 1 });
    expect(game.state.drag).toBeNull();
    expect(game.state.round.flying).toMatchObject({ gap, from: over });
    await until(made, (state) => state.round.phase === "tune");
    expect(openGaps(game.state.round.puzzle)).toEqual([]);
  });

  it("puts the wagon back without a sound when it is let go away from the train", async () => {
    const made = await solving();
    const { game, sound } = made;
    const cell = targetOf(game, "candidate", wrongIndex(game.state.round));
    sound.play.mockClear();
    drag(game, centre(cell), { x: cell.x + 30, y: cell.y + cell.h / 2 + 20 });
    game.pointer({ type: "up", x: cell.x + 30, y: cell.y + cell.h / 2 + 20, id: 1 });
    expect(game.state.round.flying).toBeNull();
    expect(game.state.round.wrongs).toBe(0);
    expect(sound.play).not.toHaveBeenCalled();
  });

  it("forgets the wagon when the touch is cancelled, and ignores another finger meanwhile", async () => {
    const made = await solving();
    const { game } = made;
    const cell = targetOf(game, "candidate", 0);
    game.pointer({ type: "down", ...centre(cell), id: 1 });
    game.pointer({ type: "move", x: 10, y: 10, id: 2 });
    expect(game.state.drag.moved).toBe(false);
    game.pointer({ type: "cancel", ...centre(cell), id: 1 });
    expect(game.state.drag).toBeNull();
    expect(game.state.round.flying).toBeNull();
  });

  it("does not start while the train is still rolling in or while Flick is the one completing it", async () => {
    const made = await makeGame();
    const { game } = made;
    await tap(game, targetOf(game, "play"));
    game.pointer({ type: "down", ...centre(targetOf(game, "candidate", 0)), id: 1 });
    expect(game.state.drag).toBeNull();
  });
});
