import assert from "node:assert/strict";
import { walkBoardGame } from "./board-walk.js";

const OUT = "/private/tmp/ftgames-seabattle-shots";
const NEAR_MIDDLE = [44, 45, 55, 54, 33, 66, 23, 76, 47, 52];
const cell = (key) => `.ftg-board button[data-cell="${key}"]`;
const CONFIRM = ".ftg-board button[data-ghost]";
const READY = '.ftg-board button[data-act="ready"]';
const SHUFFLE = '.ftg-board button[data-act="shuffle"]';

const table = (s) => s.evaluate(() => {
  const { state, mySide, myTurn } = document.querySelector("#view").table.view;
  return { phase: state.phase, shots: mySide === null ? [] : state.shots[mySide], myTurn };
});
const fleet = (s) => s.evaluate(() => [...document.querySelectorAll(".ftg-board button[data-own]")].filter((one) => (one.dataset.mark ?? "").split(" ").includes("ship")).map((one) => Number(one.dataset.own)));

async function toPlacing(s) {
  for (let tries = 0; tries < 30; tries += 1) {
    const { phase, myTurn } = await table(s);
    if (phase !== "place" || myTurn) return;
    await s.page.waitForTimeout(200);
  }
}

async function toFiring(s) {
  for (let tries = 0; tries < 40; tries += 1) {
    const { phase, myTurn } = await table(s);
    if (phase === "fire" && myTurn) return;
    if (phase === "place" && myTurn) await s.tap(READY);
    else await s.page.waitForTimeout(200);
  }
}

async function freeNearMiddle(s) {
  const { shots } = await table(s);
  return NEAR_MIDDLE.find((one) => !shots.includes(one)) ?? [...Array(100).keys()].find((one) => !shots.includes(one));
}

async function fireOne(s) {
  await toFiring(s);
  if (!(await s.myTurn())) return;
  await s.tap(cell(await freeNearMiddle(s)));
  await s.tap(CONFIRM);
}

await walkBoardGame({
  game: "seabattle",
  out: OUT,
  minBoard: 320,
  steps: async (s, { check, label }) => {
    await toPlacing(s);
    await s.page.waitForTimeout(500);
    await s.shot("1-placing");
    const placed = await fleet(s);
    await check(`${label}: the user's fleet is on its sea, seventeen cells of boats`, async () => assert.equal(placed.length, 17));
    await s.tap(SHUFFLE);
    await check(`${label}: shuffle moves the fleet`, async () => assert.notDeepEqual(await fleet(s), placed));
    await toFiring(s);
    await s.page.waitForTimeout(500);
    await s.shot("2-firing");
    const chosen = await freeNearMiddle(s);
    await s.tap(cell(chosen));
    await s.shot("3-aimed");
    await check(`${label}: a first tap aims at the cell and offers to confirm it`, async () => {
      assert.equal(await s.evaluate(() => document.querySelector(".ftg-board button[data-ghost]")?.dataset.ghost), String(chosen));
    });
    await s.tap(CONFIRM);
    await check(`${label}: the second tap fires`, async () => assert.ok((await table(s)).shots.includes(chosen)));
    for (let shot = 0; shot < 4; shot += 1) await fireOne(s);
    await s.page.waitForTimeout(900);
    await s.shot("4-played");
  },
});
