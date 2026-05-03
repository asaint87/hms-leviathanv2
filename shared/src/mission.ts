import type { Station } from './world-state.js';

export interface CrewTask {
  station: Station;
  text: string;        // what the crew member sees on their screen
  hint?: string;       // smaller hint text below
}

export interface MissionStep {
  id: string;
  captainSay: string;       // exact text captain reads aloud
  captainHint?: string;     // captain-only coaching note
  crewTasks: CrewTask[];    // tasks shown to specific stations
  waitFor: Station[];       // which stations must confirm before advancing
  autoConfirmOn?: {         // auto-confirm triggers
    station: Station;
    action: string;         // e.g., 'PING_CONTACT', 'ALLOCATE_POWER'
  }[];
  requireCaptainAdvance?: boolean;  // captain must tap CONTINUE even after crew ready
}

export interface Mission {
  id: string;
  name: string;
  badge?: string;
  brief: string;           // captain reads aloud at start
  steps: MissionStep[];
}

export interface MissionState {
  missionId: string;
  currentStepIndex: number;
  confirmedStations: Station[];
  phase: 'briefing' | 'active' | 'complete';
}
