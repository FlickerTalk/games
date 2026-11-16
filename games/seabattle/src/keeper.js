import { fromBase64url, toBase64url } from "./sha256.js";
import { DEFAULT_FLEET, SALT_BYTES, commitText, fleetText, honestAnswer, parseFleet, randomFleet, revealText, sortShips } from "./rules.js";

export const storeKey = (me) => `seabattle/${me}`;

export class Fleet {
  constructor(store) {
    this.store = store;
    this.ships = DEFAULT_FLEET.map((ship) => ({ ...ship }));
    this.salt = null;
    this.loaded = false;
  }

  async recall(key) {
    try {
      const kept = await this.store?.get?.(key);
      if (kept) {
        const read = JSON.parse(kept);
        const salt = fromBase64url(read.salt);
        const ships = parseFleet(read.fleet);
        if (salt && salt.length === SALT_BYTES && ships) Object.assign(this, { salt, ships });
      }
    } catch {
      // nothing kept for this match, so the fleet starts where it always does
    }
    this.loaded = true;
  }

  async remember(key) {
    if (!this.store?.set) return true;
    try {
      return (await this.store.set(key, JSON.stringify({ salt: toBase64url(this.salt), fleet: fleetText(this.ships) }))) !== false;
    } catch {
      return false;
    }
  }

  shuffle(random = Math.random) {
    this.ships = randomFleet(random);
  }

  async ready(key, salt) {
    this.salt = salt;
    this.ships = sortShips(this.ships);
    return (await this.remember(key)) ? commitText(this.salt, this.ships) : null;
  }

  answer(state, side) {
    return honestAnswer(state, side, this.ships);
  }

  reveal() {
    return revealText(this.salt, this.ships);
  }
}
