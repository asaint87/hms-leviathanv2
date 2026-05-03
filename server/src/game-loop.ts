import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, WorldState } from '@leviathan/shared';
import { TICK_INTERVAL, ENGINE_SPEED, SONAR_RANGE, OVERHEAT_WARNING_THRESHOLD, OVERHEAT_CRITICAL_THRESHOLD, OVERHEAT_FAILURE_THRESHOLD, OVERHEAT_COOLDOWN_DURATION, EMERGENCY_POWER_DURATION, EMERGENCY_POWER_COOLDOWN, EMERGENCY_POWER_REDUCED_TOTAL, POWER_TOTAL } from '@leviathan/shared';
import type { Room } from './rooms.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

export function startGameLoop(io: IO, room: Room): ReturnType<typeof setInterval> {
  return setInterval(() => {
    tick(room);
    io.to(room.code).emit('state_update', { worldState: room.worldState });
  }, TICK_INTERVAL);
}

function tick(room: Room) {
  const state = room.worldState;
  const dt = TICK_INTERVAL / 1000; // seconds per tick

  updateSubMovement(state, dt);
  updateSonarRange(state);
  updateOverheatTimers(state, dt);
  updateEmergencyPower(state, dt);
  updateContacts(state, dt);
  updateTransmissions(state, dt);
}

function updateSubMovement(state: WorldState, dt: number) {
  const speed = ENGINE_SPEED[state.power.allocations.engines] ?? 1.0;
  state.sub.velocity = speed;

  // Follow plotted course
  const course = state.navigation.coursePath;
  if (course.length > 0) {
    const target = course[0];
    const dx = target.x - state.sub.position.x;
    const dy = target.y - state.sub.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed * dt * 10 + 1) {
      // Reached waypoint
      state.sub.position.x = target.x;
      state.sub.position.y = target.y;
      course.shift();
    } else {
      // Move toward waypoint
      const moveAmount = speed * dt * 10;
      state.sub.position.x += (dx / dist) * moveAmount;
      state.sub.position.y += (dy / dist) * moveAmount;
      state.sub.heading = Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360);
    }
  }

  // Reveal fog of war cells near sub
  const cellX = Math.floor(state.sub.position.x / 50);
  const cellY = Math.floor(state.sub.position.y / 50);
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      const key = `${cellX + ox},${cellY + oy}`;
      if (!state.navigation.revealedCells.includes(key)) {
        state.navigation.revealedCells.push(key);
      }
    }
  }
}

function updateSonarRange(state: WorldState) {
  state.sonar.range = SONAR_RANGE[state.power.allocations.sonar] ?? 500;
}

function updateOverheatTimers(state: WorldState, dt: number) {
  const systems = Object.keys(state.power.allocations) as Array<keyof typeof state.power.allocations>;

  for (const system of systems) {
    const allocation = state.power.allocations[system];
    const oh = state.power.overheat[system];

    if (oh.state === 'failed') {
      // Failed systems stay at 0 until repaired
      state.power.allocations[system] = 0;
      continue;
    }

    if (allocation >= 3) {
      // At HIGH — increment timer
      oh.timer += dt;

      if (oh.timer >= OVERHEAT_FAILURE_THRESHOLD) {
        oh.state = 'failed';
        state.power.allocations[system] = 0;
      } else if (oh.timer >= OVERHEAT_CRITICAL_THRESHOLD) {
        oh.state = 'critical';
      } else if (oh.timer >= OVERHEAT_WARNING_THRESHOLD) {
        oh.state = 'warning';
      }
    } else if (allocation <= 2 && oh.timer > 0) {
      // Cooling down at MED or below
      oh.timer = Math.max(0, oh.timer - dt * 2);
      if (oh.timer === 0) {
        oh.state = 'normal';
      }
    }
  }
}

function updateEmergencyPower(state: WorldState, dt: number) {
  const ep = state.power.emergencyPower;

  if (ep.active) {
    ep.timer -= dt;
    state.power.total = POWER_TOTAL + 4; // 14 during emergency
    if (ep.timer <= 0) {
      ep.active = false;
      ep.cooldown = true;
      ep.timer = EMERGENCY_POWER_COOLDOWN;
      state.power.total = EMERGENCY_POWER_REDUCED_TOTAL; // 7 during cooldown
    }
  } else if (ep.cooldown) {
    ep.timer -= dt;
    state.power.total = EMERGENCY_POWER_REDUCED_TOTAL;
    if (ep.timer <= 0) {
      ep.cooldown = false;
      ep.timer = 0;
      state.power.total = POWER_TOTAL; // back to 10
    }
  }
}

