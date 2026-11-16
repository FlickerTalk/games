import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, commitText, revealText, seedText } from "./rules.js";

export const storeKey = (me, round) => `eights/${me}/${round}`;

const freshSeed = () => globalThis.crypto.getRandomValues(new Uint8Array(SEED_BYTES));
const keyOf = (ctx) => storeKey(ctx.view?.me ?? "", ctx.view?.index ?? 0);

// the dealer's seed stays in the plugin's store until it is revealed, so closing the game loses nothing
export class Dealer {
  constructor(store, random = freshSeed) {
    Object.assign(this, { store, random, seed: null, loaded: false, lost: false, done: null });
  }

  async recall(key) {
    try {
      const kept = await this.store?.get?.(key);
      const seed = kept ? fromBase64url(kept) : null;
      if (seed && seed.length === SEED_BYTES) this.seed = seed;
    } catch {
      // nothing kept: a fresh seed when it is time to commit
    }
    this.loaded = true;
  }

  async remember(key, seed) {
    if (!this.store?.set) return true;
    try {
      return (await this.store.set(key, toBase64url(seed))) !== false;
    } catch {
      return false;
    }
  }

  newRound() {
    Object.assign(this, { seed: null, lost: false, done: null });
  }

  async settle(ctx) {
    const { state } = ctx;
    if (!this.loaded || !ctx.canPlay || ctx.mySide === null || ctx.mySide === undefined || state.phase !== "shuffle") return;
    const stamp = `${ctx.view?.index}:${state.commit}:${state.seedB}`;
    if (this.done === stamp) return;
    this.done = stamp;
    if (ctx.mySide === 0 && state.commit === null) {
      const seed = this.random();
      this.seed = seed;
      if (await this.remember(keyOf(ctx), seed)) ctx.play(commitText(seed));
    } else if (ctx.mySide === 1 && state.commit !== null && state.seedB === null) {
      ctx.play(seedText(this.random()));
    } else if (ctx.mySide === 0 && state.seedB !== null) {
      if (this.seed) ctx.play(revealText(this.seed));
      else this.lost = true;
    }
  }
}
