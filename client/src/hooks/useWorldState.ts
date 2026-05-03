import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { WorldState } from '@leviathan/shared';
import type { Socket } from 'socket.io-client';

interface WorldStateContextValue {
  worldState: WorldState | null;
}

export const WorldStateContext = createContext<WorldStateContextValue>({ worldState: null });

export function useWorldState(): WorldState | null {
  return useContext(WorldStateContext).worldState;
}

export function useWorldStateListener(socket: Socket) {
  const [worldState, setWorldState] = useState<WorldState | null>(null);

  useEffect(() => {
    const onStateUpdate = ({ worldState }: { worldState: WorldState }) => {
      setWorldState(worldState);
    };

    socket.on('state_update' as any, onStateUpdate);
    return () => {
      socket.off('state_update' as any, onStateUpdate);
    };
  }, [socket]);

  return worldState;
}
