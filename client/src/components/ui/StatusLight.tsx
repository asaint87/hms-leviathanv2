interface Props {
  status: 'green' | 'yellow' | 'red' | 'off';
  size?: number;
  label?: string;
  pulse?: boolean;
}

const STATUS_COLORS = {
  green: 'var(--status-green)',
  yellow: 'var(--status-yellow)',
  red: 'var(--status-red)',
  off: 'var(--text-dim)',
};

export function StatusLight({ status, size = 16, label, pulse = false }: Props) {
  const color = STATUS_COLORS[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: size * 0.5,
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: status === 'off'
          ? 'var(--bg-surface)'
          : `radial-gradient(circle at 35% 35%, ${color}, ${color}88)`,
        boxShadow: status === 'off'
          ? 'inset 0 1px 3px rgba(0,0,0,0.5)'
          : `0 0 ${size * 0.5}px ${color}, inset 0 1px 2px rgba(255,255,255,0.2)`,
        border: `1px solid ${status === 'off' ? 'var(--text-dim)' : color}44`,
        animation: pulse && status !== 'off' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
      }} />
      {label && (
        <span style={{
          fontSize: size * 0.7,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      )}

      {pulse && (
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      )}
    </div>
  );
}
