import { useCallback, useEffect, useState } from 'react';
import type { Transmission, Contact } from '@leviathan/shared';
import { useWorldState } from '../../hooks/useWorldState';
import { useStationAudio } from '../../hooks/useStationAudio';
import { InstrumentPanel } from '../ui/InstrumentPanel';
import { StatusLight } from '../ui/StatusLight';
import { WaveformDisplay } from '../../displays/WaveformDisplay';
import { CipherPuzzle } from '../../displays/CipherPuzzle';

interface Props {
  socket: any;
  readOnly?: boolean;
}

const FACTION_COLORS: Record<string, string> = {
  corporate: '#4fc3f7',
  researcher: '#81c784',
  distress: '#e74c3c',
  leviathan: '#ce93d8',
};

export function Signals({ socket, readOnly = false }: Props) {
  const worldState = useWorldState();
  useStationAudio('signals');
  const [selectedTx, setSelectedTx] = useState<Transmission | null>(null);
  const [isScoped, setIsScoped] = useState(false);
  const [namingContact, setNamingContact] = useState<Contact | null>(null);
  const [contactName, setContactName] = useState('');

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

  const handleDecode = useCallback((transmissionId: string, answer: string) => {
    socket.emit('decode_transmission', { transmissionId, answer });
    setSelectedTx(null);
  }, [socket]);

  const handleNameContact = useCallback((contact: Contact) => {
    if (!contactName.trim()) return;
    socket.emit('name_contact', {
      contactId: contact.id,
      name: contactName.trim(),
      symbol: '\u2605',
    });
    setNamingContact(null);
    setContactName('');
  }, [socket, contactName]);

  const handleBoostRepair = useCallback(() => {
    socket.emit('boost_repair');
  }, [socket]);

  if (!worldState) return null;

  const { signals, power, sonar } = worldState;
  const commsLevel = power.allocations.comms;
  const trackedContacts = sonar.contacts.filter((c) => c.tracked && !c.namedBy);
  const undecodedCount = signals.incomingQueue.filter((t) => !t.decoded).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '0.5rem',
      padding: '0.5rem',
      position: 'relative',
    }}>
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

      {/* Status bar */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <InstrumentPanel label="Comms Power" style={{ padding: '0.4rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono)',
          }}>
            <StatusLight
              status={commsLevel >= 2 ? 'green' : commsLevel >= 1 ? 'yellow' : 'red'}
              size={10}
            />
            <span style={{ color: 'var(--station-accent)' }}>
              {['OFF', 'LOW', 'MED', 'HIGH'][commsLevel]}
            </span>
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Queue" style={{ padding: '0.4rem' }}>
          <div style={{
            fontSize: '1.2rem',
            fontFamily: 'var(--font-mono)',
            color: undecodedCount > 0 ? '#f1c40f' : 'var(--text-dim)',
            textAlign: 'center',
          }}>
            {undecodedCount}
            <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)', marginLeft: 4 }}>
              PENDING
            </span>
          </div>
        </InstrumentPanel>

        <InstrumentPanel label="Decoded" style={{ padding: '0.4rem' }}>
          <div style={{
            fontSize: '1.2rem',
            fontFamily: 'var(--font-mono)',
            color: '#2ecc71',
            textAlign: 'center',
          }}>
            {signals.decodedArchive.length}
            <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)', marginLeft: 4 }}>
              TOTAL
            </span>
          </div>
        </InstrumentPanel>

        {!readOnly && (
          <InstrumentPanel label="Tools" style={{ padding: '0.4rem' }}>
            <button
              onClick={handleBoostRepair}
              style={{
                background: 'rgba(79, 195, 247, 0.1)',
                border: '1px solid rgba(79, 195, 247, 0.3)',
                borderRadius: 4,
                padding: '4px 8px',
                color: '#4fc3f7',
                fontSize: '0.5rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              BOOST REPAIR
            </button>
          </InstrumentPanel>
        )}
      </div>

      {/* Waveform display */}
      <InstrumentPanel label="Signal Monitor">
        <WaveformDisplay
          transmissions={signals.incomingQueue}
          commsLevel={commsLevel}
          onSelect={(tx) => !readOnly && setSelectedTx(tx)}
          selectedId={selectedTx?.id || null}
        />
      </InstrumentPanel>

      {/* Selected transmission / cipher puzzle */}
      {selectedTx && !readOnly && (
        <CipherPuzzle
          transmission={selectedTx}
          commsLevel={commsLevel}
          onDecode={handleDecode}
        />
      )}

      {/* Creature ID — name tracked sonar contacts */}
      {!readOnly && trackedContacts.length > 0 && (
        <InstrumentPanel label="Creature ID Exchange">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <div style={{
              fontSize: '0.55rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
            }}>
              {trackedContacts.length} tracked contact{trackedContacts.length > 1 ? 's' : ''} awaiting identification
            </div>
            {trackedContacts.slice(0, 3).map((contact) => (
              <div key={contact.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 4,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: contact.type === 'friendly' ? '#2ecc71' : contact.type === 'danger' ? '#e74c3c' : '#f1c40f',
                }} />
                <span style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  flex: 1,
                }}>
                  {contact.type.toUpperCase()} — {contact.bearing.toFixed(0)}&deg; / {contact.distance.toFixed(0)}m
                </span>
                {namingContact?.id === contact.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNameContact(contact)}
                      placeholder="Name..."
                      maxLength={12}
                      style={{
                        width: 80,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--station-accent)',
                        borderRadius: 2,
                        padding: '2px 4px',
                        color: 'var(--text-primary)',
                        fontSize: '0.55rem',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleNameContact(contact)}
                      style={{
                        background: 'rgba(79, 195, 247, 0.15)',
                        border: '1px solid var(--station-accent)',
                        borderRadius: 2,
                        color: 'var(--station-accent)',
                        fontSize: '0.5rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      ID
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setNamingContact(contact);
                      setContactName('');
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--text-dim)',
                      borderRadius: 2,
                      color: 'var(--text-dim)',
                      fontSize: '0.5rem',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    NAME
                  </button>
                )}
              </div>
            ))}
          </div>
        </InstrumentPanel>
      )}

      {/* Decoded archive (scrollable) */}
      {signals.decodedArchive.length > 0 && (
        <InstrumentPanel label="Transmission Log" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflow: 'auto',
            maxHeight: 150,
          }}>
            {signals.decodedArchive.slice().reverse().map((tx) => (
              <div key={tx.id} style={{
                padding: '4px 6px',
                borderLeft: `2px solid ${FACTION_COLORS[tx.faction] || '#4fc3f7'}`,
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}>
                <span style={{ color: FACTION_COLORS[tx.faction], marginRight: 6 }}>
                  [{tx.faction.toUpperCase()}]
                </span>
                {tx.decodedContent?.slice(0, 80)}
              </div>
            ))}
          </div>
        </InstrumentPanel>
      )}

      <style>{`
        @keyframes scope-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
