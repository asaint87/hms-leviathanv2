import { useCallback, useState, useEffect } from 'react';
import type { Station, Condition, MissionStep, MissionState } from '@leviathan/shared';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { Gauge } from '../ui/Gauge';
import { StatusLight } from '../ui/StatusLight';
import { RadialDial } from '../ui/RadialDial';
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

const CONDITIONS: { key: Condition; label: string }[] = [
  { key: 'explore', label: 'EXPLORE' },
  { key: 'alert', label: 'ALERT' },
  { key: 'combat', label: 'COMBAT' },
];

const CREW_STATIONS: { key: Station; label: string; color: string; short: string }[] = [
  { key: 'sonar', label: 'Sonar', color: '#00e5ff', short: 'SNR' },
  { key: 'navigator', label: 'Navigator', color: '#d4a855', short: 'NAV' },
  { key: 'engineer', label: 'Engineer', color: '#d4915e', short: 'ENG' },
  { key: 'signals', label: 'Signals', color: '#4fc3f7', short: 'SIG' },
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

  // Mission state
  const [missionActive, setMissionActive] = useState(false);
  const [missionBrief, setMissionBrief] = useState<{ name: string; brief: string } | null>(null);
  const [currentStep, setCurrentStep] = useState<MissionStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [confirmedStations, setConfirmedStations] = useState<Station[]>([]);
  const [missionComplete, setMissionComplete] = useState(false);
  const [stepHistory, setStepHistory] = useState<{ say: string; hint?: string }[]>([]);

  // Listen for captain prompts
  useEffect(() => {
    const onPrompt = ({ message }: { message: string }) => {
      const id = Date.now();
      setCaptainPrompts((prev) => [...prev.slice(-2), { message, id }]);
      playPing();
      setTimeout(() => setCaptainPrompts((prev) => prev.filter((p) => p.id !== id)), 8000);
    };
    socket.on('captain_prompt', onPrompt);
    return () => { socket.off('captain_prompt', onPrompt); };
  }, [socket, playPing]);

  // Listen for mission events
  useEffect(() => {
    const onStarted = ({ missionName, brief }: { missionName: string; brief: string }) => {
      setMissionActive(true);
      setMissionBrief({ name: missionName, brief });
      setMissionComplete(false);
      setStepHistory([]);
    };

    const onStep = ({ step, stepIndex: si, totalSteps: ts, missionState }: {
      step: MissionStep; stepIndex: number; totalSteps: number; missionState: MissionState;
    }) => {
      setCurrentStep(step);
      setStepIndex(si);
      setTotalSteps(ts);
      setConfirmedStations(missionState.confirmedStations);
      setMissionBrief(null);
      // Add to history
      setStepHistory((prev) => [...prev, { say: step.captainSay, hint: step.captainHint }]);
    };

    const onCrewConfirmed = ({ station }: { station: Station }) => {
      setConfirmedStations((prev) => prev.includes(station) ? prev : [...prev, station]);
    };

    const onComplete = () => {
      setMissionComplete(true);
      setCurrentStep(null);
      setMissionActive(false);
    };

    socket.on('mission_started', onStarted);
    socket.on('mission_step', onStep);
    socket.on('mission_crew_confirmed', onCrewConfirmed);
    socket.on('mission_complete', onComplete);

    return () => {
      socket.off('mission_started', onStarted);
      socket.off('mission_step', onStep);
      socket.off('mission_crew_confirmed', onCrewConfirmed);
      socket.off('mission_complete', onComplete);
    };
  }, [socket]);

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

  const handleStartMission = useCallback(() => {
    socket.emit('start_mission', { missionId: 'sea-trial' });
  }, [socket]);

  const handleAdvance = useCallback(() => {
    socket.emit('advance_mission');
  }, [socket]);

  if (!worldState) return null;

  const { sub, power, sonar, captain } = worldState;

  // === SCOPE MODE ===
  if (mode === 'scope' && scopedStation) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.3rem 0.75rem', background: 'rgba(201, 168, 76, 0.05)',
          borderBottom: '1px solid rgba(201, 168, 76, 0.1)', flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--brass-dim)', letterSpacing: '0.15em' }}>
            SCOPING {scopedStation.toUpperCase()} (VIEW ONLY)
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {CREW_STATIONS.filter((s) => s.key !== scopedStation).map(({ key, short, color }) => {
              const member = worldState.crew[key];
              return (
                <button key={key} onClick={() => member?.connected && handleScope(key)}
                  disabled={!member?.connected}
                  style={{ background: 'transparent', border: `1px solid ${color}44`, borderRadius: 3, padding: '2px 6px',
                    color: member?.connected ? color : 'var(--text-dim)', fontSize: '0.5rem', fontFamily: 'var(--font-mono)',
                    cursor: member?.connected ? 'pointer' : 'default', opacity: member?.connected ? 0.8 : 0.3 }}>
                  {short}
                </button>
              );
            })}
            <button onClick={handleUnscope}
              style={{ background: 'rgba(201, 168, 76, 0.1)', border: '1px solid var(--brass-dim)', borderRadius: 3,
                padding: '2px 8px', color: 'var(--brass)', fontSize: '0.55rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
              EXIT
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ScopedStation station={scopedStation} socket={socket} />
        </div>
      </div>
    );
  }

  // === WINDOW MODE ===
  if (mode === 'window') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <button onClick={() => setMode('command')}
          style={{ position: 'absolute', top: 50, right: 12, zIndex: 50, background: 'rgba(201, 168, 76, 0.1)',
            border: '1px solid var(--brass-dim)', borderRadius: 3, padding: '4px 10px', color: 'var(--brass)',
            fontSize: '0.55rem', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
          COMMAND
        </button>
        <div style={{ flex: 1 }}>
          <WindowView depth={sub.position.depth} velocity={sub.velocity} />
        </div>
      </div>
    );
  }

  // === COMMAND MODE — Dense instrument layout with mission thread ===
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT: Instruments + Controls */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: '0.5rem',
        overflow: 'auto',
        minWidth: 0,
      }}>
        {/* Top row: key gauges */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <InstrumentPanel label="HDG" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
            <RadialDial value={sub.heading} size={90} accentColor="#c9a84c" />
          </InstrumentPanel>

          <InstrumentPanel label="HULL" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
            <Gauge value={sub.hullIntegrity / 100} size={90} label="HULL" accentColor="#c9a84c" />
          </InstrumentPanel>

          <InstrumentPanel label="DEPTH" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
            <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: '#c9a84c' }}>
              {sub.position.depth.toFixed(0)}
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>METERS</div>
          </InstrumentPanel>

          <InstrumentPanel label="CONTACTS" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}>
            <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: sonar.contacts.length > 0 ? '#f1c40f' : 'var(--text-dim)' }}>
              {sonar.contacts.filter(c => c.pinged).length}<span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/{sonar.contacts.length}</span>
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>ID / TOTAL</div>
          </InstrumentPanel>
        </div>

        {/* Power systems row */}
        <InstrumentPanel label="POWER SYSTEMS" style={{ padding: '0.4rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between' }}>
            {(['engines', 'sonar', 'shields', 'comms', 'lights'] as const).map((sys) => {
              const alloc = power.allocations[sys];
              const oh = power.overheat[sys];
              const pct = alloc / 3;
              const barColor = oh.state === 'failed' ? '#e74c3c' : oh.state !== 'normal' ? '#f1c40f' : alloc >= 2 ? '#2ecc71' : alloc >= 1 ? '#f1c40f' : '#e74c3c';

              return (
                <div key={sys} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.45rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                    {sys.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </InstrumentPanel>

        {/* Crew status + Condition */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <InstrumentPanel label="CREW" style={{ flex: 2, padding: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {CREW_STATIONS.map(({ key, short, color }) => {
                const member = worldState.crew[key];
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <button onClick={() => member?.connected && !readOnly && handleCommend(key)}
                      disabled={!member?.connected || readOnly || captain.commendsUsed >= 5}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: member?.connected ? `rgba(${hexToRgb(color)}, 0.12)` : 'var(--bg-deep)',
                        border: `1.5px solid ${member?.connected ? color : 'var(--text-dim)'}`,
                        cursor: member?.connected && !readOnly ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: member?.connected ? 1 : 0.3, padding: 0,
                      }}>
                      <span style={{ fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: member?.connected ? color : 'var(--text-dim)', fontWeight: 'bold' }}>
                        {short}
                      </span>
                    </button>
                    <button onClick={() => member?.connected && !readOnly && handleScope(key)}
                      disabled={!member?.connected || readOnly}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.4rem',
                        fontFamily: 'var(--font-mono)', cursor: member?.connected ? 'pointer' : 'default', padding: 0,
                        textDecoration: 'underline', opacity: member?.connected ? 1 : 0.3 }}>
                      {member?.playerName?.slice(0, 6) || '---'}
                    </button>
                  </div>
                );
              })}
            </div>
          </InstrumentPanel>

          <InstrumentPanel label="CONDITION" style={{ flex: 1, padding: '0.4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {CONDITIONS.map(({ key, label }) => {
                const isActive = captain.condition === key;
                return (
                  <button key={key} onClick={() => !readOnly && handleSetCondition(key)} disabled={readOnly}
                    style={{
                      padding: '0.25rem', background: isActive ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
                      border: `1px solid ${isActive ? 'var(--brass)' : 'var(--bg-surface)'}`,
                      borderRadius: 3, color: isActive ? 'var(--brass)' : 'var(--text-dim)',
                      fontSize: '0.55rem', fontFamily: 'var(--font-mono)', cursor: readOnly ? 'default' : 'pointer',
                      letterSpacing: '0.1em', fontWeight: isActive ? 'bold' : 'normal',
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </InstrumentPanel>
        </div>

        {/* Mode switcher + Flash Alert */}
        {!readOnly && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={() => setMode('window')}
              style={{ flex: 1, padding: '0.4rem', background: 'rgba(52, 152, 219, 0.08)', border: '1px solid rgba(52, 152, 219, 0.2)',
                borderRadius: 4, color: '#3498db', fontSize: '0.55rem', fontFamily: 'var(--font-mono)', cursor: 'pointer', letterSpacing: '0.1em' }}>
              WINDOW
            </button>

            {!captain.flashAlertUsed && !flashUsedLocal && (
              <div style={{ flex: 2, display: 'flex', gap: 3 }}>
                {[
                  { preset: 'dive', label: 'DIVE' },
                  { preset: 'hold', label: 'HOLD' },
                  { preset: 'eyes_sonar', label: 'SONAR' },
                  { preset: 'brace', label: 'BRACE' },
                ].map(({ preset, label }) => (
                  <button key={preset} onClick={() => handleFlashAlert(preset)}
                    style={{ flex: 1, padding: '0.3rem', background: 'rgba(231, 76, 60, 0.08)', border: '1px solid rgba(231, 76, 60, 0.3)',
                      borderRadius: 3, color: '#e74c3c', fontSize: '0.45rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                      fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Mission Thread Panel */}
      <div style={{
        width: 280,
        minWidth: 240,
        borderLeft: 'var(--panel-border)',
        background: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--bg-surface)',
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--brass)',
          letterSpacing: '0.2em',
        }}>
          MISSION THREAD
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem 0.75rem' }}>
          {/* Captain prompts from game events */}
          {captainPrompts.map(({ message, id }) => (
            <div key={id} style={{
              padding: '0.5rem', marginBottom: '0.4rem',
              background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.15)',
              borderRadius: 4, fontSize: '0.7rem', fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)', lineHeight: 1.5, animation: 'prompt-in 0.3s ease',
            }}>
              {message}
            </div>
          ))}

          {/* No mission — show start button */}
          {!missionActive && !missionBrief && !currentStep && !missionComplete && !readOnly && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', paddingTop: '2rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center', lineHeight: 1.6 }}>
                All stations manned.<br/>Ready to begin Sea Trial.
              </div>
              <button onClick={handleStartMission}
                style={{
                  padding: '0.75rem 1.5rem', background: 'rgba(201, 168, 76, 0.12)',
                  border: '1.5px solid var(--brass)', borderRadius: 6, color: 'var(--brass)',
                  fontSize: '0.8rem', fontFamily: 'var(--font-display)', cursor: 'pointer',
                  letterSpacing: '0.15em', fontWeight: 'bold',
                }}>
                BEGIN SEA TRIAL
              </button>
            </div>
          )}

          {/* Mission briefing */}
          {missionBrief && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--brass)',
                letterSpacing: '0.2em', textAlign: 'center', paddingTop: '0.5rem',
              }}>
                {missionBrief.name}
              </div>
              <div style={{
                padding: '0.75rem', background: 'rgba(201, 168, 76, 0.06)',
                border: '1px solid var(--brass-dim)', borderRadius: 6,
                fontSize: '0.8rem', fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)', lineHeight: 1.7, fontStyle: 'italic',
              }}>
                "{missionBrief.brief}"
              </div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                Read this aloud to your crew, then tap CONTINUE.
              </div>
              <button onClick={handleAdvance}
                style={{
                  padding: '0.5rem', background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid var(--brass)', borderRadius: 4, color: 'var(--brass)',
                  fontSize: '0.65rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                  letterSpacing: '0.15em', alignSelf: 'center',
                }}>
                CONTINUE
              </button>
            </div>
          )}

          {/* Active step */}
          {currentStep && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Step counter */}
              <div style={{
                fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                letterSpacing: '0.15em', textAlign: 'center',
              }}>
                STEP {stepIndex + 1} OF {totalSteps}
              </div>

              {/* Captain's line — the main prompt */}
              <div style={{
                padding: '0.75rem', background: 'rgba(201, 168, 76, 0.08)',
                border: '1.5px solid var(--brass-dim)', borderRadius: 6,
                fontSize: '0.85rem', fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)', lineHeight: 1.6,
              }}>
                "{currentStep.captainSay}"
              </div>

              {/* Captain hint */}
              {currentStep.captainHint && (
                <div style={{
                  padding: '0.4rem 0.6rem', background: 'rgba(201, 168, 76, 0.03)',
                  borderRadius: 4, fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.5,
                }}>
                  {currentStep.captainHint}
                </div>
              )}

              {/* Crew confirmation status */}
              {currentStep.waitFor.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                    AWAITING CONFIRMATION:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {currentStep.waitFor.map((st) => {
                      const isConfirmed = confirmedStations.includes(st);
                      const info = CREW_STATIONS.find((c) => c.key === st);
                      return (
                        <div key={st} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 3,
                          background: isConfirmed ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isConfirmed ? '#2ecc71' : 'var(--bg-surface)'}`,
                        }}>
                          <StatusLight status={isConfirmed ? 'green' : 'off'} size={6} />
                          <span style={{
                            fontSize: '0.5rem', fontFamily: 'var(--font-mono)',
                            color: isConfirmed ? '#2ecc71' : 'var(--text-dim)',
                          }}>
                            {info?.short || st.toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Captain advance button */}
              {currentStep.requireCaptainAdvance && (
                <button onClick={handleAdvance}
                  disabled={currentStep.waitFor.length > 0 && !currentStep.waitFor.every((s) => confirmedStations.includes(s))}
                  style={{
                    padding: '0.5rem', marginTop: '0.25rem',
                    background: currentStep.waitFor.every((s) => confirmedStations.includes(s))
                      ? 'rgba(201, 168, 76, 0.15)' : 'rgba(100,100,100,0.1)',
                    border: `1px solid ${currentStep.waitFor.every((s) => confirmedStations.includes(s)) ? 'var(--brass)' : 'var(--text-dim)'}`,
                    borderRadius: 4,
                    color: currentStep.waitFor.every((s) => confirmedStations.includes(s)) ? 'var(--brass)' : 'var(--text-dim)',
                    fontSize: '0.65rem', fontFamily: 'var(--font-mono)', cursor: 'pointer',
                    letterSpacing: '0.15em', alignSelf: 'center',
                  }}>
                  CONTINUE
                </button>
              )}
            </div>
          )}

          {/* Mission complete */}
          {missionComplete && (
            <div style={{
              textAlign: 'center', paddingTop: '2rem',
              fontSize: '0.75rem', fontFamily: 'var(--font-display)',
              color: 'var(--status-green)',
            }}>
              Sea Trial Complete. Well done, Captain.
            </div>
          )}

          {/* Step history (faded, scrollable) */}
          {stepHistory.length > 1 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--bg-surface)', paddingTop: '0.5rem' }}>
              <div style={{ fontSize: '0.45rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: 4 }}>
                LOG
              </div>
              {stepHistory.slice(0, -1).reverse().map((entry, i) => (
                <div key={i} style={{
                  padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)',
                  fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)',
                  lineHeight: 1.4, opacity: 0.6,
                }}>
                  {entry.say.slice(0, 80)}...
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
