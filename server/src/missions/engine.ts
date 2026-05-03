import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Mission, MissionState, Station } from '@leviathan/shared';
import type { Room } from '../rooms.js';
import { SEA_TRIAL } from './sea-trial.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

const MISSIONS: Record<string, Mission> = {
  'sea-trial': SEA_TRIAL,
};

// Track mission state per room
const roomMissions = new Map<string, { mission: Mission; state: MissionState }>();

export function startMission(io: IO, room: Room, missionId: string) {
  const mission = MISSIONS[missionId];
  if (!mission) return;

  const state: MissionState = {
    missionId,
    currentStepIndex: 0,
    confirmedStations: [],
    phase: 'briefing',
  };

  roomMissions.set(room.code, { mission, state });

  // Send mission brief to all
  io.to(room.code).emit('mission_started', {
    missionId: mission.id,
    missionName: mission.name,
    brief: mission.brief,
  });
}

export function advanceMission(io: IO, room: Room) {
  const entry = roomMissions.get(room.code);
  if (!entry) return;

  const { mission, state } = entry;

  if (state.phase === 'briefing') {
    // Move from briefing to first step
    state.phase = 'active';
    state.currentStepIndex = 0;
    state.confirmedStations = [];
    broadcastStep(io, room, mission, state);
    return;
  }

  if (state.phase === 'active') {
    // Advance to next step
    state.currentStepIndex++;
    state.confirmedStations = [];

    if (state.currentStepIndex >= mission.steps.length) {
      // Mission complete
      state.phase = 'complete';
      io.to(room.code).emit('mission_complete', { missionId: mission.id });
      roomMissions.delete(room.code);
      return;
    }

    broadcastStep(io, room, mission, state);
  }
}

export function crewReady(io: IO, room: Room, station: Station) {
  const entry = roomMissions.get(room.code);
  if (!entry || entry.state.phase !== 'active') return;

  const { mission, state } = entry;
  const step = mission.steps[state.currentStepIndex];
  if (!step) return;

  // Add to confirmed list
  if (!state.confirmedStations.includes(station)) {
    state.confirmedStations.push(station);

    // Notify room about confirmation
    io.to(room.code).emit('mission_crew_confirmed', {
      station,
      stepId: step.id,
    });
  }

  // Check if all required stations confirmed
  const allConfirmed = step.waitFor.every((s) => state.confirmedStations.includes(s));

  if (allConfirmed && !step.requireCaptainAdvance) {
    // Auto-advance
    advanceMission(io, room);
  }
  // If requireCaptainAdvance, captain must call advanceMission manually
}

export function handleActionAutoConfirm(io: IO, room: Room, station: Station, action: string) {
  const entry = roomMissions.get(room.code);
  if (!entry || entry.state.phase !== 'active') return;

  const step = entry.mission.steps[entry.state.currentStepIndex];
  if (!step?.autoConfirmOn) return;

  const match = step.autoConfirmOn.find(
    (ac) => ac.station === station && ac.action === action
  );

  if (match) {
    crewReady(io, room, station);
  }
}

export function getMissionState(roomCode: string): { mission: Mission; state: MissionState } | null {
  return roomMissions.get(roomCode) || null;
}

function broadcastStep(io: IO, room: Room, mission: Mission, state: MissionState) {
  const step = mission.steps[state.currentStepIndex];
  if (!step) return;

  // Send step to captain (and all players for the captain prompt)
  io.to(room.code).emit('mission_step', {
    step,
    stepIndex: state.currentStepIndex,
    totalSteps: mission.steps.length,
    missionState: state,
  });

  // Send individual crew tasks to specific stations
  for (const task of step.crewTasks) {
    for (const [, player] of room.players) {
      if (player.station === task.station) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (targetSocket) {
          targetSocket.emit('mission_task', { task, stepId: step.id });
        }
        break;
      }
    }
  }
}
