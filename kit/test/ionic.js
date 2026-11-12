import { initialize } from "@ionic/core/components";
import { defineCustomElement as alert } from "@ionic/core/components/ion-alert.js";
import { defineCustomElement as button } from "@ionic/core/components/ion-button.js";
import { defineCustomElement as buttons } from "@ionic/core/components/ion-buttons.js";
import { defineCustomElement as content } from "@ionic/core/components/ion-content.js";
import { defineCustomElement as header } from "@ionic/core/components/ion-header.js";
import { defineCustomElement as title } from "@ionic/core/components/ion-title.js";
import { defineCustomElement as toolbar } from "@ionic/core/components/ion-toolbar.js";

export const LENT = ["ion-alert", "ion-button", "ion-buttons", "ion-content", "ion-header", "ion-title", "ion-toolbar"];

if (globalThis.customElements && globalThis.document) {
  initialize();
  for (const define of [alert, button, buttons, content, header, title, toolbar]) define();
}
