interface Props {
  depth: number;       // current depth in meters
  maxDepth?: number;
  safeMin?: number;    // safe range start
  safeMax?: number;    // safe range end
  height?: number;
  label?: string;
}

export function DepthBar({
  depth,
  maxDepth = 500,
  safeMin = 0,
  safeMax = 300,
  height = 200,
  label = 'DEPTH',
}: Props) {
  const pct = Math.min(1, Math.max(0, depth / maxDepth));
  const safeMinPct = safeMin / maxDepth;
  const safeMaxPct = safeMax / maxDepth;
  const barWidth = 24;

  const isInDanger = depth > safeMax || depth < safeMin;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <span style={{
        fontSize: '0.6rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        letterSpacing: '0.15em',
      }}>
        {label}
      </span>

      <div style={{
        width: barWidth + 30,
        height,
        position: 'relative',
      }}>
        {/* Track */}
        <div style={{
          position: 'absolute',
          left: 15,
          top: 0,
          width: barWidth,
          height: '100%',
          background: 'var(--bg-surface)',
          borderRadius: 4,
          border: '1px solid var(--brass-dim)',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
        }}>
          {/* Safe zone indicator */}
          <div style={{
            position: 'absolute',
            top: `${safeMinPct * 100}%`,
            bottom: `${(1 - safeMaxPct) * 100}%`,
            left: 0,
            right: 0,
            background: 'rgba(46, 204, 113, 0.1)',
            borderTop: '1px solid var(--status-green)',
            borderBottom: '1px solid var(--status-green)',
          }} />

          {/* Current depth fill */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${pct * 100}%`,
            background: isInDanger
              ? 'linear-gradient(180deg, rgba(231, 76, 60, 0.2), rgba(231, 76, 60, 0.4))'
              : 'linear-gradient(180deg, rgba(52, 152, 219, 0.15), rgba(52, 152, 219, 0.35))',
            transition: 'height 0.3s ease',
          }} />

          {/* Depth indicator line */}
          <div style={{
            position: 'absolute',
            top: `${pct * 100}%`,
            left: -2,
            right: -2,
            height: 2,
            background: isInDanger ? 'var(--status-red)' : 'var(--station-accent)',
            boxShadow: `0 0 6px ${isInDanger ? 'var(--status-red)' : 'var(--station-accent)'}`,
            transition: 'top 0.3s ease',
          }} />
        </div>

        {/* Depth value label */}
        <div style={{
          position: 'absolute',
          left: 15 + barWidth + 4,
          top: `${pct * 100}%`,
          transform: 'translateY(-50%)',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: isInDanger ? 'var(--status-red)' : 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          transition: 'top 0.3s ease',
        }}>
          {Math.round(depth)}m
        </div>

        {/* Scale marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <div key={frac} style={{
            position: 'absolute',
            left: 0,
            top: `${frac * 100}%`,
            width: 10,
            height: 1,
            background: 'var(--text-dim)',
          }} />
        ))}
      </div>
    </div>
  );
}
