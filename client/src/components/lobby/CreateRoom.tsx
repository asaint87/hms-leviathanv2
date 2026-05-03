import { useState } from 'react';

interface Props {
  socket: any;
  onCreated: (code: string, playerId: string) => void;
}

export function CreateRoom({ socket, onCreated }: Props) {
  const [name, setName] = useState('');
  const [waiting, setWaiting] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    setWaiting(true);

    socket.once('room_created', ({ code, playerId }: { code: string; playerId: string }) => {
      onCreated(code, playerId);
    });

    socket.emit('create_room', { playerName: name.trim() });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Your name (Captain)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
      <button
        onClick={handleCreate}
        disabled={!name.trim() || waiting}
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
        {waiting ? 'LAUNCHING...' : 'LAUNCH SUBMARINE'}
      </button>
    </div>
  );
}
