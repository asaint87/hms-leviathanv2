interface Props {
  on: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: number;
}

export function BrassToggle({ on, onToggle, label, disabled = false, size = 48 }: Props) {
  const trackW = size;
  const trackH = size * 0.5;
  const knobSize = trackH * 0.8;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: size * 0.15,
    }}>
      <button
        onClick={() => !disabled && onToggle(!on)}
        disabled={disabled}
        style={{
          width: trackW,
          height: trackH,
          borderRadius: trackH / 2,
          border: '1px solid var(--brass-dim)',
          background: on
            ? 'linear-gradient(180deg, var(--brass-dim) 0%, var(--brass) 100%)'
            : 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 0,
          outline: 'none',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.05)',
          transition: 'background 0.2s',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <div style={{
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: on
            ? 'radial-gradient(circle at 35% 35%, var(--brass-bright), var(--brass))'
            : 'radial-gradient(circle at 35% 35%, #555, #333)',
          position: 'absolute',
          top: (trackH - knobSize) / 2,
          left: on ? trackW - knobSize - (trackH - knobSize) / 2 : (trackH - knobSize) / 2,
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)',
        }} />
      </button>
      {label && (
        <span style={{
          fontSize: size * 0.22,
          fontFamily: 'var(--font-mono)',
          color: on ? 'var(--brass)' : 'var(--text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          transition: 'color 0.2s',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
