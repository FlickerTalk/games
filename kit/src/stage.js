// CSS px the app's room takes on a phone (bars, chat header, composer), measured on a Samsung S20+
export const ROOM_CHROME = 297;

export const MAX_BOARD = 720;

export const SMALLEST = 120;

const SIDE = 340;

const page = () => document.documentElement;

const filling = () => page().hasAttribute("data-fill");

const height = (node) => node.getBoundingClientRect().height;

// in the room the frame is as tall as the game, so its own height would only chase the board
function roomFor(root) {
  if (!filling()) return (globalThis.screen?.height || 853) - ROOM_CHROME;
  return page().clientHeight - (root.getBoundingClientRect().top + scrollY);
}

function besideIn() {
  if (!filling()) return Boolean(globalThis.matchMedia?.("(min-width: 720px)").matches);
  const { clientWidth: width, clientHeight: tall } = page();
  return width > tall && width - SIDE >= SMALLEST;
}

export function fitStage(root, least) {
  const part = (name) => root.querySelector(`[data-part="${name}"]`);
  const fill = filling();
  const beside = besideIn();
  const room = roomFor(root);
  const board = (px) => root.style.setProperty("--ftg-board", `${px}px`);
  root.toggleAttribute("data-beside", beside);
  root.removeAttribute("data-compact");
  if (beside && !fill) {
    board(Math.max(240, room - 72 - height(part("notice"))));
    return;
  }
  const [main, stage, content] = [part("main"), part("stage"), part("content")];
  const width = beside ? main.clientWidth - SIDE : main.clientWidth;
  const most = fill ? Math.min(width, MAX_BOARD) : width;
  const left = () => room - (height(root) - height(content)) - (beside ? 0 : height(main) - height(stage));
  board(most);
  if (!beside && left() < Math.min(least, most)) root.setAttribute("data-compact", "");
  board(Math.floor(Math.max(Math.min(most, left()), Math.min(fill ? SMALLEST : least, most))));
}

export function watchStage(changed) {
  const watch = new MutationObserver(changed);
  watch.observe(page(), { attributes: true, attributeFilter: ["data-fill"] });
  addEventListener("resize", changed);
  return () => {
    watch.disconnect();
    removeEventListener("resize", changed);
  };
}
