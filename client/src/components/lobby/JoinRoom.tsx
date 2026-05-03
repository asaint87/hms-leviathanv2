import { useState } from 'react';

interface Props {
  socket: any;
  onJoined: (code: string, playerId: string) => void;
}

export function JoinRoom({ socket, onJoined }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);

  const handleJoin = () => {
    if (!name.trim() || !code.trim()) return;
    setWaiting(true);
    setError('');

    socket.once('room_joined', ({ playerId }: { playerId: string }) => {
      onJoined(code.toUpperCase().trim(), playerId);
    });

    socket.once('error', ({ message }: { message: string }) => {
      setError(message);
      setWaiting(false);
    });

    socket.emit('join_room', { code: code.toUpperCase().trim(), playerName: name.trim() });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        style={{
          background: 'var(--bg-surface)',
          border: 'var(--panel-border)',
          borderRadius: '4px',
          padding: '0.75rem 1rem',
          color: 'var(--text-primary)',
          fontSize: '1.1rem',
          fontFamily: 'var(--font-display)',
          textAlign: 'center',
          width: '16rem',
          outline: 'none',
        }}
      />
      <input
        type="text"
        placeholder="Room code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        maxLength={12}
        style={{
          background: 'var(--bg-surface)',
          border: 'var(--panel-border)',
          borderRadius: '4px',
          padding: '0.75rem 1rem',
          color: 'var(--brass-bright)',
          fontSize: '1.4rem',
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
          width: '16rem',
          letterSpacing: '0.2em',
          outline: 'none',
        }}
      />
      {error && (
        <p style={{ color: 'var(--status-red)', fontSize: '0.9rem' }}>{error}</p>
      )}
      <button
        onClick={handleJoin}
        disabled={!name.trim() || !code.trim() || waiting}
        style={{
          background: waiting ? 'var(--bg-surface)' : 'rgba(201, 168, 76, 0.15)',
          border: '1px solid var(--brass)',
          borderRadius: '4px',
          padding: '0.75rem 2rem',
          color: 'var(--brass)',
          fontSize: '1rem',
          fontFamily: 'var(--font-display)',
          cursor: waiting ? 'wait' : 'pointer',
          letterSpacing: '0.1em',
          transition: 'all 0.2s',
        }}
      >
        {waiting ? 'BOARDING...' : 'BOARD SUBMARINE'}
      </button>
    </div>
  );
}
