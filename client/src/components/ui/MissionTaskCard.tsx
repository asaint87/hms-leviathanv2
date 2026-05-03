import { useState, useEffect } from 'react';
import type { CrewTask } from '@leviathan/shared';

interface Props {
  task: CrewTask | null;
  stepId: string | null;
  onReady: () => void;
  missionBrief: string | null;
  missionName: string | null;
  onDismissBrief: () => void;
}

export function MissionTaskCard({ task, stepId, onReady, missionBrief, missionName, onDismissBrief }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  // Reset confirmed state when step changes
  useEffect(() => {
    setConfirmed(false);
  }, [stepId]);

  // Mission briefing overlay
  if (missionBrief) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'linear-gradient(0deg, rgba(10, 14, 20, 0.98), rgba(10, 14, 20, 0.9))',
        borderTop: '2px solid var(--brass-dim)',
        padding: '1.25rem 1.5rem',
        animation: 'task-slide-up 0.4s ease',
      }}>
        <div style={{
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--brass)',
          letterSpacing: '0.2em',
          marginBottom: 8,
        }}>
          MISSION BRIEFING — {missionName}
        </div>
        <div style={{
          fontSize: '0.9rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
          marginBottom: 12,
        }}>
          {missionBrief}
        </div>
        <div style={{
          fontSize: '0.6rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          fontStyle: 'italic',
        }}>
          Captain is reading the briefing. Stand by for orders.
        </div>

        <style>{`
          @keyframes task-slide-up {
            0% { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (!task || !stepId) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'linear-gradient(0deg, rgba(10, 14, 20, 0.98), rgba(10, 14, 20, 0.85))',
      borderTop: '2px solid var(--station-accent)',
      padding: '1rem 1.25rem',
      animation: 'task-slide-up 0.3s ease',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.55rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--station-accent)',
            letterSpacing: '0.2em',
            marginBottom: 4,
          }}>
            YOUR ORDERS
          </div>
          <div style={{
            fontSize: '0.95rem',
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}>
            {task.text}
          </div>
          {task.hint && (
            <div style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
              marginTop: 6,
              fontStyle: 'italic',
            }}>
              {task.hint}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setConfirmed(true);
            onReady();
          }}
          disabled={confirmed}
          style={{
            background: confirmed ? 'rgba(46, 204, 113, 0.15)' : 'rgba(201, 168, 76, 0.15)',
            border: `1.5px solid ${confirmed ? 'var(--status-green)' : 'var(--station-accent)'}`,
            borderRadius: 6,
            padding: '0.6rem 1.2rem',
            color: confirmed ? 'var(--status-green)' : 'var(--station-accent)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 'bold',
            letterSpacing: '0.15em',
            cursor: confirmed ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {confirmed ? 'READY' : 'REPORT READY'}
        </button>
      </div>

      <style>{`
        @keyframes task-slide-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
