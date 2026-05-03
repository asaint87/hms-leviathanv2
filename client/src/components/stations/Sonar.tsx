import { useCallback, useEffect, useState } from 'react';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { Gauge } from '../ui/Gauge';
import { StatusLight } from '../ui/StatusLight';
import { SonarSweep } from '../../displays/SonarSweep';

interface Props {
  socket: any;
  readOnly?: boolean;
}

export function Sonar({ socket, readOnly = false }: Props) {
  const worldState = useWorldState();
  const { playPing, playCommend } = useStationAudio('sonar');
  const [isScoped, setIsScoped] = useState(false);
  const [commendFlash, setCommendFlash] = useState(false);
  const [commendBoost, setCommendBoost] = useState(false);

  useEffect(() => {
    const onScoped = () => setIsScoped(true);
    const onUnscoped = () => setIsScoped(false);
    const onCommended = () => {
      playCommend();
      setCommendFlash(true);
      setCommendBoost(true);
      setTimeout(() => setCommendFlash(false), 2000);
      // Boost lasts 60 seconds
      setTimeout(() => setCommendBoost(false), 60000);
    };

    socket.on('station_scoped', onScoped);
    socket.on('station_unscoped', onUnscoped);
    socket.on('commended', onCommended);

    return () => {
      socket.off('station_scoped', onScoped);
      socket.off('station_unscoped', onUnscoped);
      socket.off('commended', onCommended);
    };
  }, [socket, playCommend]);

  const handlePing = useCallback((contactId: string) => {
    socket.emit('ping_contact', { contactId });
    playPing();
  }, [socket, playPing]);

  const handleTrack = useCallback((contactId: string) => {
    socket.emit('track_contact', { contactId });
  }, [socket]);

  const handleUntrack = useCallback((contactId: string) => {
    socket.emit('untrack_contact', { contactId });
  }, [socket]);

  if (!worldState) return null;

  const { sonar, power, sub } = worldState;
  const powerLevel = power.allocations.sonar;
  const trackedCount = sonar.contacts.filter((c) => c.tracked).length;
  const pingedCount = sonar.contacts.filter((c) => c.pinged).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '0.5rem',
      padding: '0.5rem',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Captain hat icon */}
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

      {/* Commend flash overlay */}
      {commendFlash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(201, 168, 76, 0.08)',
          border: '2px solid rgba(201, 168, 76, 0.3)',
          borderRadius: 8,
          zIndex: 30,
          pointerEvents: 'none',
          animation: 'commend-fade 2s ease-out forwards',
        }} />
      )}

      {/* Top instruments row */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        width: '100%',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <InstrumentPanel label="Power" style={{ padding: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge
              value={powerLevel / 3}
              size={60}
              accentColor="#00e5ff"
              zones={[
                { start: 0, end: 0.33, color: 'var(--status-red)' },
                { start: 0.33, end: 0.66, color: 'var(--status-yellow)' },
                { start: 0.66, end: 1, color: 'var(--status-green)' },
              ]}
            />
            <div style={{
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              lineHeight: 1.8,
            }}>
              <div style={{ color: '#00e5ff' }}>{sonar.range}m</div>
              <div>RANGE</div>
            </div>
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Contacts" style={{ padding: '0.5rem' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={sonar.contacts.length > 0 ? 'green' : 'off'} size={8} />
              <span style={{ color: 'var(--text-secondary)' }}>{sonar.contacts.length} TOTAL</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={pingedCount > 0 ? 'yellow' : 'off'} size={8} />
              <span style={{ color: 'var(--text-secondary)' }}>{pingedCount} IDENT</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={trackedCount > 0 ? 'green' : 'off'} size={8} />
              <span style={{ color: 'var(--text-secondary)' }}>{trackedCount} TRACK</span>
            </div>
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Depth" style={{ padding: '0.5rem' }}>
          <div style={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ fontSize: '1.4rem', color: '#00e5ff' }}>
              {sub.position.depth.toFixed(0)}
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
              METERS
            </div>
          </div>
        </InstrumentPanel>
      </div>

      {/* Main sonar display */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 0,
      }}>
        <SonarSweep
          contacts={sonar.contacts}
          range={sonar.range}
          heading={sub.heading}
          onPing={handlePing}
          onTrack={handleTrack}
          onUntrack={handleUntrack}
          readOnly={readOnly}
          commendBoost={commendBoost}
        />
      </div>

      {/* Bottom info bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 500,
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        padding: '0.25rem 0.5rem',
      }}>
        <span>TAP: PING | SELECT+TAP: TRACK</span>
        <span>HDG: {sub.heading}&deg;</span>
      </div>

      <style>{`
        @keyframes scope-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes commend-fade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
