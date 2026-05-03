import { useState, useEffect } from 'react';
import type { Station } from '@leviathan/shared';
import { useSocket } from './hooks/useSocket';
import { useWorldStateListener, WorldStateContext } from './hooks/useWorldState';
import { useStationAudio } from './hooks/useStationAudio';
import { CreateRoom } from './components/lobby/CreateRoom';
import { JoinRoom } from './components/lobby/JoinRoom';
import { StationPicker } from './components/lobby/StationPicker';
import { StationView } from './components/stations/StationView';

type Screen = 'lobby' | 'station-picker' | 'station';

export function App() {
  const { socket, status, saveSession, clearSession } = useSocket();
  const worldState = useWorldStateListener(socket);
  const [screen, setScreen] = useState<Screen>('lobby');
  const [lobbyMode, setLobbyMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [station, setStation] = useState<Station | null>(null);

  // Check for saved session on load
  useEffect(() => {
    const saved = sessionStorage.getItem('leviathan_session');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.code && data.station && data.playerId) {
        setRoomCode(data.code);
        setPlayerId(data.playerId);
        setStation(data.station);
        setScreen('station');
      }
    }
  }, []);

  const handleRoomCreated = (code: string, pid: string) => {
    setRoomCode(code);
    setPlayerId(pid);
    setScreen('station-picker');
  };

  const handleRoomJoined = (code: string, pid: string) => {
    setRoomCode(code);
    setPlayerId(pid);
    setScreen('station-picker');
  };

  const handleStationClaimed = (s: Station) => {
    setStation(s);
    saveSession(roomCode, s, playerId);
    setScreen('station');
  };

  const handleLeaveRoom = () => {
    clearSession();
    setScreen('lobby');
    setLobbyMode('choose');
    setRoomCode('');
    setPlayerId('');
    setStation(null);
  };

  // Connection status indicator
  const statusColor =
    status === 'connected' ? 'var(--status-green)' :
    status === 'reconnecting' ? 'var(--status-yellow)' :
    status === 'disconnected' ? 'var(--status-red)' :
    'var(--text-dim)';

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      {/* Connection indicator */}
      <div style={{
        position: 'fixed',
        top: '0.75rem',
        right: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        zIndex: 100,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />
        <span style={{
          color: 'var(--text-dim)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
        }}>
          {status}
        </span>
      </div>

      {screen === 'lobby' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '2.5rem',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '3rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--brass)',
              textShadow: '0 0 20px rgba(201, 168, 76, 0.3)',
              letterSpacing: '0.15em',
            }}>
              HMS LEVIATHAN
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              marginTop: '0.5rem',
            }}>
              Dive stations ready. Awaiting crew.
            </p>
          </div>

          {lobbyMode === 'choose' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setLobbyMode('create')}
                style={{
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid var(--brass)',
                  borderRadius: '6px',
                  padding: '1rem 2rem',
                  color: 'var(--brass)',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                }}
              >
                NEW VOYAGE
              </button>
              <button
                onClick={() => setLobbyMode('join')}
                style={{
                  background: 'rgba(201, 168, 76, 0.05)',
                  border: '1px solid var(--brass-dim)',
                  borderRadius: '6px',
                  padding: '1rem 2rem',
                  color: 'var(--brass-dim)',
                  fontSize: '1rem',
                  fontFamily: 'var(--font-display)',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                }}
              >
                JOIN CREW
              </button>
            </div>
          )}

          {lobbyMode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <CreateRoom socket={socket} onCreated={handleRoomCreated} />
              <button
                onClick={() => setLobbyMode('choose')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  marginTop: '0.5rem',
                }}
              >
                Back
              </button>
            </div>
          )}

          {lobbyMode === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <JoinRoom socket={socket} onJoined={handleRoomJoined} />
              <button
                onClick={() => setLobbyMode('choose')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  marginTop: '0.5rem',
                }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      {screen === 'station-picker' && (
        <StationPicker
          socket={socket}
          roomCode={roomCode}
          onStationClaimed={handleStationClaimed}
        />
      )}

      {screen === 'station' && station && (
        <WorldStateContext.Provider value={{ worldState }}>
          <StationView
            station={station}
            roomCode={roomCode}
            socket={socket}
            onLeave={handleLeaveRoom}
          />
        </WorldStateContext.Provider>
      )}
    </div>
  );
}
