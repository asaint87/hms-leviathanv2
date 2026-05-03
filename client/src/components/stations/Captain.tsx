import { useCallback, useState, useEffect, useRef } from 'react';
import type { Station, Condition } from '@leviathan/shared';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { TacticalOverview } from '../../displays/TacticalOverview';
import { Engineer } from './Engineer';
import { Sonar } from './Sonar';
import { Navigator } from './Navigator';
import { Signals } from './Signals';
import { WindowView } from '../../displays/WindowView';

interface Props {
  socket: any;
  readOnly?: boolean;
}

type CaptainMode = 'command' | 'scope' | 'window';

const CONDITIONS: { key: Condition; label: string; desc: string }[] = [
  { key: 'explore', label: 'EXPLORE', desc: 'Sonar high, engines low' },
  { key: 'alert', label: 'ALERT', desc: 'All systems balanced' },
  { key: 'combat', label: 'COMBAT', desc: 'Engines & shields high' },
];

const CREW_STATIONS: { key: Station; label: string; color: string }[] = [
  { key: 'sonar', label: 'Sonar', color: '#00e5ff' },
  { key: 'navigator', label: 'Navigator', color: '#d4a855' },
  { key: 'engineer', label: 'Engineer', color: '#d4915e' },
  { key: 'signals', label: 'Signals', color: '#4fc3f7' },
];

function ScopedStation({ station, socket }: { station: Station; socket: any }) {
  switch (station) {
    case 'engineer': return <Engineer socket={socket} readOnly />;
    case 'sonar': return <Sonar socket={socket} readOnly />;
    case 'navigator': return <Navigator socket={socket} readOnly />;
    case 'signals': return <Signals socket={socket} readOnly />;
    default: return null;
  }
}

