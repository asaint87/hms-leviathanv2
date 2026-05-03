import { useCallback, useEffect, useState } from 'react';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { RadialDial } from '../ui/RadialDial';
import { Gauge } from '../ui/Gauge';
import { DepthBar } from '../ui/DepthBar';
import { NauticalChart } from '../../displays/NauticalChart';

interface Props {
  socket: any;
  readOnly?: boolean;
}

export function Navigator({ socket, readOnly = false }: Props) {
  const worldState = useWorldState();
  useStationAudio('navigator');
  const [isScoped, setIsScoped] = useState(false);

  useEffect(() => {
    const onScoped = () => setIsScoped(true);
    const onUnscoped = () => setIsScoped(false);
    socket.on('station_scoped', onScoped);
    socket.on('station_unscoped', onUnscoped);
    return () => {
      socket.off('station_scoped', onScoped);
      socket.off('station_unscoped', onUnscoped);
    };
  }, [socket]);

  const handlePlotCourse = useCallback((waypoints: { x: number; y: number }[]) => {
    socket.emit('plot_course', { waypoints });
  }, [socket]);

  const handleAdjustDepth = useCallback((depth: number) => {
    socket.emit('adjust_depth', { depth });
  }, [socket]);

  const handleDropBeacon = useCallback((x: number, y: number) => {
    socket.emit('drop_beacon', { x, y });
  }, [socket]);

  if (!worldState) return null;

  const { sub, navigation, power } = worldState;
  const enginePower = power.allocations.engines;
  const speedPct = sub.velocity / 1.5;
  const explored = navigation.revealedCells.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '0.5rem',
      padding: '0.5rem',
      position: 'relative',
    }}>
      {/* Captain hat */}
      {isScoped && (
        <div style={{
          position: 'fixed',
          top: 50,
          right: 12,
          fontSize: '1.5rem',
          opacity: 0.6,
          animation: 'scope-glow 2s ease-in-out infinite',
          zIndex: 50,
        }}>
          &#x1F3A9;
        </div>
      )}

      {/* Top instruments row — full width, large */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        width: '100%',
        flexShrink: 0,
      }}>
        <InstrumentPanel label="Compass" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
          <RadialDial
            value={sub.heading}
            size={120}
            accentColor="#d4a855"
          />
        </InstrumentPanel>

        <InstrumentPanel label="Speed" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
          <Gauge
            value={speedPct}
            size={120}
            label="KTS"
            accentColor="#d4a855"
            zones={[
              { start: 0, end: 0.5, color: 'var(--status-green)' },
              { start: 0.5, end: 0.8, color: 'var(--status-yellow)' },
              { start: 0.8, end: 1, color: 'var(--status-red)' },
            ]}
          />
        </InstrumentPanel>

        <InstrumentPanel label="Depth" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <DepthBar depth={sub.position.depth} height={120} />
            {!readOnly && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <button
                  onClick={() => handleAdjustDepth(Math.max(0, sub.position.depth - 25))}
                  style={depthBtnStyle}
                >
                  &#9650;
                </button>
                <span style={{
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#d4a855',
                  textAlign: 'center',
                }}>
                  {sub.position.depth.toFixed(0)}m
                </span>
                <button
                  onClick={() => handleAdjustDepth(Math.min(500, sub.position.depth + 25))}
                  style={depthBtnStyle}
                >
                  &#9660;
                </button>
              </div>
            )}
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Explored" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
          <div style={{
            fontSize: '2.5rem', fontFamily: 'var(--font-mono)', color: '#d4a855',
          }}>
            {explored}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}>
            SECTORS
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
            COURSE: {navigation.coursePath.length} WP
          </div>
        </InstrumentPanel>
      </div>

      {/* Main chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <InstrumentPanel label="Nautical Chart" style={{ height: '100%', padding: '0.25rem' }}>
          <NauticalChart
            sub={sub}
            navigation={navigation}
            enginePower={enginePower}
            onPlotCourse={handlePlotCourse}
            onAdjustDepth={handleAdjustDepth}
            onDropBeacon={handleDropBeacon}
            readOnly={readOnly}
          />
        </InstrumentPanel>
      </div>

      {/* Bottom position readout */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.55rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        padding: '0 0.25rem',
        flexShrink: 0,
      }}>
        <span>POS: {sub.position.x.toFixed(0)}, {sub.position.y.toFixed(0)}</span>
        <span>HDG: {sub.heading}&deg;</span>
        <span>ENG: {['OFF', 'LOW', 'MED', 'HIGH'][enginePower]}</span>
      </div>

      <style>{`
        @keyframes scope-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

const depthBtnStyle: React.CSSProperties = {
  background: 'rgba(212, 168, 85, 0.1)',
  border: '1px solid rgba(212, 168, 85, 0.3)',
  borderRadius: 3,
  color: '#d4a855',
  fontSize: '0.7rem',
  cursor: 'pointer',
  padding: '2px 8px',
  fontFamily: 'var(--font-mono)',
};
