import type { WorldState, PowerSystem } from '@leviathan/shared';
import { POWER_TOTAL, POWER_LOCKED } from '@leviathan/shared';

export function createInitialWorldState(): WorldState {
  return {
    sub: {
      position: { x: 0, y: 0, depth: 50 },
      heading: 0,
      velocity: 0,
      hullIntegrity: 100,
    },

    power: {
      total: POWER_TOTAL,
      locked: POWER_LOCKED,
      allocations: {
        engines: 2,
        sonar: 2,
        shields: 2,
        comms: 1,
        lights: 1,
      },
      overheat: {
        engines: { timer: 0, state: 'normal' },
        sonar: { timer: 0, state: 'normal' },
        shields: { timer: 0, state: 'normal' },
        comms: { timer: 0, state: 'normal' },
        lights: { timer: 0, state: 'normal' },
      },
      emergencyPower: {
        active: false,
        cooldown: false,
        timer: 0,
      },
    },

    sonar: {
      contacts: [],
      range: 500,
    },

    navigation: {
      waypoints: [
        { id: 'wp-start', x: 0, y: 0, type: 'safe_harbor', label: 'Home Port' },
        { id: 'wp-1', x: 200, y: -150, type: 'poi', label: 'Kelp Forest' },
        { id: 'wp-2', x: -100, y: -300, type: 'poi', label: 'Thermal Vent' },
        { id: 'wp-3', x: 350, y: -400, type: 'mission', label: 'Signal Source' },
      ],
      revealedCells: ['0,0', '-1,0', '0,-1', '-1,-1', '1,0', '0,1', '1,-1', '-1,1', '1,1'],
      currents: [
        { regionId: 'c1', x: 100, y: -100, direction: 45, magnitude: 0.3 },
        { regionId: 'c2', x: -50, y: -250, direction: 180, magnitude: 0.5 },
        { regionId: 'c3', x: 250, y: -300, direction: 270, magnitude: 0.2 },
      ],
      probeBeacons: [],
      coursePath: [],
    },

    signals: {
      incomingQueue: [],
      decodedArchive: [],
      creatureRegistry: {},
    },

    captain: {
      condition: 'explore',
      scopedStation: null,
      flashAlertUsed: false,
      commendsUsed: 0,
    },

    crew: {
      captain: null,
      navigator: null,
      sonar: null,
      engineer: null,
      signals: null,
    },
  };
}
