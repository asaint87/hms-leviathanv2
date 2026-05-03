import { useEffect, useState } from 'react';
import type { Station } from '@leviathan/shared';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { Engineer } from './Engineer';
import { Captain } from './Captain';
import { Sonar } from './Sonar';
import { Navigator } from './Navigator';
import { Signals } from './Signals';

interface Props {
  station: Station;
  roomCode: string;
  socket: any;
  onLeave: () => void;
  readOnly?: boolean;
}

// Placeholder for stations not yet built
function PlaceholderStation({ station }: { station: Station }) {
  const worldState = useWorldState();
  useStationAudio(station);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontFamily: 'var(--font-display)',
        color: 'var(--station-accent)',
        letterSpacing: '0.2em',
        textShadow: '0 0 20px currentColor',
      }}>
        {station.toUpperCase()}
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        Station under construction
      </p>
      {worldState && (
        <div style={{
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          textAlign: 'center',
          lineHeight: 1.8,
        }}>
          <div>HDG: {worldState.sub.heading}&deg; | DEPTH: {worldState.sub.position.depth.toFixed(0)}m</div>
          <div>HULL: {worldState.sub.hullIntegrity}% | CONTACTS: {worldState.sonar.contacts.length}</div>
        </div>
      )}
    </div>
  );
}

function StationContent({ station, socket, readOnly }: { station: Station; socket: any; readOnly: boolean }) {
  switch (station) {
    case 'engineer':
      return <Engineer socket={socket} readOnly={readOnly} />;
    case 'captain':
      return <Captain socket={socket} readOnly={readOnly} />;
    case 'sonar':
      return <Sonar socket={socket} readOnly={readOnly} />;
    case 'navigator':
      return <Navigator socket={socket} readOnly={readOnly} />;
    case 'signals':
      return <Signals socket={socket} readOnly={readOnly} />;
    default:
      return <PlaceholderStation station={station} />;
  }
}

export function StationView({ station, roomCode, socket, onLeave, readOnly = false }: Props) {
  const worldState = useWorldState();
  const [flashAlert, setFlashAlert] = useState<string | null>(null);

  // Listen for flash alerts
  useEffect(() => {
    const onFlashAlert = ({ message }: { message: string }) => {
      setFlashAlert(message);
      setTimeout(() => setFlashAlert(null), 3000);
    };
    socket.on('flash_alert', onFlashAlert);
    return () => { socket.off('flash_alert', onFlashAlert); };
  }, [socket]);

  if (!worldState) {
    return (
      <div
        data-station={station}
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--station-primary)',
          gap: '1rem',
        }}
      >
        <h1 style={{
          fontSize: '2rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--station-accent)',
          letterSpacing: '0.2em',
          textShadow: '0 0 30px currentColor',
        }}>
          {station.toUpperCase()}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Connecting to world state...
        </p>
      </div>
    );
  }

  return (
    <div
      data-station={station}
      style={{
        height: '100vh',
        background: 'var(--station-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Flash Alert overlay */}
      {flashAlert && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(231, 76, 60, 0.15)',
          zIndex: 200,
          animation: 'flash-overlay 0.3s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '2rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--status-red)',
            fontWeight: 'bold',
            letterSpacing: '0.2em',
            textShadow: '0 0 30px rgba(231, 76, 60, 0.8)',
            animation: 'flash-text 0.5s infinite',
          }}>
            {flashAlert}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        borderBottom: 'var(--panel-border)',
        background: 'var(--bg-panel)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.2em',
        }}>
          ROOM {roomCode}
        </div>
        <div style={{
          fontSize: '1rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--station-accent)',
          letterSpacing: '0.2em',
          textShadow: '0 0 10px currentColor',
        }}>
          {station.toUpperCase()}
        </div>
        {!readOnly && (
          <button
            onClick={onLeave}
            style={{
              background: 'none',
              border: '1px solid var(--text-dim)',
              borderRadius: '3px',
              padding: '0.25rem 0.5rem',
              color: 'var(--text-dim)',
              fontSize: '0.6rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            LEAVE
          </button>
        )}
      </div>

      {/* Station content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <StationContent station={station} socket={socket} readOnly={readOnly} />
      </div>

      <style>{`
        @keyframes flash-overlay {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes flash-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
