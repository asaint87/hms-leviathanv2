import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label?: string;
  style?: CSSProperties;
}

export function InstrumentPanel({ children, label, style }: Props) {
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: 'var(--panel-border)',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: 'var(--panel-shadow)',
      position: 'relative',
      ...style,
    }}>
      {/* Corner rivets */}
      {[
        { top: 6, left: 6 },
        { top: 6, right: 6 },
        { bottom: 6, left: 6 },
        { bottom: 6, right: 6 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          ...pos,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--brass-dim)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.4)',
        } as CSSProperties} />
      ))}

      {label && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: 16,
          background: 'var(--bg-panel)',
          padding: '0 6px',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}

      {children}
    </div>
  );
}
