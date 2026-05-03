import { useState, useEffect } from 'react';
import type { Station } from '@leviathan/shared';
import { STATIONS } from '@leviathan/shared';

const STATION_INFO: Record<Station, { label: string; age: string; description: string; color: string }> = {
  captain: {
    label: 'CAPTAIN',
    age: 'Parent',
    description: 'Command the crew. Listen, decide, lead.',
    color: '#c9a84c',
  },
  sonar: {
    label: 'SONAR',
    age: 'Age 5+',
    description: 'Listen to the deep. Find what hides in the dark.',
    color: '#00e5ff',
  },
  navigator: {
    label: 'NAVIGATOR',
    age: 'Age 8+',
    description: 'Chart the course. Explore the unknown.',
    color: '#d4a855',
  },
  engineer: {
    label: 'ENGINEER',
    age: 'Age 8+',
    description: 'Keep the sub alive. Every watt matters.',
    color: '#d4915e',
  },
  signals: {
    label: 'SIGNALS',
    age: 'Age 10+',
    description: 'Decode transmissions. Unravel mysteries.',
    color: '#4fc3f7',
  },
};

interface Props {
  socket: any;
  roomCode: string;
  onStationClaimed: (station: Station) => void;
}

export function StationPicker({ socket, roomCode, onStationClaimed }: Props) {
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  useEffect(() => {
    const onClaimed = ({ station, playerName }: { station: Station; playerName: string }) => {
      setClaimed((prev) => ({ ...prev, [station]: playerName }));
    };

    socket.on('station_claimed', onClaimed);
    return () => { socket.off('station_claimed', onClaimed); };
  }, [socket]);

  const handleClaim = (station: Station) => {
    if (claimed[station]) return;
    socket.emit('claim_station', { station });

    socket.once('station_claimed', ({ station: s }: { station: Station }) => {
      onStationClaimed(s);
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100vh',
      padding: '2rem',
      gap: '1.5rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          letterSpacing: '0.2em',
          marginBottom: '0.5rem',
        }}>
          ROOM CODE
        </h2>
        <h1 style={{
          color: 'var(--brass-bright)',
          fontSize: '2.5rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.3em',
          textShadow: '0 0 20px rgba(201, 168, 76, 0.3)',
        }}>
          {roomCode}
        </h1>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
        Choose your station
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '24rem',
      }}>
        {STATIONS.map((station) => {
          const info = STATION_INFO[station];
          const isClaimed = !!claimed[station];

          return (
            <button
              key={station}
              onClick={() => handleClaim(station)}
              disabled={isClaimed}
              style={{
                background: isClaimed
                  ? 'var(--bg-surface)'
                  : `rgba(${hexToRgb(info.color)}, 0.08)`,
                border: `1px solid ${isClaimed ? 'var(--text-dim)' : info.color}`,
                borderRadius: '6px',
                padding: '1rem 1.25rem',
                cursor: isClaimed ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                opacity: isClaimed ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  color: info.color,
                  fontSize: '1.1rem',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.15em',
                  fontWeight: 'bold',
                }}>
                  {info.label}
                </span>
                <span style={{
                  color: 'var(--text-dim)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {isClaimed ? claimed[station] : info.age}
                </span>
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                marginTop: '0.25rem',
              }}>
                {info.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
