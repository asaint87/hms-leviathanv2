interface Props {
  filled: number;      // how many blocks filled (0-3)
  max?: number;        // max blocks (default 3)
  label?: string;
  accentColor?: string;
  onAllocate?: (newCount: number) => void;
  disabled?: boolean;
  overheatState?: 'normal' | 'warning' | 'critical' | 'failed';
}

export function PowerBlock({
  filled,
  max = 3,
  label,
  accentColor = 'var(--station-accent)',
  onAllocate,
  disabled = false,
  overheatState = 'normal',
}: Props) {
  const blockSize = 28;
  const gap = 4;

  const overheatColor =
    overheatState === 'critical' ? 'var(--status-red)' :
    overheatState === 'warning' ? 'var(--status-yellow)' :
    overheatState === 'failed' ? '#666' :
    null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {label && (
        <span style={{
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: overheatColor || 'var(--text-secondary)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          width: 60,
          textAlign: 'right',
          animation: overheatState === 'critical' ? 'blink-warn 0.6s infinite' : 'none',
        }}>
          {label}
        </span>
      )}

      <div style={{ display: 'flex', gap }}>
        {Array.from({ length: max }, (_, i) => {
          const isFilled = i < filled;
          const blockColor = overheatColor || accentColor;

          return (
            <button
              key={i}
              onClick={() => onAllocate && !disabled && onAllocate(isFilled ? i : i + 1)}
              disabled={disabled || overheatState === 'failed'}
              style={{
                width: blockSize,
                height: blockSize,
                borderRadius: 3,
                border: `1px solid ${isFilled ? blockColor : 'var(--text-dim)'}`,
                background: isFilled
                  ? `linear-gradient(135deg, ${blockColor}cc, ${blockColor}88)`
                  : 'var(--bg-surface)',
                cursor: disabled || overheatState === 'failed' ? 'not-allowed' : 'pointer',
                padding: 0,
                outline: 'none',
                boxShadow: isFilled
                  ? `0 0 8px ${blockColor}44, inset 0 1px 1px rgba(255,255,255,0.1)`
                  : 'inset 0 1px 3px rgba(0,0,0,0.3)',
                transition: 'all 0.15s',
                opacity: overheatState === 'failed' ? 0.3 : 1,
              }}
            />
          );
        })}
      </div>

      {overheatState !== 'normal' && (
        <style>{`
          @keyframes blink-warn {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      )}
    </div>
  );
}
