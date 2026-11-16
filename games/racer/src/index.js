import { RacerElement } from './element.js';
import { appOpening } from './opening.js';

export function defineRacer() {
  if (!customElements.get('ft-racer')) customElements.define('ft-racer', RacerElement);
}

appOpening.listen(globalThis.ft);
defineRacer();
