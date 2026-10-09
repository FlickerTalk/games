// What the app lends every plugin frame since app 1.6.0: Ionic's custom elements, registered
// before the game's module runs, from the @ionic/core the app pins. The tests lend the same
// components from the same version, a development dependency: no package bundles Ionic (each
// game's package test checks its dist/). A test that runs outside a DOM gets nothing.

import { initialize } from "@ionic/core/components";
import { defineCustomElement as alert } from "@ionic/core/components/ion-alert.js";
import { defineCustomElement as button } from "@ionic/core/components/ion-button.js";
import { defineCustomElement as buttons } from "@ionic/core/components/ion-buttons.js";
import { defineCustomElement as content } from "@ionic/core/components/ion-content.js";
import { defineCustomElement as header } from "@ionic/core/components/ion-header.js";
import { defineCustomElement as title } from "@ionic/core/components/ion-title.js";
import { defineCustomElement as toolbar } from "@ionic/core/components/ion-toolbar.js";

/** The components the kit draws with: all of them must be among those the app lends. */
export const LENT = ["ion-alert", "ion-button", "ion-buttons", "ion-content", "ion-header", "ion-title", "ion-toolbar"];

if (globalThis.customElements && globalThis.document) {
  initialize();
  for (const define of [alert, button, buttons, content, header, title, toolbar]) define();
}
