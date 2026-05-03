import { useCallback, useEffect, useState } from 'react';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { Gauge } from '../ui/Gauge';
import { StatusLight } from '../ui/StatusLight';
import { DepthBar } from '../ui/DepthBar';
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
      height: '100%',
      padding: '0.5rem',
      gap: '0.5rem',
      position: 'relative',
    }}>
      {/* Captain hat icon */}
      {isScoped && (
        <div style={{
          position: 'fixed', top: 50, right: 12,
          fontSize: '1.5rem', opacity: 0.6,
          animation: 'scope-glow 2s ease-in-out infinite', zIndex: 50,
        }}>&#x1F3A9;</div>
      )}

      {/* Commend flash overlay */}
      {commendFlash && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(201, 168, 76, 0.08)',
          border: '2px solid rgba(201, 168, 76, 0.3)',
          borderRadius: 8, zIndex: 30, pointerEvents: 'none',
          animation: 'commend-fade 2s ease-out forwards',
        }} />
      )}

      {/* LEFT PANEL — ~1/3 width */}
      <div style={{
        width: '22%',
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <InstrumentPanel label="Sonar Power" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Gauge
            value={powerLevel / 3}
            size={110}
            accentColor="#00e5ff"
            label="POWER"
            zones={[
              { start: 0, end: 0.33, color: 'var(--status-red)' },
              { start: 0.33, end: 0.66, color: 'var(--status-yellow)' },
              { start: 0.66, end: 1, color: 'var(--status-green)' },
            ]}
          />
          <div style={{
            textAlign: 'center', marginTop: 8,
            fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: '#00e5ff',
          }}>
            {sonar.range}m
          </div>
          <div style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: '0.15em', textAlign: 'center',
          }}>
            RANGE
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Contacts" style={{ padding: '0.75rem' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            fontSize: '0.85rem', fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={sonar.contacts.length > 0 ? 'green' : 'off'} size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>{sonar.contacts.length}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>TOTAL</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={pingedCount > 0 ? 'yellow' : 'off'} size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>{pingedCount}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>IDENT</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <StatusLight status={trackedCount > 0 ? 'green' : 'off'} size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>{trackedCount}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.6rem' }}>TRACK</span>
            </div>
          </div>
        </InstrumentPanel>
      </div>

      {/* CENTER — Sonar sweep */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
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
        <div style={{
          fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)', marginTop: 4, textAlign: 'center',
        }}>
          TAP BLIP: PING &nbsp;|&nbsp; TAP AGAIN: TRACK
        </div>
      </div>

      {/* RIGHT PANEL — ~1/3 width */}
      <div style={{
        width: '22%',
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        <InstrumentPanel label="Depth" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <DepthBar depth={sub.position.depth} height={160} />
        </InstrumentPanel>

        <InstrumentPanel label="Heading" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontSize: '2rem', fontFamily: 'var(--font-mono)', color: '#00e5ff',
          }}>
            {sub.heading}&deg;
          </div>
          <div style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: '0.15em',
          }}>
            HEADING
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Speed" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#00e5ff',
          }}>
            {sub.velocity.toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', letterSpacing: '0.15em',
          }}>
            KNOTS
          </div>
        </InstrumentPanel>
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
