const IDLE_SECONDS = 3;
const SAMPLE_CUE = 'pick';

function listen(bindings) {
  for (const [target, type, handler, capture] of bindings) target.addEventListener(type, handler, capture);
  return () => {
    for (const [target, type, handler, capture] of bindings) target.removeEventListener(type, handler, capture);
  };
}

export function attachVolume(run, switches, { unlock, choose, save, paint }) {
  const line = { open: false, holding: false, touchedAt: run.seconds };
  run.volumeLine = line;
  const touch = () => {
    line.touchedAt = run.seconds;
  };
  const show = (open) => {
    Object.assign(line, { open, holding: false });
    touch();
    paint();
  };
  const inside = (target) => switches.volume.contains?.(target) || switches.sound.contains?.(target);
  const release = () => {
    line.holding = false;
    touch();
  };
  return listen([
    [switches.sound, 'click', (event) => {
      unlock();
      show(!line.open);
      event.currentTarget?.blur?.();
    }],
    [switches.music, 'click', (event) => {
      unlock();
      choose({ music: !run.soundSettings.music });
      save();
      event.currentTarget?.blur?.();
    }],
    [switches.range, 'input', () => {
      touch();
      choose({ volume: Number(switches.range.value) / 100 });
    }],
    [switches.range, 'change', () => {
      touch();
      save();
      if (run.soundSettings.volume > 0) run.sound.cue(SAMPLE_CUE);
    }],
    [switches.volume, 'pointerdown', () => {
      line.holding = true;
      touch();
    }],
    [switches.volume, 'pointerup', release],
    [switches.volume, 'pointercancel', release],
    [switches.volume, 'keydown', (event) => {
      event.stopPropagation();
      touch();
      if (event.key === 'Escape') show(false);
    }],
    [run.page, 'pointerdown', (event) => {
      if (line.open && !inside(event.target)) show(false);
    }, true],
  ]);
}

export function foldIdleLine(run, paint) {
  const line = run.volumeLine;
  if (!line?.open || line.holding || run.seconds - line.touchedAt < IDLE_SECONDS) return;
  line.open = false;
  paint();
}