export function Captain({ socket, readOnly = false }: Props) {
  const worldState = useWorldState();
  const { playCommend, playAlert, playPing } = useStationAudio('captain');
  const [mode, setMode] = useState<CaptainMode>('command');
  const [scopedStation, setScopedStation] = useState<Station | null>(null);
  const [flashUsedLocal, setFlashUsedLocal] = useState(false);
  const [captainPrompts, setCaptainPrompts] = useState<{ message: string; id: number }[]>([]);

  // Listen for captain prompts
  useEffect(() => {
    const onPrompt = ({ message }: { message: string }) => {
      const id = Date.now();
      setCaptainPrompts((prev) => [...prev.slice(-2), { message, id }]);
      playPing();
      setTimeout(() => {
        setCaptainPrompts((prev) => prev.filter((p) => p.id !== id));
      }, 8000);
    };
    socket.on('captain_prompt', onPrompt);
    return () => { socket.off('captain_prompt', onPrompt); };
  }, [socket, playPing]);

  const handleScope = useCallback((station: Station) => {
    setScopedStation(station);
    setMode('scope');
    socket.emit('scope_station', { station });
  }, [socket]);

  const handleUnscope = useCallback(() => {
    setScopedStation(null);
    setMode('command');
    socket.emit('unscope');
  }, [socket]);

  const handleSetCondition = useCallback((condition: Condition) => {
    socket.emit('set_condition', { condition });
  }, [socket]);

  const handleCommend = useCallback((station: Station) => {
    socket.emit('commend_station', { station });
    playCommend();
  }, [socket, playCommend]);

  const handleFlashAlert = useCallback((preset: string) => {
    socket.emit('flash_alert', { preset });
    playAlert();
    setFlashUsedLocal(true);
  }, [socket, playAlert]);

  if (!worldState) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Mode switcher bar */}
      {!readOnly && (
        <div style={{
          display: 'flex',
          borderBottom: 'var(--panel-border)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
        }}>
          {([
            { key: 'command' as CaptainMode, label: 'COMMAND', pct: '60%' },
            { key: 'scope' as CaptainMode, label: 'SCOPE', pct: '25%' },
            { key: 'window' as CaptainMode, label: 'WINDOW', pct: '15%' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'scope' && mode !== 'scope') {
                  // Open scope picker, don't switch yet
                  if (!scopedStation) {
                    // Show scope picker in command mode
                    setMode('command');
                  } else {
                    setMode('scope');
                  }
                  return;
                }
                if (key !== 'scope' && mode === 'scope') {
                  handleUnscope();
                }
                setMode(key);
              }}
              style={{
                flex: 1,
                padding: '0.4rem',
                background: mode === key ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: mode === key ? '2px solid var(--brass)' : '2px solid transparent',
                color: mode === key ? 'var(--brass)' : 'var(--text-dim)',
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Prompts overlay — visible in all modes */}
      {captainPrompts.length > 0 && (
        <div style={{
          padding: '0.5rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          flexShrink: 0,
          background: mode === 'scope' ? 'var(--bg-deep)' : 'transparent',
        }}>
          {captainPrompts.map(({ message, id }) => (
            <div key={id} style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              animation: 'prompt-in 0.3s ease',
            }}>
              {message}
            </div>
          ))}
        </div>
      )}

      {/* === COMMAND MODE === */}
      {mode === 'command' && (
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <InstrumentPanel label="Tactical Overview">
            <TacticalOverview worldState={worldState} />
          </InstrumentPanel>

          {/* Condition */}
          {!readOnly && (
            <InstrumentPanel label="Condition">
              <div style={{ display: 'flex', gap: 6 }}>
                {CONDITIONS.map(({ key, label, desc }) => {
                  const isActive = worldState.captain.condition === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSetCondition(key)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: isActive ? 'rgba(201, 168, 76, 0.15)' : 'var(--bg-deep)',
                        border: `1.5px solid ${isActive ? 'var(--brass)' : 'var(--bg-surface)'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: isActive ? 'var(--brass)' : 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.1em' }}>{label}</div>
                      <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{desc}</div>
                    </button>
                  );
                })}
              </div>
            </InstrumentPanel>
          )}

          {/* Crew — tap circle to commend, tap label to scope */}
          {!readOnly && (
            <InstrumentPanel label="Crew">
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                {CREW_STATIONS.map(({ key, label, color }) => {
                  const member = worldState.crew[key];
                  const isConnected = member?.connected;
                  return (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => isConnected && handleCommend(key)}
                        disabled={!isConnected || worldState.captain.commendsUsed >= 5}
                        style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: isConnected ? `rgba(${hexToRgb(color)}, 0.1)` : 'var(--bg-deep)',
                          border: `1.5px solid ${isConnected ? color : 'var(--text-dim)'}`,
                          cursor: isConnected ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s', opacity: isConnected ? 1 : 0.4,
                        }}
                      >
                        <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: isConnected ? color : 'var(--text-dim)', fontWeight: 'bold' }}>
                          {label.slice(0, 3).toUpperCase()}
                        </span>
                      </button>
                      <button
                        onClick={() => isConnected && handleScope(key)}
                        disabled={!isConnected}
                        style={{
                          background: 'none', border: 'none', cursor: isConnected ? 'pointer' : 'default',
                          fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                          padding: '2px 4px', borderRadius: 2,
                          textDecoration: 'underline',
                          opacity: isConnected ? 1 : 0.4,
                        }}
                      >
                        {member?.playerName?.slice(0, 8) || '---'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                <span>TAP CIRCLE: COMMEND ({5 - worldState.captain.commendsUsed})</span>
                <span>TAP NAME: SCOPE</span>
              </div>
            </InstrumentPanel>
          )}

          {/* Flash Alert */}
          {!readOnly && !worldState.captain.flashAlertUsed && !flashUsedLocal && (
            <InstrumentPanel label="Flash Alert" style={{ borderColor: 'rgba(231, 76, 60, 0.2)' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { preset: 'dive', label: 'DIVE NOW' },
                  { preset: 'hold', label: 'HOLD POSITION' },
                  { preset: 'eyes_sonar', label: 'EYES ON SONAR' },
                  { preset: 'brace', label: 'BRACE' },
                ].map(({ preset, label }) => (
                  <button
                    key={preset}
                    onClick={() => handleFlashAlert(preset)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      background: 'rgba(231, 76, 60, 0.1)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      borderRadius: 4, color: '#e74c3c',
                      fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                      cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 'bold',
                    }}
                  >{label}</button>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 6, fontSize: '0.45rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                ONE USE PER MISSION — ALL STATIONS RECEIVE
              </div>
            </InstrumentPanel>
          )}
        </div>
      )}

      {/* === SCOPE MODE === */}
      {mode === 'scope' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Scope station picker if none selected */}
          {!scopedStation ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '1rem',
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                SELECT STATION TO SCOPE
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {CREW_STATIONS.map(({ key, label, color }) => {
                  const member = worldState.crew[key];
                  const isConnected = member?.connected;
                  return (
                    <button
                      key={key}
                      onClick={() => isConnected && handleScope(key)}
                      disabled={!isConnected}
                      style={{
                        width: 80, height: 80, borderRadius: 8,
                        background: isConnected ? `rgba(${hexToRgb(color)}, 0.08)` : 'var(--bg-deep)',
                        border: `1.5px solid ${isConnected ? color : 'var(--text-dim)'}`,
                        cursor: isConnected ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        opacity: isConnected ? 1 : 0.3,
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color, fontWeight: 'bold' }}>
                        {label.slice(0, 3).toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.45rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        {member?.playerName?.slice(0, 8) || '---'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Scope header bar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.3rem 0.75rem',
                background: 'rgba(201, 168, 76, 0.05)',
                borderBottom: '1px solid rgba(201, 168, 76, 0.1)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--brass-dim)', letterSpacing: '0.15em' }}>
                    SCOPING
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                    color: CREW_STATIONS.find((s) => s.key === scopedStation)?.color || 'var(--brass)',
                    fontWeight: 'bold',
                  }}>
                    {scopedStation.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.55rem', color: 'var(--brass-dim)', fontFamily: 'var(--font-mono)' }}>
                    (VIEW ONLY)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Quick-switch to other stations */}
                  {CREW_STATIONS.filter((s) => s.key !== scopedStation).map(({ key, label, color }) => {
                    const member = worldState.crew[key];
                    return (
                      <button
                        key={key}
                        onClick={() => member?.connected && handleScope(key)}
                        disabled={!member?.connected}
                        style={{
                          background: 'transparent', border: `1px solid ${color}44`,
                          borderRadius: 3, padding: '2px 6px',
                          color: member?.connected ? color : 'var(--text-dim)',
                          fontSize: '0.5rem', fontFamily: 'var(--font-mono)',
                          cursor: member?.connected ? 'pointer' : 'default',
                          opacity: member?.connected ? 0.8 : 0.3,
                        }}
                      >
                        {label.slice(0, 3)}
                      </button>
                    );
                  })}
                  <button
                    onClick={handleUnscope}
                    style={{
                      background: 'rgba(201, 168, 76, 0.1)', border: '1px solid var(--brass-dim)',
                      borderRadius: 3, padding: '2px 8px',
                      color: 'var(--brass)', fontSize: '0.55rem', fontFamily: 'var(--font-mono)',
                      cursor: 'pointer', letterSpacing: '0.08em',
                    }}
                  >
                    EXIT
                  </button>
                </div>
              </div>

              {/* Scoped station rendered read-only */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <ScopedStation station={scopedStation} socket={socket} />
              </div>
            </>
          )}
        </div>
      )}

      {/* === WINDOW MODE === */}
      {mode === 'window' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <WindowView depth={worldState.sub.position.depth} velocity={worldState.sub.velocity} />
        </div>
      )}

      <style>{`
        @keyframes prompt-in {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
