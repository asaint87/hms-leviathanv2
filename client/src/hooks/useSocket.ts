import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@leviathan/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

let sharedSocket: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!sharedSocket) {
    sharedSocket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef<TypedSocket>(getSocket());
  const [status, setStatus] = useState<ConnectionStatus>(
    socketRef.current.connected ? 'connected' : 'connecting'
  );

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onReconnect = () => {
      setStatus('connected');
      // Attempt to rejoin room if we have session data
      const saved = sessionStorage.getItem('leviathan_session');
      if (saved) {
        const { code, station, playerId } = JSON.parse(saved);
        if (code && station && playerId) {
          socket.emit('rejoin_room', { code, station, playerId });
        }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  const saveSession = useCallback((code: string, station: string, playerId: string) => {
    sessionStorage.setItem('leviathan_session', JSON.stringify({ code, station, playerId }));
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('leviathan_session');
  }, []);

  return {
    socket: socketRef.current,
    status,
    saveSession,
    clearSession,
  };
}
