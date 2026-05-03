interface Props {
  value: number;       // 0-1 normalized
  min?: number;
  max?: number;
  label?: string;
  zones?: { start: number; end: number; color: string }[];
  size?: number;
  accentColor?: string;
}

const DEFAULT_ZONES = [
  { start: 0, end: 0.6, color: 'var(--status-green)' },
  { start: 0.6, end: 0.85, color: 'var(--status-yellow)' },
  { start: 0.85, end: 1, color: 'var(--status-red)' },
];

export function Gauge({
  value,
  label,
  zones = DEFAULT_ZONES,
  size = 100,
  accentColor = 'var(--station-accent)',
}: Props) {
  const clampedValue = Math.max(0, Math.min(1, value));
  // Needle sweeps from -135deg to +135deg (270 degree arc)
  const needleAngle = -135 + clampedValue * 270;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const arcR = r * 0.75;

  function polarToCart(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(startAngle: number, endAngle: number, radius: number) {
    const start = polarToCart(endAngle, radius);
    const end = polarToCart(startAngle, radius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={describeArc(-135, 135, arcR)}
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth={size * 0.06}
          strokeLinecap="round"
        />

        {/* Zone arcs */}
        {zones.map((zone, i) => {
          const startAngle = -135 + zone.start * 270;
          const endAngle = -135 + zone.end * 270;
          return (
            <path
              key={i}
              d={describeArc(startAngle, endAngle, arcR)}
              fill="none"
              stroke={zone.color}
              strokeWidth={size * 0.04}
              strokeLinecap="round"
              opacity={0.5}
            />
          );
        })}

        {/* Tick marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const angle = -135 + (i / 10) * 270;
          const inner = polarToCart(angle, arcR - size * 0.08);
          const outer = polarToCart(angle, arcR - size * 0.02);
          return (
            <line
              key={i}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="var(--text-dim)"
              strokeWidth={i % 5 === 0 ? 1.5 : 0.75}
            />
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={polarToCart(needleAngle, arcR * 0.85).x}
          y2={polarToCart(needleAngle, arcR * 0.85).y}
          stroke={accentColor}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 3px ${accentColor})`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Center cap */}
        <circle cx={cx} cy={cy} r={size * 0.04} fill="var(--brass)" />
        <circle cx={cx} cy={cy} r={size * 0.025} fill="var(--brass-dim)" />
      </svg>

      {label && (
        <div style={{
          position: 'absolute',
          bottom: size * 0.12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: size * 0.09,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
