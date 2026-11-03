import { io } from 'socket.io-client';
import { tokens } from './api.js';

let socket = null;

/** One shared connection. The token is read on every (re)connect so refreshed tokens are picked up. */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      auth: (cb) => cb({ token: tokens.access }),
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
