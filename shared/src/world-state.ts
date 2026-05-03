// === Core Types ===

export type PowerSystem = 'engines' | 'sonar' | 'shields' | 'comms' | 'lights';
export type OverheatState = 'normal' | 'warning' | 'critical' | 'failed';
export type Condition = 'explore' | 'alert' | 'combat';
export type Station = 'captain' | 'navigator' | 'sonar' | 'engineer' | 'signals';
export type ContactType = 'friendly' | 'unknown' | 'danger' | 'special';
export type ContactBehavior = 'drifter' | 'wanderer';
export type BeaconState = 'deployed' | 'pending_decode' | 'decoded';
export type Faction = 'corporate' | 'researcher' | 'leviathan' | 'distress';

// === Entities ===

export interface Contact {
  id: string;
  bearing: number;
  distance: number;
  depth: number;
  type: ContactType;
  behavior: ContactBehavior;
  pinged: boolean;
  tracked: boolean;
  namedBy: string | null;
  visible: boolean;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  type: 'mission' | 'safe_harbor' | 'poi' | 'beacon';
  label?: string;
}

export interface Current {
  regionId: string;
  x: number;
  y: number;
  direction: number;
  magnitude: number;
}

export interface Beacon {
  id: string;
  x: number;
  y: number;
  state: BeaconState;
  decodedData?: string;
}

export interface Transmission {
  id: string;
  channel: number;
  encrypted: boolean;
  cipherType?: 'substitution' | 'pattern';
  content: string;
  decoded: boolean;
  decodedContent?: string;
  faction: Faction;
  timestamp: number;
}

export interface CrewMember {
  playerName: string;
  connected: boolean;
  playerId: string;
  lastAction: number;
}

// === World State ===

export interface WorldState {
  sub: {
    position: { x: number; y: number; depth: number };
    heading: number;
    velocity: number;
    hullIntegrity: number;
  };

  power: {
    total: number;
    locked: number;
    allocations: Record<PowerSystem, number>;
    overheat: Record<PowerSystem, {
      timer: number;
      state: OverheatState;
    }>;
    emergencyPower: {
      active: boolean;
      cooldown: boolean;
      timer: number;
    };
  };

  sonar: {
    contacts: Contact[];
    range: number;
  };

  navigation: {
    waypoints: Waypoint[];
    revealedCells: string[];
    currents: Current[];
    probeBeacons: Beacon[];
    coursePath: { x: number; y: number }[];
  };

  signals: {
    incomingQueue: Transmission[];
    decodedArchive: Transmission[];
    creatureRegistry: Record<string, { name: string; symbol: string }>;
  };

  captain: {
    condition: Condition;
    scopedStation: Station | null;
    flashAlertUsed: boolean;
    commendsUsed: number;
  };

  crew: Record<Station, CrewMember | null>;
}
