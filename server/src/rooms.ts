import { randomUUID } from 'crypto';
import type { Station, WorldState, CrewMember } from '@leviathan/shared';
import { ROOM_CODE_WORDS, ROOM_CLEANUP_DELAY, STATIONS } from '@leviathan/shared';
import { createInitialWorldState } from './world-state.js';

export interface Player {
  socketId: string;
  playerId: string;
  playerName: string;
  station: Station | null;
}

export interface Room {
  code: string;
  players: Map<string, Player>; // keyed by playerId
  worldState: WorldState;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, Room>(); // keyed by room code

function generateRoomCode(): string {
  let code: string;
  do {
    code = ROOM_CODE_WORDS[Math.floor(Math.random() * ROOM_CODE_WORDS.length)];
  } while (rooms.has(code));
  return code;
}

export function createRoom(socketId: string, playerName: string): { room: Room; player: Player } {
  const code = generateRoomCode();
  const playerId = randomUUID();

  const player: Player = {
    socketId,
    playerId,
    playerName,
    station: null,
  };

  const room: Room = {
    code,
    players: new Map([[playerId, player]]),
    worldState: createInitialWorldState(),
    cleanupTimer: null,
  };

  rooms.set(code, room);
  return { room, player };
}

export function joinRoom(code: string, socketId: string, playerName: string): { room: Room; player: Player } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  // Cancel cleanup if someone is joining
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  const playerId = randomUUID();
  const player: Player = {
    socketId,
    playerId,
    playerName,
    station: null,
  };

  room.players.set(playerId, player);
  return { room, player };
}

export function rejoinRoom(
  code: string,
  station: Station,
  playerId: string,
  socketId: string
): { room: Room; player: Player } | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;

  const player = room.players.get(playerId);
  if (!player) return null;

  // Cancel cleanup timer
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }

  // Re-associate socket
  player.socketId = socketId;

  // Update crew connected status
  if (player.station) {
    const crewMember = room.worldState.crew[player.station];
    if (crewMember) {
      crewMember.connected = true;
    }
  }

  return { room, player };
}

export function claimStation(room: Room, playerId: string, station: Station): boolean {
  // Check if station is already claimed
  for (const [, player] of room.players) {
    if (player.station === station) return false;
  }

  const player = room.players.get(playerId);
  if (!player) return false;

  player.station = station;

  // Update world state crew
  room.worldState.crew[station] = {
    playerName: player.playerName,
    connected: true,
    playerId: player.playerId,
    lastAction: Date.now(),
  };

  return true;
}

export function getAvailableStations(room: Room): Station[] {
  const claimed = new Set<Station>();
  for (const [, player] of room.players) {
    if (player.station) claimed.add(player.station);
  }
  return STATIONS.filter((s) => !claimed.has(s));
}

export function getPlayersMap(room: Room): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [, player] of room.players) {
    if (player.station) {
      result[player.station] = player.playerName;
    }
  }
  return result;
}

export function handleDisconnect(socketId: string): { room: Room; player: Player } | null {
  for (const [, room] of rooms) {
    for (const [, player] of room.players) {
      if (player.socketId === socketId) {
        // Mark crew as disconnected
        if (player.station) {
          const crewMember = room.worldState.crew[player.station];
          if (crewMember) {
            crewMember.connected = false;
          }
        }

        // Check if all players disconnected
        const anyConnected = Array.from(room.players.values()).some(
          (p) => p.socketId !== socketId && p.station !== null
        );

        if (!anyConnected && !room.cleanupTimer) {
          room.cleanupTimer = setTimeout(() => {
            rooms.delete(room.code);
            console.log(`Room ${room.code} cleaned up (all players disconnected)`);
          }, ROOM_CLEANUP_DELAY);
        }

        return { room, player };
      }
    }
  }
  return null;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) || null;
}

export function getRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
  for (const [, room] of rooms) {
    for (const [, player] of room.players) {
      if (player.socketId === socketId) {
        return { room, player };
      }
    }
  }
  return null;
}
