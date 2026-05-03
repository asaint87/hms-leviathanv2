import type { Station } from '@leviathan/shared';

export interface AmbientConfig {
  name: string;
  frequency: number;
  type: OscillatorType;
  volume: number;
  detune?: number;
}

export const STATION_AMBIENTS: Record<Station, AmbientConfig[]> = {
  engineer: [
    { name: 'engine-throb', frequency: 55, type: 'sawtooth', volume: 0.06 },
    { name: 'engine-hum', frequency: 110, type: 'sine', volume: 0.04, detune: -5 },
    { name: 'pipe-rattle', frequency: 220, type: 'triangle', volume: 0.02, detune: 7 },
  ],
  sonar: [
    { name: 'ocean-low', frequency: 60, type: 'sine', volume: 0.04 },
    { name: 'ocean-mid', frequency: 180, type: 'sine', volume: 0.02, detune: 3 },
  ],
  navigator: [
    { name: 'nav-hum', frequency: 90, type: 'sine', volume: 0.03 },
    { name: 'nav-tone', frequency: 280, type: 'triangle', volume: 0.015 },
  ],
  signals: [
    { name: 'static-low', frequency: 100, type: 'sawtooth', volume: 0.02 },
    { name: 'static-mid', frequency: 340, type: 'square', volume: 0.008 },
  ],
  captain: [
    { name: 'bridge-hum', frequency: 75, type: 'sine', volume: 0.03 },
    { name: 'bridge-tone', frequency: 150, type: 'triangle', volume: 0.015 },
  ],
};