function updateContacts(state: WorldState, dt: number) {
  // Move existing contacts based on behavior
  for (const contact of state.sonar.contacts) {
    if (contact.behavior === 'drifter') {
      // Drifters move in straight lines based on their bearing
      const rad = (contact.bearing * Math.PI) / 180;
      contact.distance += Math.cos(rad) * dt * 5;
      contact.bearing = (contact.bearing + dt * 2) % 360;
    } else if (contact.behavior === 'wanderer') {
      // Wanderers curve gently
      contact.bearing = (contact.bearing + dt * 8 + Math.sin(Date.now() / 2000) * 3) % 360;
      contact.distance += Math.sin(Date.now() / 3000) * dt * 3;
    }

    // Clamp distance
    contact.distance = Math.max(10, contact.distance);
  }

  // Remove contacts that drifted beyond sonar range + buffer
  state.sonar.contacts = state.sonar.contacts.filter(
    (c) => c.distance < state.sonar.range * 1.5
  );

  // Spawn new contacts occasionally (1 every ~8 seconds on average)
  if (Math.random() < dt / 8) {
    const types: Array<'friendly' | 'unknown' | 'danger'> = ['friendly', 'friendly', 'unknown', 'danger'];
    state.sonar.contacts.push({
      id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bearing: Math.random() * 360,
      distance: state.sonar.range * (0.6 + Math.random() * 0.35),
      depth: state.sub.position.depth + (Math.random() - 0.5) * 40,
      type: types[Math.floor(Math.random() * types.length)],
      behavior: Math.random() < 0.7 ? 'drifter' : 'wanderer',
      pinged: false,
      tracked: false,
      namedBy: null,
      visible: true,
    });
  }
}

// Pre-made transmission content
const TRANSMISSIONS = {
  corporate: [
    { content: 'MERIDIAN CORP: Survey grid Alpha-7 complete. Moving to sector Bravo.', encrypted: false },
    { content: 'MERIDIAN CORP: Anomalous readings at depth 340m. Dispatching probe.', encrypted: false },
    { content: 'XJKL RMQP VBTN — RFGH YZLM KPWD', encrypted: true, answer: 'PRIORITY ALERT DETECTED', hint: 'Each letter shifts 3 forward' },
    { content: 'WKHB DUH FORVLQJ RQ RXU SRVLWLRQ', encrypted: true, answer: 'THEY ARE CLOSING ON OUR POSITION', hint: 'Caesar cipher, shift 3' },
  ],
  researcher: [
    { content: 'DR. CHEN: Bio-luminescence readings off the charts down here. Beautiful.', encrypted: false },
    { content: 'RESEARCH VESSEL ARGO: Requesting acoustic silence — whale pod migrating through sector.', encrypted: false },
    { content: 'CODED: GSVIV RH HLNVGSRMT YZWOB DIMT SVIV', encrypted: true, answer: 'THERE IS SOMETHING BADLY WRONG HERE', hint: 'Atbash: A=Z, B=Y...' },
  ],
  distress: [
    { content: 'MAYDAY MAYDAY — Research submersible DEEPSTAR losing hull integrity at 280m!', encrypted: false },
    { content: '...can anyone... signal breaking... coordinates 47 by... please respond...', encrypted: false },
  ],
  leviathan: [
    { content: '\u2588\u2593\u2591 \u223F\u223F\u223F \u2591\u2593\u2588 \u223F \u2588\u2591\u2593\u2591\u2588', encrypted: true, answer: 'PATTERN ALPHA', hint: 'This is not a cipher — it is a pattern' },
    { content: '\u25C6\u25C7\u25C6 \u25CB\u25CF\u25CB \u25C6\u25C7\u25C6', encrypted: true, answer: 'PATTERN BETA', hint: 'Mirror symmetry — the Leviathan repeats itself' },
  ],
};

function updateTransmissions(state: WorldState, dt: number) {
  const commsLevel = state.power.allocations.comms;

  // Don't spawn if comms is at 0
  if (commsLevel === 0) return;

  // Cap queue at 5 unread
  const unread = state.signals.incomingQueue.filter((t) => !t.decoded).length;
  if (unread >= 5) return;

  // Spawn ~1 every 12 seconds
  if (Math.random() > dt / 12) return;

  const factions: Array<'corporate' | 'researcher' | 'distress' | 'leviathan'> = ['corporate', 'corporate', 'researcher', 'researcher', 'distress', 'leviathan'];
  const faction = factions[Math.floor(Math.random() * factions.length)];
  const pool = TRANSMISSIONS[faction];
  const template = pool[Math.floor(Math.random() * pool.length)];

  state.signals.incomingQueue.push({
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    channel: Math.floor(Math.random() * 8) + 1,
    encrypted: template.encrypted,
    cipherType: template.encrypted ? 'substitution' : undefined,
    content: template.content,
    decoded: !template.encrypted,
    decodedContent: template.encrypted ? undefined : template.content,
    faction,
    timestamp: Date.now(),
  });
}
