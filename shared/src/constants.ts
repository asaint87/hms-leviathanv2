import type { PowerSystem, Condition } from './world-state.js';

export const TICK_RATE = 4; // ticks per second
export const TICK_INTERVAL = 1000 / TICK_RATE; // 250ms

export const POWER_TOTAL = 10;
export const POWER_LOCKED = 2; // life support
export const POWER_ALLOCATABLE = POWER_TOTAL - POWER_LOCKED;
export const POWER_MAX_PER_SYSTEM = 3;

export const EMERGENCY_POWER_BONUS = 4;
export const EMERGENCY_POWER_DURATION = 45; // seconds
export const EMERGENCY_POWER_COOLDOWN = 90; // seconds
export const EMERGENCY_POWER_REDUCED_TOTAL = 7;

export const OVERHEAT_WARNING_THRESHOLD = 60; // seconds at HIGH
export const OVERHEAT_CRITICAL_THRESHOLD = 90; // seconds at HIGH
export const OVERHEAT_FAILURE_THRESHOLD = 110; // seconds at HIGH
export const OVERHEAT_COOLDOWN_DURATION = 30; // seconds at MED to reset

export const SONAR_RANGE: Record<number, number> = {
  0: 100,
  1: 200,
  2: 500,
  3: 800,
};

export const ENGINE_SPEED: Record<number, number> = {
  0: 0,
  1: 0.5,
  2: 1.0,
  3: 1.5,
};

export const CONDITION_PRESETS: Record<Condition, Record<PowerSystem, number>> = {
  explore: { engines: 1, sonar: 3, shields: 1, comms: 2, lights: 1 },
  alert:   { engines: 2, sonar: 2, shields: 2, comms: 1, lights: 1 },
  combat:  { engines: 3, sonar: 2, shields: 3, comms: 0, lights: 0 },
};

export const COMMEND_MAX_PER_SESSION = 5;
export const COMMEND_BOOST_DURATION = 60; // seconds

export const ROOM_CODE_WORDS = [
  'KRAKEN', 'NARWHAL', 'MARLIN', 'ORCA', 'TRITON',
  'NEPTUNE', 'CORAL', 'ABYSS', 'ANCHOR', 'TRIDENT',
  'BARNACLE', 'CURRENT', 'DEPTHS', 'FATHOM', 'HARBOR',
  'KELP', 'LANTERN', 'MAELSTROM', 'PEARL', 'REEF',
  'SIREN', 'SQUID', 'TEMPEST', 'URCHIN', 'VESSEL',
  'WHALE', 'DRIFT', 'FLOTSAM', 'GALE', 'HELM',
];

export const ROOM_CLEANUP_DELAY = 5 * 60 * 1000; // 5 minutes

export const STATIONS = ['captain', 'navigator', 'sonar', 'engineer', 'signals'] as const;
