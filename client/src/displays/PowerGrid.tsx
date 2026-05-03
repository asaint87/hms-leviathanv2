import { useCallback } from 'react';
import type { WorldState, PowerSystem } from '@leviathan/shared';
import { POWER_MAX_PER_SYSTEM } from '@leviathan/shared';

interface Props {
  power: WorldState['power'];
  onAllocate: (system: PowerSystem, units: number) => void;
  onVent: (system: PowerSystem) => void;
  onEmergencyPower: () => void;
  onRepair: (system: PowerSystem) => void;
  readOnly?: boolean;
}

const SYSTEMS: { key: PowerSystem; label: string; icon: string }[] = [
  { key: 'engines', label: 'ENGINES', icon: '\u2699' },    // gear
  { key: 'sonar', label: 'SONAR', icon: '\u25CE' },        // bullseye
  { key: 'shields', label: 'SHIELDS', icon: '\u25C8' },     // diamond
  { key: 'comms', label: 'COMMS', icon: '\u2637' },         // trigram
  { key: 'lights', label: 'LIGHTS', icon: '\u2600' },       // sun
];

const LEVEL_LABELS = ['OFF', 'LOW', 'MED', 'HIGH'];

export function PowerGrid({ power, onAllocate, onVent, onEmergencyPower, onRepair, readOnly = false }: Props) {
  const usedPower = Object.values(power.allocations).reduce((a, b) => a + b, 0);
  const budget = power.total - power.locked;
  const remaining = budget - usedPower;

  const handleBlockClick = useCallback((system: PowerSystem, blockIndex: number) => {
    if (readOnly) return;
    const current = power.allocations[system];
    const oh = power.overheat[system];

    if (oh.state === 'failed') return;

    // Click on filled block = remove it (and all above)
    // Click on empty block = fill up to it
    if (blockIndex < current) {
      onAllocate(system, blockIndex);
    } else {
      const needed = blockIndex + 1 - current;
      if (needed <= remaining) {
        onAllocate(system, blockIndex + 1);
      }
    }
  }, [power, remaining, readOnly, onAllocate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      width: '100%',
    }}>
      {/* Sub cross-section header */}
      <div style={{
        textAlign: 'center',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--bg-surface)',
        marginBottom: '0.25rem',
      }}>
        <span style={{
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.2em',
        }}>
          LIFE SUPPORT: {power.locked} UNITS (LOCKED)
        </span>
      </div>

      {/* System rows */}
      {SYSTEMS.map(({ key, label, icon }) => {
        const allocation = power.allocations[key];
        const oh = power.overheat[key];
        const isFailed = oh.state === 'failed';
        const isOverheating = oh.state === 'warning' || oh.state === 'critical';

        const stateColor =
          isFailed ? '#555' :
          oh.state === 'critical' ? 'var(--status-red)' :
          oh.state === 'warning' ? 'var(--status-yellow)' :
          'var(--station-accent)';

        return (
          <div key={key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.5rem',
            background: isFailed ? 'rgba(100,0,0,0.1)' : 'transparent',
            borderRadius: 4,
            animation: oh.state === 'critical' ? 'row-pulse 0.8s infinite' : 'none',
          }}>
            {/* System icon + label */}
            <div style={{
              width: 80,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: '1.1rem', opacity: isFailed ? 0.3 : 0.8 }}>{icon}</span>
              <span style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: stateColor,
                letterSpacing: '0.08em',
                fontWeight: 'bold',
              }}>
                {label}
              </span>
            </div>

            {/* Power blocks */}
            <div style={{ display: 'flex', gap: 5, flex: 1 }}>
              {Array.from({ length: POWER_MAX_PER_SYSTEM }, (_, i) => {
                const isFilled = i < allocation;
                const isAvailable = !isFilled && remaining > 0 && !isFailed;

                return (
                  <button
                    key={i}
                    onClick={() => handleBlockClick(key, i)}
                    disabled={readOnly || isFailed}
                    style={{
                      width: 36,
                      height: 32,
                      borderRadius: 4,
                      border: `1.5px solid ${isFilled ? stateColor : isAvailable ? 'var(--text-dim)' : 'var(--bg-surface)'}`,
                      background: isFilled
                        ? `linear-gradient(135deg, ${stateColor}cc, ${stateColor}66)`
                        : 'var(--bg-deep)',
                      cursor: readOnly || isFailed ? 'default' : 'pointer',
                      padding: 0,
                      outline: 'none',
                      boxShadow: isFilled
                        ? `0 0 10px ${stateColor}33, inset 0 1px 1px rgba(255,255,255,0.1)`
                        : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                      transition: 'all 0.12s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Glow effect on filled blocks */}
                    {isFilled && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `radial-gradient(circle at 50% 30%, ${stateColor}44, transparent 70%)`,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Level label */}
            <span style={{
              width: 32,
              fontSize: '0.55rem',
              fontFamily: 'var(--font-mono)',
              color: isFailed ? 'var(--status-red)' : 'var(--text-dim)',
              textAlign: 'center',
            }}>
              {isFailed ? 'FAIL' : LEVEL_LABELS[allocation]}
            </span>

            {/* Overheat indicator */}
            <div style={{ width: 50, display: 'flex', gap: 4, alignItems: 'center' }}>
              {isOverheating && !readOnly && (
                <button
                  onClick={() => onVent(key)}
                  style={{
                    background: 'rgba(231, 76, 60, 0.2)',
                    border: '1px solid var(--status-red)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    color: 'var(--status-red)',
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                  }}
                >
                  VENT
                </button>
              )}
              {isFailed && !readOnly && (
                <button
                  onClick={() => onRepair(key)}
                  style={{
                    background: 'rgba(52, 152, 219, 0.2)',
                    border: '1px solid var(--status-blue)',
                    borderRadius: 3,
                    padding: '2px 4px',
                    color: 'var(--status-blue)',
                    fontSize: '0.5rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                  }}
                >
                  REPAIR
                </button>
              )}
              {oh.state !== 'normal' && oh.state !== 'failed' && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: stateColor,
                  boxShadow: `0 0 6px ${stateColor}`,
                  animation: 'blink-warn 0.6s infinite',
                }} />
              )}
            </div>
          </div>
        );
      })}

      {/* Power pool summary + Emergency button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid var(--bg-surface)',
      }}>
        {/* Remaining blocks visual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
          }}>
            POOL
          </span>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: budget }, (_, i) => (
              <div key={i} style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: i < remaining
                  ? 'var(--station-accent)'
                  : 'var(--bg-surface)',
                border: `1px solid ${i < remaining ? 'var(--station-accent)' : 'var(--text-dim)'}33`,
                opacity: i < remaining ? 0.8 : 0.3,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
            color: remaining === 0 ? 'var(--status-yellow)' : 'var(--text-dim)',
          }}>
            {remaining} FREE
          </span>
        </div>

        {/* Emergency Power */}
        {!readOnly && (
          <button
            onClick={onEmergencyPower}
            disabled={power.emergencyPower.active || power.emergencyPower.cooldown}
            style={{
              background: power.emergencyPower.active
                ? 'rgba(231, 76, 60, 0.4)'
                : power.emergencyPower.cooldown
                ? 'rgba(100, 100, 100, 0.2)'
                : 'rgba(231, 76, 60, 0.15)',
              border: `2px solid ${power.emergencyPower.active ? 'var(--status-red)' : power.emergencyPower.cooldown ? '#555' : '#c0392b'}`,
              borderRadius: '50%',
              width: 48,
              height: 48,
              cursor: power.emergencyPower.active || power.emergencyPower.cooldown ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: power.emergencyPower.active
                ? '0 0 20px rgba(231, 76, 60, 0.5), inset 0 0 10px rgba(231, 76, 60, 0.3)'
                : '0 2px 4px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{
              fontSize: '0.5rem',
              fontFamily: 'var(--font-mono)',
              color: power.emergencyPower.cooldown ? '#555' : '#c0392b',
              fontWeight: 'bold',
              lineHeight: 1,
            }}>
              {power.emergencyPower.active
                ? `${Math.ceil(power.emergencyPower.timer)}s`
                : power.emergencyPower.cooldown
                ? `${Math.ceil(power.emergencyPower.timer)}s`
                : 'EMRG'}
            </span>
          </button>
        )}
      </div>

      {/* Emergency power state banner */}
      {power.emergencyPower.active && (
        <div style={{
          textAlign: 'center',
          padding: '0.3rem',
          background: 'rgba(231, 76, 60, 0.15)',
          borderRadius: 4,
          border: '1px solid rgba(231, 76, 60, 0.3)',
        }}>
          <span style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--status-red)',
            letterSpacing: '0.15em',
            animation: 'blink-warn 0.8s infinite',
          }}>
            EMERGENCY POWER ACTIVE — {Math.ceil(power.emergencyPower.timer)}s
          </span>
        </div>
      )}

      {power.emergencyPower.cooldown && (
        <div style={{
          textAlign: 'center',
          padding: '0.3rem',
          background: 'rgba(100, 100, 100, 0.1)',
          borderRadius: 4,
          border: '1px solid rgba(100, 100, 100, 0.2)',
        }}>
          <span style={{
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
            color: '#888',
            letterSpacing: '0.15em',
          }}>
            COOLDOWN — REDUCED POWER ({power.total} UNITS) — {Math.ceil(power.emergencyPower.timer)}s
          </span>
        </div>
      )}

      <style>{`
        @keyframes row-pulse {
          0%, 100% { background: rgba(231, 76, 60, 0.05); }
          50% { background: rgba(231, 76, 60, 0.15); }
        }
        @keyframes blink-warn {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
