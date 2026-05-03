import { useState } from 'react';
import type { Transmission } from '@leviathan/shared';

interface Props {
  transmission: Transmission;
  commsLevel: number;
  onDecode: (transmissionId: string, answer: string) => void;
}

const FACTION_COLORS: Record<string, string> = {
  corporate: '#4fc3f7',
  researcher: '#81c784',
  distress: '#e74c3c',
  leviathan: '#ce93d8',
};

export function CipherPuzzle({ transmission, commsLevel, onDecode }: Props) {
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);

  const color = FACTION_COLORS[transmission.faction] || '#4fc3f7';

  // Decode speed based on comms power
  const speedLabel = commsLevel >= 3 ? 'FAST' : commsLevel >= 2 ? 'NORMAL' : 'SLOW';

  const handleSubmit = () => {
    if (!answer.trim()) return;
    onDecode(transmission.id, answer.trim());
    setAnswer('');
    setShowHint(false);
  };

  if (transmission.decoded) {
    return (
      <div style={{
        padding: '0.75rem',
        background: 'rgba(46, 204, 113, 0.05)',
        border: '1px solid rgba(46, 204, 113, 0.2)',
        borderRadius: 6,
      }}>
        <div style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color: '#2ecc71',
          letterSpacing: '0.15em',
          marginBottom: 4,
        }}>
          DECODED — CH{transmission.channel} — {transmission.faction.toUpperCase()}
        </div>
        <div style={{
          fontSize: '0.8rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}>
          {transmission.decodedContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '0.75rem',
      background: `rgba(${hexToRgb(color)}, 0.05)`,
      border: `1px solid ${color}33`,
      borderRadius: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          color,
          letterSpacing: '0.15em',
        }}>
          ENCRYPTED — CH{transmission.channel} — {transmission.faction.toUpperCase()}
        </span>
        <span style={{
          fontSize: '0.5rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
        }}>
          DECODE: {speedLabel}
        </span>
      </div>

      {/* Encrypted content */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: color,
        padding: '0.5rem',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 4,
        wordBreak: 'break-all',
        letterSpacing: '0.05em',
        lineHeight: 1.6,
        // Static overlay for low comms
        filter: commsLevel <= 1 ? 'blur(0.5px)' : 'none',
        opacity: commsLevel === 0 ? 0.3 : 1,
      }}>
        {transmission.content}
      </div>

      {/* Hint toggle */}
      <button
        onClick={() => setShowHint(!showHint)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          fontSize: '0.55rem',
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          padding: 0,
          textDecoration: 'underline',
        }}
      >
        {showHint ? 'HIDE HINT' : 'SHOW HINT'}
      </button>

      {showHint && (
        <div style={{
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          padding: '0.25rem 0',
        }}>
          Analysis suggests: check the pattern structure
        </div>
      )}

      {/* Answer input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Enter decoded message..."
          disabled={commsLevel === 0}
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${color}33`,
            borderRadius: 4,
            padding: '0.4rem 0.6rem',
            color: 'var(--text-primary)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || commsLevel === 0}
          style={{
            background: `rgba(${hexToRgb(color)}, 0.15)`,
            border: `1px solid ${color}`,
            borderRadius: 4,
            padding: '0.4rem 0.75rem',
            color,
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            cursor: answer.trim() ? 'pointer' : 'default',
            letterSpacing: '0.1em',
          }}
        >
          DECODE
        </button>
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
