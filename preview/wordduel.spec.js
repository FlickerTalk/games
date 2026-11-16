import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-wordduel-shots";

const labels = (s, grid) => s.evaluate((name) => [...document.querySelectorAll(`.ftg-board button[data-grid="${name}"][data-row]`)].map((one) => one.getAttribute("aria-label")), grid);

async function typeAndSend(s, name, word, act) {
  await s.waitTurn();
  const field = s.frame.locator(`[name="${name}"]:not([disabled])`);
  if (!(await field.count())) return false;
  await field.fill(word);
  await s.tap(`[data-act="${act}"]`);
  return true;
}

await walkBoardGame({
  game: "wordduel",
  out: OUT,
  minBoard: 300,
  steps: async (s, { check, label }) => {
    await s.waitTurn();
    await s.shot("1-secret");
    await s.frame.locator('[name="secret"]').fill("cra");
    await s.page.waitForTimeout(300);
    await s.shot("2-typing");
    await check(`${label}: the letters typed show on the board`, async () => assert.deepEqual(await labels(s, "secret"), ["C: not answered yet", "R: not answered yet", "A: not answered yet"]));
    await typeAndSend(s, "secret", "crane", "commit");
    await s.page.waitForTimeout(900);
    await s.shot("3-set");
    let made = 0;
    for (const word of ["stare", "pluck"]) made += (await typeAndSend(s, "guess", word, "guess")) ? 1 : 0;
    await s.waitTurn();
    await s.page.waitForTimeout(900);
    await check(`${label}: both sides' guesses show with their answers`, async () => {
      assert.equal((await labels(s, "mine")).length, made * 5);
      assert.ok(made > 0 && (await labels(s, "theirs")).length >= 5);
    });
    const field = s.frame.locator('[name="guess"]:not([disabled])');
    if (await field.count()) await field.fill("ab");
    await s.page.waitForTimeout(300);
    await s.shot("4-guessing");
  },
});
