import type { WorldState, Station, PowerSystem } from '@leviathan/shared';
import { StatusLight } from '../components/ui/StatusLight';
import { Gauge } from '../components/ui/Gauge';

interface Props {
  worldState: WorldState;
}

const SYSTEM_LABELS: Record<PowerSystem, string> = {
  engines: 'ENG',
  sonar: 'SNR',
  shields: 'SHD',
  comms: 'COM',
  lights: 'LGT',
};

const STATION_LABELS: Record<Station, { label: string; color: string }> = {
  captain: { label: 'CPT', color: '#c9a84c' },
  sonar: { label: 'SNR', color: '#00e5ff' },
  navigator: { label: 'NAV', color: '#d4a855' },
  engineer: { label: 'ENG', color: '#d4915e' },
  signals: { label: 'SIG', color: '#4fc3f7' },
};

export function TacticalOverview({ worldState }: Props) {
  const { sub, power, sonar, captain, crew } = worldState;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      width: '100%',
    }}>
      {/* Sub status bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.5rem',
        background: 'var(--bg-deep)',
        borderRadius: 6,
        border: '1px solid var(--bg-surface)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--station-accent)' }}>
            {sub.heading}&deg;
          </div>
          <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            HEADING
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: 'var(--station-accent)' }}>
            {sub.position.depth.toFixed(0)}m
          </div>
          <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            DEPTH
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: sub.hullIntegrity < 50 ? 'var(--status-red)' : 'var(--station-accent)' }}>
            {sub.hullIntegrity}%
          </div>
          <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            HULL
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', color: sonar.contacts.length > 0 ? 'var(--status-yellow)' : 'var(--text-dim)' }}>
            {sonar.contacts.filter(c => c.pinged).length}
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              /{sonar.contacts.length}
            </span>
          </div>
          <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            CONTACTS
          </div>
        </div>
      </div>

      {/* System status bars */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '0.5rem',
        background: 'var(--bg-deep)',
        borderRadius: 6,
        border: '1px solid var(--bg-surface)',
      }}>
        <div style={{
          fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          marginBottom: 2,
        }}>
          POWER SYSTEMS
        </div>
        {(['engines', 'sonar', 'shields', 'comms', 'lights'] as const).map((sys) => {
          const allocation = power.allocations[sys];
          const oh = power.overheat[sys];
          const pct = allocation / 3;

          const barColor =
            oh.state === 'failed' ? 'var(--status-red)' :
            oh.state === 'critical' ? 'var(--status-red)' :
            oh.state === 'warning' ? 'var(--status-yellow)' :
            allocation >= 2 ? 'var(--status-green)' :
            allocation >= 1 ? 'var(--status-yellow)' :
            'var(--status-red)';

          return (
            <div key={sys} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 28,
                fontSize: '0.55rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)',
              }}>
                {SYSTEM_LABELS[sys]}
              </span>
              <div style={{
                flex: 1,
                height: 8,
                background: 'var(--bg-surface)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct * 100}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 4,
                  transition: 'width 0.3s, background 0.3s',
                  boxShadow: `0 0 4px ${barColor}66`,
                  animation: oh.state === 'critical' ? 'bar-pulse 0.5s infinite' : 'none',
                }} />
              </div>
              <StatusLight
                status={oh.state === 'failed' ? 'red' : oh.state !== 'normal' ? 'yellow' : 'off'}
                size={6}
                pulse={oh.state === 'critical'}
              />
            </div>
          );
        })}
      </div>

      {/* Crew status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.5rem',
        background: 'var(--bg-deep)',
        borderRadius: 6,
        border: '1px solid var(--bg-surface)',
      }}>
        {(['sonar', 'navigator', 'engineer', 'signals'] as const).map((st) => {
          const member = crew[st];
          const info = STATION_LABELS[st];

          return (
            <div key={st} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: member?.connected ? info.color : 'var(--text-dim)',
                boxShadow: member?.connected ? `0 0 6px ${info.color}` : 'none',
                opacity: member ? 1 : 0.3,
              }} />
              <span style={{
                fontSize: '0.5rem',
                fontFamily: 'var(--font-mono)',
                color: member?.connected ? info.color : 'var(--text-dim)',
                letterSpacing: '0.08em',
              }}>
                {info.label}
              </span>
              {member && (
                <span style={{
                  fontSize: '0.45rem',
                  color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {member.playerName.slice(0, 6)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Condition indicator */}
      <div style={{
        textAlign: 'center',
        padding: '0.3rem',
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        letterSpacing: '0.2em',
      }}>
        CONDITION: <span style={{ color: 'var(--station-accent)' }}>
          {captain.condition.toUpperCase()}
        </span>
      </div>

      <style>{`
        @keyframes bar-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
