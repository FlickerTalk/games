// Distances are in road units (the screen is VIEW_WIDTH units wide); speeds in units per second.
export const VIEW_WIDTH = 10;
export const ROAD_HALF_WIDTH = 3.6;
export const LANE_COUNT = 3;
export const PLAYER_SCREEN_POSITION = 0.8;

export const SIZES = {
  player: { width: 1.54, length: 2.45 },
  robot: { width: 1.41, length: 2.24 },
  traffic: { width: 1.12, length: 1.88 },
  bus: { width: 1.12, length: 2.14 },
  cone: { width: 0.8, length: 0.8 },
  puddle: { width: 1.6, length: 0.9 },
};

export const CAMERA = { minLookAheadSeconds: 1.6, zoomInPerSecond: 0.5 };

export const DRIVING = {
  acceleration: 5,
  coastDeceleration: 3,
  lateralSpeed: 6,
  followRate: 8,
  slowSteerFactor: 0.35,
};

export const BUMP = { speedFactor: 0.3, puddleSpeedFactor: 0.55, seconds: 0.9 };

export const RACE = {
  countdownSeconds: 1.5,
  resumeCountdownSeconds: 1,
  goLightSeconds: 0.7,
  finishPauseSeconds: 1.2,
  startClearDistance: 40,
  startOffsetX: 1.2,
  robotLookAheadMin: 10,
  robotLookAheadSeconds: 1.2,
  trafficLookAhead: 9,
  trafficSpeedFactor: 0.45,
  trafficLaneChangeSpeed: 2.5,
  easeAfterLosses: 2,
  moveOnAfterLosses: 3,
};

export const EASED_ROBOT = { speedFactorDrop: 0.1, mistakeChanceRise: 0.25 };

export const ROBOT_PACE = { evenGap: 4, fullGap: 24, slowest: 0.8, fastest: 1.2, ceiling: 0.95, easingSeconds: 1 };

const LEVEL_CURVE = {
  topSpeed: { first: 9, step: 1, limit: 13 },
  robotSpeedFactor: { first: 0.78, step: 0.02, limit: 0.85 },
  robotMistakeChance: { first: 0.5, step: -0.05, limit: 0.3 },
};

const DENSITY_CURVE = {
  length: { first: 320, step: 40, limit: 520 },
  traffic: { first: 2, step: 1, limit: 6 },
  hazards: { first: 3, step: 1.5, limit: 8 },
};

const OPENING_SECONDS = [35, 40, 45, 55, 45, 50, 60, 70, 55, 65, 75, 90];
const CYCLE_SECONDS = [60, 70, 80, 90];
export const LONGEST_RACE_SECONDS = 90;
export const HALFWAY_FROM_SECONDS = 60;

function plannedSeconds(level) {
  const seconds = level <= OPENING_SECONDS.length
    ? OPENING_SECONDS[level - 1]
    : CYCLE_SECONDS[(level - OPENING_SECONDS.length - 1) % CYCLE_SECONDS.length];
  return Math.min(LONGEST_RACE_SECONDS, seconds);
}

export function raceSeconds(level, losses = 0) {
  const whole = Math.max(1, Math.floor(level));
  const own = plannedSeconds(whole);
  if (losses < RACE.easeAfterLosses || whole === 1) return own;
  return Math.min(own, plannedSeconds(whole - 1));
}

const curveAt = (table, steps) => Object.fromEntries(Object.entries(table).map(([name, curve]) => [name, along(curve, steps)]));

export function levelSettings(level, losses = 0) {
  const steps = Math.max(0, level - 1);
  const pace = curveAt(LEVEL_CURVE, steps);
  const today = curveAt(DENSITY_CURVE, steps);
  const seconds = raceSeconds(level, losses);
  const trackLength = seconds * pace.topSpeed;
  const settings = {
    ...pace,
    raceSeconds: seconds,
    trackLength,
    trafficCount: Math.round((Math.floor(today.traffic) * trackLength) / today.length),
    hazardCount: Math.round((Math.floor(today.hazards) * trackLength) / today.length),
  };
  if (losses < RACE.easeAfterLosses) return settings;
  return {
    ...settings,
    robotSpeedFactor: settings.robotSpeedFactor - EASED_ROBOT.speedFactorDrop,
    robotMistakeChance: Math.min(1, settings.robotMistakeChance + EASED_ROBOT.mistakeChanceRise),
  };
}

function along({ first, step, limit }, steps) {
  const value = first + step * steps;
  return step < 0 ? Math.max(value, limit) : Math.min(value, limit);
}
