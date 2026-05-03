import { useEffect, useRef, useCallback } from 'react';
import type { Station } from '@leviathan/shared';
import { AudioEngine } from '../audio/AudioEngine';
import { STATION_AMBIENTS } from '../audio/station-sounds';

// Shared audio engine instance
let sharedEngine: AudioEngine | null = null;
function getEngine(): AudioEngine {
  if (!sharedEngine) {
    sharedEngine = new AudioEngine();
  }
  return sharedEngine;
}

export function useStationAudio(station: Station | null) {
  const engineRef = useRef(getEngine());
  const activeStation = useRef<Station | null>(null);

  useEffect(() => {
    if (!station) return;

    const engine = engineRef.current;

    // Stop previous station's ambients
    if (activeStation.current && activeStation.current !== station) {
      const prevAmbients = STATION_AMBIENTS[activeStation.current];
      for (const amb of prevAmbients) {
        engine.stopLoop(amb.name);
      }
    }

    // Start this station's ambients
    const ambients = STATION_AMBIENTS[station];
    for (const amb of ambients) {
      engine.startLoop(amb.name, amb);
    }
    activeStation.current = station;

    return () => {
      for (const amb of ambients) {
        engine.stopLoop(amb.name);
      }
      activeStation.current = null;
    };
  }, [station]);

  const playPing = useCallback(() => engineRef.current.playPing(), []);
  const playCommend = useCallback(() => engineRef.current.playCommend(), []);
  const playPowerChange = useCallback(() => engineRef.current.playPowerChange(), []);
  const playAlert = useCallback(() => engineRef.current.playAlert(), []);

  return { playPing, playCommend, playPowerChange, playAlert };
}
