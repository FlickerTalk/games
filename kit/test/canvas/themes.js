const SUCCESS = "#2dd55b";

function host(page, text, muted, surface, border, accent, onAccent, danger) {
  return {
    "--ion-background-color": page,
    "--ion-text-color": text,
    "--ion-color-medium": muted,
    "--ion-item-background": surface,
    "--ion-border-color": border,
    "--ion-color-primary": accent,
    "--ion-color-primary-contrast": onAccent,
    "--ion-color-success": SUCCESS,
    "--ion-color-danger": danger,
  };
}

export const APP_THEMES = Object.freeze({
  "mono-light": host("#ffffff", "#0a0a0a", "#6e6e6e", "#ffffff", "rgba(0, 0, 0, 0.10)", "#000000", "#ffffff", "#d80015"),
  "mono-dark": host("#000000", "#f5f5f5", "#8e8e8e", "#0e0e0e", "rgba(255, 255, 255, 0.12)", "#ffffff", "#000000", "#ff4d5e"),
  "ember-light": host("#fbf8f5", "#1c1714", "#7d726a", "#ffffff", "rgba(40, 20, 5, 0.08)", "#9e4c10", "#ffffff", "#d80015"),
  "ember-dark": host("#0d0b0a", "#f6efe8", "#9b8f86", "#161311", "rgba(255, 240, 225, 0.07)", "#ffa24c", "#1b0f06", "#ff4d5e"),
  "aurora-light": host("#f6f8fb", "#121821", "#66758a", "#ffffff", "rgba(10, 25, 45, 0.08)", "#0a6f66", "#ffffff", "#d80015"),
  "aurora-dark": host("#0a0e14", "#eaf1fa", "#8a97a8", "#111722", "rgba(200, 225, 255, 0.07)", "#3ddbc4", "#04141a", "#ff4d5e"),
  "lime-light": host("#ffffff", "#0a0a0b", "#6e6e73", "#ffffff", "rgba(0, 0, 0, 0.08)", "#516806", "#ffffff", "#d80015"),
  "lime-dark": host("#000000", "#f5f5f7", "#8e8e93", "#0e0e0f", "rgba(255, 255, 255, 0.08)", "#c6f432", "#0b0f00", "#ff4d5e"),
});

export function setHostTheme(root, name) {
  for (const property of Object.keys(APP_THEMES["mono-dark"])) root.style.removeProperty(property);
  for (const [property, value] of Object.entries(APP_THEMES[name] ?? {})) root.style.setProperty(property, value);
  root.toggleAttribute("data-dark", Boolean(name?.endsWith("-dark")));
}
