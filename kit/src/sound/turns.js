import { createSound } from "./sound.js";
import { mountSoundControls } from "./panel.js";

const CUES = { mine: "place", theirs: "pop", won: "win", lost: "lose-soft", draw: "star" };
const AFTER_MOVE = 0.2;

const movesOf = (view) => view.round?.moves.length ?? 0;

export function turnCues(before, after, chosen = {}) {
  if (!before) return [];
  const cues = { ...CUES, ...chosen };
  const [was, now] = [before.view, after.view];
  if (now.index !== was.index) return [];
  const heard = [];
  if (movesOf(now) > movesOf(was)) heard.push(was.myTurn ? cues.mine : cues.theirs);
  if (now.phase === "over" && was.phase !== "over") {
    const winner = now.result?.winner ?? null;
    heard.push(winner === null ? cues.draw : winner === now.me ? cues.won : cues.lost);
  }
  return heard.filter(Boolean);
}

function controlsFor(host, sound, lang) {
  const root = host.closest(".ftg");
  const bar = root?.querySelector('[data-part="bar"]');
  return bar ? mountSoundControls(sound, { bar, before: bar.querySelector('[data-part="actions"]'), layer: root, lang }) : null;
}

export function withSound(game, { tune = "calm", cues, ...spec } = {}, options) {
  const sound = createSound(spec, options);
  const board = {
    mount(host, first) {
      let last = first;
      const inner = game.board.mount(host, { ...first, sound });
      const panel = controlsFor(host, sound, first.lang);
      sound.music(tune);
      return {
        update(next) {
          turnCues(last, next, cues).forEach((name, at) => sound.play(name, { delay: at * AFTER_MOVE }));
          last = next;
          panel?.update(next.lang);
          inner?.update?.({ ...next, sound });
        },
        destroy() {
          sound.music(null);
          panel?.destroy();
          inner?.destroy?.();
        },
      };
    },
  };
  return { ...game, board, sound };
}
