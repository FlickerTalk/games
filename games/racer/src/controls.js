const LEFT_KEYS = ['ArrowLeft', 'a', 'A'];
const RIGHT_KEYS = ['ArrowRight', 'd', 'D'];
const GAS_KEYS = ['ArrowUp', ' '];
const GAME_KEYS = new Set([...LEFT_KEYS, ...RIGHT_KEYS, ...GAS_KEYS]);

export function createControls({ eventTarget, surface, carX, clampX, toRoadUnits }) {
  const keys = new Set();
  const finger = { id: null, anchorX: 0, lastX: 0, dragged: 0, x: null, y: null };
  const count = { presses: 0, releases: 0 };
  const stops = [listenToKeys(eventTarget, keys, count), listenToFinger(surface, finger, count, { carX, clampX, toRoadUnits })];
  return {
    get pressing() {
      return finger.id !== null;
    },
    get presses() {
      return count.presses;
    },
    get releases() {
      return count.releases;
    },
    get touch() {
      return { pressed: finger.id !== null, x: finger.x, y: finger.y };
    },
    read: () => readInput(keys, finger, clampX),
    destroy() {
      for (const stop of stops) stop();
      keys.clear();
      finger.id = null;
    },
  };
}

function readInput(keys, finger, clampX) {
  const held = (list) => list.some((key) => keys.has(key));
  const steer = (held(RIGHT_KEYS) ? 1 : 0) - (held(LEFT_KEYS) ? 1 : 0);
  const pressing = finger.id !== null;
  const following = pressing && steer === 0;
  return {
    accelerate: pressing || held(GAS_KEYS),
    steer,
    targetX: following ? clampX(finger.anchorX + finger.dragged) : null,
  };
}

function seeFinger(finger, event) {
  finger.x = event.offsetX ?? null;
  finger.y = event.offsetY ?? null;
}

function listen(target, handlers) {
  for (const [type, handler] of Object.entries(handlers)) target.addEventListener(type, handler);
  return () => {
    for (const [type, handler] of Object.entries(handlers)) target.removeEventListener(type, handler);
  };
}

function listenToKeys(target, keys, count) {
  return listen(target, {
    keydown: (event) => {
      if (!GAME_KEYS.has(event.key)) return;
      if (GAS_KEYS.includes(event.key) && !event.repeat && !keys.has(event.key)) count.presses += 1;
      keys.add(event.key);
      event.preventDefault();
    },
    keyup: (event) => keys.delete(event.key),
    blur: () => keys.clear(),
  });
}

function listenToFinger(surface, finger, count, { carX, clampX, toRoadUnits }) {
  const lift = (event) => {
    if (event.pointerId !== finger.id) return;
    finger.id = null;
    count.releases += 1;
  };
  return listen(surface, {
    pointerdown: (event) => {
      if (finger.id !== null) return;
      count.presses += 1;
      Object.assign(finger, { id: event.pointerId, anchorX: carX(), lastX: event.clientX, dragged: 0 });
      seeFinger(finger, event);
      surface.setPointerCapture?.(event.pointerId);
    },
    pointermove: (event) => {
      if (event.pointerId !== finger.id) return;
      const wanted = finger.anchorX + finger.dragged + toRoadUnits(event.clientX - finger.lastX);
      finger.dragged = clampX(wanted) - finger.anchorX;
      finger.lastX = event.clientX;
      seeFinger(finger, event);
    },
    pointerup: lift,
    pointercancel: lift,
    lostpointercapture: lift,
    contextmenu: (event) => event.preventDefault(),
  });
}
