import { useCallback, useEffect, useState } from 'react';
import type { PowerSystem, Condition } from '@leviathan/shared';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { Gauge } from '../ui/Gauge';
import { StatusLight } from '../ui/StatusLight';
import { PowerGrid } from '../../displays/PowerGrid';

interface Props {
  socket: any;
  readOnly?: boolean;
}

export function Engineer({ socket, readOnly = false }: Props) {
  const worldState = useWorldState();
  const { playPowerChange } = useStationAudio('engineer');
  const [conditionSuggestion, setConditionSuggestion] = useState<{
    condition: Condition;
    power: Record<PowerSystem, number>;
  } | null>(null);
  const [isScoped, setIsScoped] = useState(false);

  // Listen for condition changes from Captain
  useEffect(() => {
    const onConditionChanged = ({ condition, suggestedPower }: any) => {
      setConditionSuggestion({ condition, power: suggestedPower });
      // Auto-dismiss after 10 seconds
      setTimeout(() => setConditionSuggestion(null), 10000);
    };

    const onScoped = () => setIsScoped(true);
    const onUnscoped = () => setIsScoped(false);
    const onCommended = () => {
      // Visual feedback handled in the component
    };

    socket.on('condition_changed', onConditionChanged);
    socket.on('station_scoped', onScoped);
    socket.on('station_unscoped', onUnscoped);

    return () => {
      socket.off('condition_changed', onConditionChanged);
      socket.off('station_scoped', onScoped);
      socket.off('station_unscoped', onUnscoped);
    };
  }, [socket]);

  const handleAllocate = useCallback((system: PowerSystem, units: number) => {
    socket.emit('allocate_power', { system, units });
    playPowerChange();
  }, [socket, playPowerChange]);

  const handleVent = useCallback((system: PowerSystem) => {
    socket.emit('vent_system', { system });
  }, [socket]);

  const handleEmergencyPower = useCallback(() => {
    socket.emit('emergency_power');
  }, [socket]);

  const handleRepair = useCallback((system: PowerSystem) => {
    socket.emit('repair_system', { system });
  }, [socket]);

  const acceptCondition = useCallback(() => {
    if (!conditionSuggestion) return;
    const { power: suggested } = conditionSuggestion;
    for (const [sys, units] of Object.entries(suggested)) {
      socket.emit('allocate_power', { system: sys, units });
    }
    playPowerChange();
    setConditionSuggestion(null);
  }, [conditionSuggestion, socket, playPowerChange]);

  if (!worldState) return null;

  const { power, sub } = worldState;
  const hullPct = sub.hullIntegrity / 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '0.75rem',
      padding: '0.75rem',
      overflow: 'auto',
    }}>
      {/* Captain's hat icon when scoped */}
      {isScoped && (
        <div style={{
          position: 'fixed',
          top: 50,
          right: 12,
          fontSize: '1.5rem',
          opacity: 0.6,
          animation: 'scope-glow 2s ease-in-out infinite',
          zIndex: 50,
        }}>
          &#x1F3A9;
        </div>
      )}

      {/* Captain condition suggestion banner */}
      {conditionSuggestion && !readOnly && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          background: 'rgba(201, 168, 76, 0.1)',
          border: '1px solid var(--brass-dim)',
          borderRadius: 6,
        }}>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--brass)',
          }}>
            CAPTAIN REQUESTS: {conditionSuggestion.condition.toUpperCase()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={acceptCondition}
              style={{
                background: 'rgba(201, 168, 76, 0.2)',
                border: '1px solid var(--brass)',
                borderRadius: 3,
                padding: '3px 10px',
                color: 'var(--brass)',
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              ACCEPT
            </button>
            <button
              onClick={() => setConditionSuggestion(null)}
              style={{
                background: 'transparent',
                border: '1px solid var(--text-dim)',
                borderRadius: 3,
                padding: '3px 10px',
                color: 'var(--text-dim)',
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              OVERRIDE
            </button>
          </div>
        </div>
      )}

      {/* Top instrument row: Hull + System overview */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <InstrumentPanel label="Hull" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Gauge
            value={hullPct}
            size={100}
            label="HULL"
            accentColor="var(--station-accent)"
          />
        </InstrumentPanel>

        <InstrumentPanel label="Systems" style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
          {(['engines', 'sonar', 'shields', 'comms', 'lights'] as const).map((sys) => (
            <StatusLight
              key={sys}
              status={
                power.overheat[sys].state === 'failed' ? 'red' :
                power.overheat[sys].state === 'critical' ? 'red' :
                power.overheat[sys].state === 'warning' ? 'yellow' :
                power.allocations[sys] >= 1 ? 'green' : 'off'
              }
              size={10}
              label={sys.slice(0, 3)}
              pulse={power.overheat[sys].state === 'critical'}
            />
          ))}
        </InstrumentPanel>

        <InstrumentPanel label="Power Load" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Gauge
            value={(Object.values(power.allocations).reduce((a, b) => a + b, 0) + power.locked) / power.total}
            size={100}
            label="LOAD"
            accentColor="var(--copper)"
            zones={[
              { start: 0, end: 0.7, color: 'var(--status-green)' },
              { start: 0.7, end: 0.9, color: 'var(--status-yellow)' },
              { start: 0.9, end: 1, color: 'var(--status-red)' },
            ]}
          />
        </InstrumentPanel>
      </div>

      {/* Main power grid */}
      <InstrumentPanel label="Power Allocation">
        <PowerGrid
          power={power}
          onAllocate={handleAllocate}
          onVent={handleVent}
          onEmergencyPower={handleEmergencyPower}
          onRepair={handleRepair}
          readOnly={readOnly}
        />
      </InstrumentPanel>

      <style>{`
        @keyframes scope-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
