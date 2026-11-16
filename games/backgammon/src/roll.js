import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, commitText, legalMoves, revealText, seedText } from "./rules.js";

export const storeKey = (me, roll) => `backgammon/${me}/${roll}`;

const fresh = () => globalThis.crypto.getRandomValues(new Uint8Array(SEED_BYTES));

export function createRoller(ft, first) {
  let ctx = first;
  const local = { seed: null, lost: false, loaded: false, auto: null, told: "" };
  const key = () => storeKey(ctx.view?.me ?? "", `${ctx.view?.index ?? 0}/${ctx.state.rolls}`);

  const remember = async (seed) => {
    if (!ft?.store) return true;
    try {
      return (await ft.store.set(key(), toBase64url(seed))) !== false;
    } catch {
      return false;
    }
  };

  const tell = () => {
    const text = local.lost ? ctx.t("seedLost") : "";
    if (text && text !== local.told) ctx.notify?.(text);
    local.told = text;
  };

  const roll = async (state, me) => {
    const { commit, seed } = state.roll;
    if (state.next === me && commit === null) {
      local.seed = fresh();
      if (await remember(local.seed)) ctx.play(commitText(local.seed));
    } else if (state.next !== me && commit !== null && seed === null) {
      ctx.play(seedText(fresh()));
    } else if (state.next === me && seed !== null) {
      if (local.seed) ctx.play(revealText(local.seed));
      else {
        local.lost = true;
        tell();
      }
    }
  };

  const settle = async () => {
    const { state, mySide: me, canPlay } = ctx;
    if (!local.loaded || !canPlay || me === null || me === undefined || state.end) return;
    const stamp = `${ctx.view?.index}:${state.rolls}:${state.roll.commit}:${state.roll.seed}:${state.dice}:${state.left.length}`;
    if (local.auto === stamp) return;
    if (state.dice === null) {
      local.auto = stamp;
      await roll(state, me);
    } else if (!legalMoves(state).length) {
      local.auto = stamp;
      ctx.play("x");
    }
  };

  const recall = async () => {
    try {
      const kept = await ft?.store?.get?.(key());
      const seed = kept ? fromBase64url(kept) : null;
      if (seed && seed.length === SEED_BYTES) local.seed = seed;
    } catch {
      local.seed = null;
    }
    local.loaded = true;
    settle();
  };

  recall();
  return {
    update(next) {
      if (next.state.rolls !== ctx.state.rolls || next.view?.index !== ctx.view?.index) Object.assign(local, { seed: null, lost: false });
      ctx = next;
      tell();
      settle();
    },
  };
}
