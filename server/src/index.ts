import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { ClientToServerEvents, ServerToClientEvents, PowerSystem } from '@leviathan/shared';
import { POWER_MAX_PER_SYSTEM, EMERGENCY_POWER_DURATION, EMERGENCY_POWER_BONUS, CONDITION_PRESETS } from '@leviathan/shared';
import {
  createRoom,
  joinRoom,
  rejoinRoom,
  claimStation,
  getAvailableStations,
  getPlayersMap,
  handleDisconnect,
  getRoomBySocketId,
} from './rooms.js';
import { startGameLoop } from './game-loop.js';

// Track active game loops per room code
const gameLoops = new Map<string, ReturnType<typeof setInterval>>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
  },
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // --- Lobby Events ---

  socket.on('create_room', ({ playerName }) => {
    const { room, player } = createRoom(socket.id, playerName);
    socket.join(room.code);
    socket.emit('room_created', { code: room.code, playerId: player.playerId });
    console.log(`Room ${room.code} created by ${playerName}`);
  });

  socket.on('join_room', ({ code, playerName }) => {
    const result = joinRoom(code, socket.id, playerName);
    if (!result) {
      socket.emit('error', { message: `Room "${code}" not found` });
      return;
    }
    const { room, player } = result;
    socket.join(room.code);
    socket.emit('room_joined', {
      station: player.station!,
      players: getPlayersMap(room),
      playerId: player.playerId,
    });
    console.log(`${playerName} joined room ${room.code}`);
  });

  socket.on('claim_station', ({ station }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) {
      socket.emit('error', { message: 'You are not in a room' });
      return;
    }
    const { room, player } = found;

    const success = claimStation(room, player.playerId, station);
    if (!success) {
      socket.emit('error', { message: `Station "${station}" is already claimed` });
      return;
    }

    io.to(room.code).emit('station_claimed', {
      station,
      playerName: player.playerName,
    });

    // Start game loop when first station is claimed
    if (!gameLoops.has(room.code)) {
      const loop = startGameLoop(io, room);
      gameLoops.set(room.code, loop);
      console.log(`Game loop started for room ${room.code}`);
    }

    console.log(`${player.playerName} claimed ${station} in room ${room.code}`);
  });

  socket.on('rejoin_room', ({ code, station, playerId }) => {
    const result = rejoinRoom(code, station, playerId, socket.id);
    if (!result) {
      socket.emit('error', { message: 'Could not rejoin room' });
      return;
    }
    const { room, player } = result;
    socket.join(room.code);
    socket.emit('room_joined', {
      station: player.station!,
      players: getPlayersMap(room),
      playerId: player.playerId,
    });
    // Send current world state snapshot
    socket.emit('state_update', { worldState: room.worldState });
    console.log(`${player.playerName} rejoined room ${room.code}`);
  });

  // --- Engineer Actions ---

  socket.on('allocate_power', ({ system, units }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    // Validate: units 0-3, and total allocatable doesn't exceed budget
    if (units < 0 || units > POWER_MAX_PER_SYSTEM) return;
    if (state.power.overheat[system].state === 'failed') return;

    const currentUsed = Object.values(state.power.allocations).reduce((a, b) => a + b, 0);
    const currentForSystem = state.power.allocations[system];
    const newTotal = currentUsed - currentForSystem + units;
    const budget = state.power.total - state.power.locked;

    if (newTotal > budget) return;

    state.power.allocations[system] = units;

    // Update lastAction timestamp
    const crew = state.crew.engineer;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('vent_system', ({ system }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;
    const oh = state.power.overheat[system];

    // Can only vent systems that are warning or critical
    if (oh.state === 'normal' || oh.state === 'failed') return;

    // Vent: briefly drop to 0, then reset overheat
    state.power.allocations[system] = 0;
    oh.timer = 0;
    oh.state = 'normal';
  });

  socket.on('emergency_power', () => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;
    const ep = state.power.emergencyPower;

    // Can't activate if already active or in cooldown
    if (ep.active || ep.cooldown) return;

    ep.active = true;
    ep.timer = EMERGENCY_POWER_DURATION;
    state.power.total = state.power.total + EMERGENCY_POWER_BONUS;

    io.to(room.code).emit('emergency_power_active', { duration: EMERGENCY_POWER_DURATION });
  });

  socket.on('repair_system', ({ system }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;
    const oh = state.power.overheat[system];

    // Can only repair failed systems
    if (oh.state !== 'failed') return;

    // Instant repair for V0.1 (tap-and-hold minigame comes later)
    oh.state = 'normal';
    oh.timer = 0;
    state.power.allocations[system] = 1; // comes back at LOW
  });

  // --- Sonar Actions ---

  socket.on('ping_contact', ({ contactId }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    const contact = state.sonar.contacts.find((c) => c.id === contactId);
    if (!contact) return;

    contact.pinged = true;

    // Update lastAction
    const crew = state.crew.sonar;
    if (crew) crew.lastAction = Date.now();

    // Send captain prompt — the social reward loop
    const bearingLabel = getBearingLabel(contact.bearing);
    const typeLabel = contact.type === 'friendly' ? 'something friendly'
      : contact.type === 'danger' ? 'something dangerous'
      : 'an unknown contact';

    // Find captain's socket and send prompt
    for (const [, player] of room.players) {
      if (player.station === 'captain') {
        const captainSocket = io.sockets.sockets.get(player.socketId);
        if (captainSocket) {
          captainSocket.emit('captain_prompt', {
            message: `Sonar just pinged ${typeLabel} at ${bearingLabel} — ask them what it looks like!`,
            stationContext: 'sonar',
          });
        }
        break;
      }
    }
  });

  socket.on('track_contact', ({ contactId }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    const contact = state.sonar.contacts.find((c) => c.id === contactId);
    if (!contact) return;

    contact.tracked = true;

    const crew = state.crew.sonar;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('untrack_contact', ({ contactId }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    const contact = state.sonar.contacts.find((c) => c.id === contactId);
    if (!contact) return;

    contact.tracked = false;
  });

  // --- Signals Actions ---

  socket.on('decode_transmission', ({ transmissionId, answer }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    const tx = state.signals.incomingQueue.find((t) => t.id === transmissionId);
    if (!tx || tx.decoded) return;

    // For V0.1: any non-empty answer counts as decoded
    tx.decoded = true;
    tx.decodedContent = answer || tx.content;

    // Move to archive
    state.signals.decodedArchive.push(tx);
    state.signals.incomingQueue = state.signals.incomingQueue.filter((t) => t.id !== transmissionId);

    // Send captain prompt about decoded intel
    for (const [, player] of room.players) {
      if (player.station === 'captain') {
        const captainSocket = io.sockets.sockets.get(player.socketId);
        if (captainSocket) {
          const preview = tx.decodedContent!.slice(0, 60);
          captainSocket.emit('captain_prompt', {
            message: `Signals decoded a ${tx.faction} transmission: "${preview}..."`,
            stationContext: 'signals',
          });
        }
        break;
      }
    }

    const crew = state.crew.signals;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('name_contact', ({ contactId, name, symbol }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    const contact = state.sonar.contacts.find((c) => c.id === contactId);
    if (!contact || !contact.tracked) return;

    contact.namedBy = name;
    state.signals.creatureRegistry[contactId] = { name, symbol };

    const crew = state.crew.signals;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('boost_repair', () => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;

    // Find Engineer's socket and notify
    for (const [, player] of room.players) {
      if (player.station === 'engineer') {
        const engSocket = io.sockets.sockets.get(player.socketId);
        if (engSocket) {
          // Engineer receives this as a commend-like boost
          engSocket.emit('commended', { fromStation: 'captain' });
        }
        break;
      }
    }
  });

  socket.on('scan_frequency', ({ channel }) => {
    // For V0.1: scanning is passive — transmissions arrive automatically
    // This is a placeholder for future active scanning mechanic
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const crew = found.room.worldState.crew.signals;
    if (crew) crew.lastAction = Date.now();
  });

  // --- Navigator Actions ---

  socket.on('plot_course', ({ waypoints }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    state.navigation.coursePath = waypoints;

    const crew = state.crew.navigator;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('adjust_depth', ({ depth }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;

    // Clamp depth 0-500
    room.worldState.sub.position.depth = Math.max(0, Math.min(500, depth));

    const crew = room.worldState.crew.navigator;
    if (crew) crew.lastAction = Date.now();
  });

  socket.on('mark_contact', ({ bearing, distance }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    // Convert bearing+distance to map coordinates relative to sub
    const rad = (bearing * Math.PI) / 180;
    const x = state.sub.position.x + distance * Math.sin(rad);
    const y = state.sub.position.y - distance * Math.cos(rad);

    state.navigation.waypoints.push({
      id: `mark-${Date.now()}`,
      x,
      y,
      type: 'poi',
      label: `Contact ${bearing.toFixed(0)}°`,
    });
  });

  socket.on('drop_beacon', ({ x, y }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;

    room.worldState.navigation.probeBeacons.push({
      id: `beacon-${Date.now()}`,
      x,
      y,
      state: 'deployed',
    });

    const crew = room.worldState.crew.navigator;
    if (crew) crew.lastAction = Date.now();
  });

  // --- Captain Actions ---

  socket.on('set_condition', ({ condition }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;

    room.worldState.captain.condition = condition;

    io.to(room.code).emit('condition_changed', {
      condition,
      suggestedPower: CONDITION_PRESETS[condition],
    });
  });

  socket.on('commend_station', ({ station: targetStation }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    if (state.captain.commendsUsed >= 5) return;
    state.captain.commendsUsed++;

    // Find the socket for the target station and send commend
    for (const [, player] of room.players) {
      if (player.station === targetStation) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (targetSocket) {
          targetSocket.emit('commended', { fromStation: 'captain' });
        }
        break;
      }
    }
  });

  socket.on('scope_station', ({ station: targetStation }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;

    room.worldState.captain.scopedStation = targetStation;

    // Notify the scoped station
    for (const [, player] of room.players) {
      if (player.station === targetStation) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (targetSocket) {
          targetSocket.emit('station_scoped', { by: 'captain' });
        }
        break;
      }
    }
  });

  socket.on('unscope', () => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const prevStation = room.worldState.captain.scopedStation;

    room.worldState.captain.scopedStation = null;

    // Notify the previously scoped station
    if (prevStation) {
      for (const [, player] of room.players) {
        if (player.station === prevStation) {
          const targetSocket = io.sockets.sockets.get(player.socketId);
          if (targetSocket) {
            targetSocket.emit('station_unscoped');
          }
          break;
        }
      }
    }
  });

  socket.on('flash_alert', ({ preset }) => {
    const found = getRoomBySocketId(socket.id);
    if (!found) return;
    const { room } = found;
    const state = room.worldState;

    if (state.captain.flashAlertUsed) return;
    state.captain.flashAlertUsed = true;

    const messages: Record<string, string> = {
      dive: 'DIVE NOW!',
      hold: 'HOLD POSITION!',
      eyes_sonar: 'ALL EYES ON SONAR!',
      brace: 'BRACE FOR IMPACT!',
    };

    io.to(room.code).emit('flash_alert', {
      preset,
      message: messages[preset] || preset.toUpperCase(),
    });
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    const result = handleDisconnect(socket.id);
    if (result) {
      const { room, player } = result;
      console.log(`${player.playerName} disconnected from room ${room.code}`);
    }
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`HMS Leviathan server running on port ${PORT}`);
});

// --- Helpers ---

function getBearingLabel(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return '12 o\'clock';
  if (bearing < 67.5) return '1 o\'clock';
  if (bearing < 112.5) return '3 o\'clock';
  if (bearing < 157.5) return '4 o\'clock';
  if (bearing < 202.5) return '6 o\'clock';
  if (bearing < 247.5) return '7 o\'clock';
  if (bearing < 292.5) return '9 o\'clock';
  return '10 o\'clock';
}
