import type { WorldState, Station, Condition, PowerSystem } from './world-state.js';

// === Client → Server Events ===

export interface ClientToServerEvents {
  // Lobby
  create_room: (data: { playerName: string }) => void;
  join_room: (data: { code: string; playerName: string }) => void;
  claim_station: (data: { station: Station }) => void;
  rejoin_room: (data: { code: string; station: Station; playerId: string }) => void;

  // Engineer
  allocate_power: (data: { system: PowerSystem; units: number }) => void;
  vent_system: (data: { system: PowerSystem }) => void;
  emergency_power: () => void;
  repair_system: (data: { system: PowerSystem }) => void;

  // Sonar
  ping_contact: (data: { contactId: string }) => void;
  track_contact: (data: { contactId: string }) => void;
  untrack_contact: (data: { contactId: string }) => void;

  // Navigator
  plot_course: (data: { waypoints: { x: number; y: number }[] }) => void;
  adjust_depth: (data: { depth: number }) => void;
  mark_contact: (data: { bearing: number; distance: number }) => void;
  drop_beacon: (data: { x: number; y: number }) => void;

  // Signals
  scan_frequency: (data: { channel: number }) => void;
  decode_transmission: (data: { transmissionId: string; answer: string }) => void;
  name_contact: (data: { contactId: string; name: string; symbol: string }) => void;
  boost_repair: () => void;

  // Captain
  set_condition: (data: { condition: Condition }) => void;
  scope_station: (data: { station: Station }) => void;
  unscope: () => void;
  commend_station: (data: { station: Station }) => void;
  flash_alert: (data: { preset: 'dive' | 'hold' | 'eyes_sonar' | 'brace' }) => void;
}

// === Server → Client Events ===

export interface ServerToClientEvents {
  // Lobby responses
  room_created: (data: { code: string; playerId: string }) => void;
  room_joined: (data: { station: Station; players: Record<string, string>; playerId: string }) => void;
  station_claimed: (data: { station: Station; playerName: string }) => void;

  // State sync
  state_update: (data: { worldState: WorldState }) => void;

  // Captain actions (received by stations)
  station_scoped: (data: { by: 'captain' }) => void;
  station_unscoped: () => void;
  captain_prompt: (data: { message: string; stationContext: string }) => void;
  commended: (data: { fromStation: 'captain' }) => void;
  condition_changed: (data: { condition: Condition; suggestedPower: Record<PowerSystem, number> }) => void;

  // System events
  system_overheat: (data: { system: PowerSystem; state: string }) => void;
  emergency_power_active: (data: { duration: number }) => void;
  emergency_power_cooldown: (data: { duration: number; reducedPool: number }) => void;
  flash_alert: (data: { preset: string; message: string }) => void;

  // Errors
  error: (data: { message: string }) => void;
}
