import { fromBase64url, toBase64url } from "./sha256.js";
import { SEED_BYTES, commitText, langFor, revealText, seedText } from "./rules.js";

export const storeKey = (me, round) => `wordgrid/${me}/${round}`;

const fresh = (length) => crypto.getRandomValues(new Uint8Array(length));

export class Seeds {
  constructor(store, random = fresh) {
    Object.assign(this, { store, random, seed: null, lost: false, loaded: false, stamp: null });
  }

  async recall(key) {
    try {
      const kept = await this.store?.get?.(key);
      const seed = kept ? fromBase64url(kept) : null;
      if (seed && seed.length === SEED_BYTES) this.seed = seed;
    } catch {
      this.seed = null;
    }
    this.loaded = true;
  }

  async remember(key, seed) {
    if (!this.store) return true;
    try {
      return (await this.store.set(key, toBase64url(seed))) !== false;
    } catch {
      return false;
    }
  }

  forget() {
    Object.assign(this, { seed: null, lost: false, stamp: null });
  }

  // the seed must be in the store before its commitment is played, or the round could never be revealed
  async settle(ctx, key) {
    const { state, mySide } = ctx;
    if (!this.loaded || !ctx.canPlay || mySide === null || mySide === undefined || state.phase !== "shuffle") return;
    const stamp = `${ctx.view?.index}:${state.commit}:${state.seedB}`;
    if (this.stamp === stamp) return;
    this.stamp = stamp;
    if (mySide === 0 && state.commit === null) {
      this.seed = this.random(SEED_BYTES);
      if (await this.remember(key, this.seed)) ctx.play(commitText(langFor(ctx.lang), this.seed));
    } else if (mySide === 1 && state.commit !== null && state.seedB === null) {
      ctx.play(seedText(this.random(SEED_BYTES)));
    } else if (mySide === 0 && state.seedB !== null) {
      if (this.seed) ctx.play(revealText(this.seed));
      else this.lost = true;
    }
  }
}
