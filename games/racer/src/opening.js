const CHAT = /^[A-Za-z0-9_-]{1,43}$/;
const NOTHING_SAID = { solo: false, chat: null, lang: null, live: false };

export function isChat(value) {
  return typeof value === 'string' && CHAT.test(value);
}

export function readOpening(said) {
  return {
    solo: said?.solo === true,
    chat: isChat(said?.chat) ? said.chat : null,
    lang: typeof said?.lang === 'string' ? said.lang : null,
    live: said?.live === true,
  };
}

export function playsTogether(opened) {
  return Boolean(opened?.live && opened.chat && !opened.solo);
}

export function createOpening() {
  let current = null;
  let listening = false;
  const waiting = [];
  return {
    get current() {
      return current;
    },
    listen(app) {
      if (typeof app?.onOpen !== 'function') return;
      listening = true;
      app.onOpen((said) => {
        current = readOpening(said);
        waiting.splice(0).forEach((resolve) => resolve(current));
      });
    },
    whenOpened({ waitMs = 1500 } = {}) {
      if (current || !listening) return Promise.resolve(current ?? { ...NOTHING_SAID });
      return new Promise((resolve) => {
        waiting.push(resolve);
        setTimeout(() => resolve(current ?? { ...NOTHING_SAID }), waitMs);
      });
    },
  };
}

export const appOpening = createOpening();
