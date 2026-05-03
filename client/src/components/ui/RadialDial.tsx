interface Props {
  value: number;       // 0-359 degrees
  label?: string;
  size?: number;
  accentColor?: string;
  showCardinals?: boolean;
}

export function RadialDial({
  value,
  label,
  size = 120,
  accentColor = 'var(--station-accent)',
  showCardinals = true,
}: Props) {
  const r = size / 2;
  const innerR = r * 0.7;
  const tickR = r * 0.85;

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={r} cy={r} r={r * 0.9} fill="none" stroke="var(--brass-dim)" strokeWidth={1} opacity={0.5} />
        <circle cx={r} cy={r} r={innerR} fill="var(--bg-deep)" stroke="var(--bg-surface)" strokeWidth={1} />

        {/* Tick marks every 30 degrees */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 30;
          const rad = ((angle - 90) * Math.PI) / 180;
          const isMajor = angle % 90 === 0;
          const outerP = { x: r + tickR * Math.cos(rad), y: r + tickR * Math.sin(rad) };
          const innerP = {
            x: r + (isMajor ? innerR * 0.85 : innerR * 0.92) * Math.cos(rad),
            y: r + (isMajor ? innerR * 0.85 : innerR * 0.92) * Math.sin(rad),
          };
          return (
            <line
              key={i}
              x1={innerP.x} y1={innerP.y}
              x2={outerP.x} y2={outerP.y}
              stroke={isMajor ? 'var(--text-secondary)' : 'var(--text-dim)'}
              strokeWidth={isMajor ? 1.5 : 0.75}
            />
          );
        })}

        {/* Cardinal labels */}
        {showCardinals && ['N', 'E', 'S', 'W'].map((dir, i) => {
          const angle = i * 90;
          const rad = ((angle - 90) * Math.PI) / 180;
          const labelR = r * 0.6;
          return (
            <text
              key={dir}
              x={r + labelR * Math.cos(rad)}
              y={r + labelR * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={dir === 'N' ? accentColor : 'var(--text-dim)'}
              fontSize={size * 0.09}
              fontFamily="var(--font-mono)"
            >
              {dir}
            </text>
          );
        })}

        {/* Pointer / needle */}
        {(() => {
          const rad = ((value - 90) * Math.PI) / 180;
          const tipR = innerR * 0.8;
          return (
            <>
              <line
                x1={r} y1={r}
                x2={r + tipR * Math.cos(rad)}
                y2={r + tipR * Math.sin(rad)}
                stroke={accentColor}
                strokeWidth={2}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 4px ${accentColor})`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              <circle cx={r} cy={r} r={3} fill="var(--brass)" />
            </>
          );
        })()}
      </svg>

      {label && (
        <div style={{
          position: 'absolute',
          bottom: -size * 0.12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: size * 0.085,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
    </div>
  );
}
