import { io } from 'socket.io-client';

// In production, the server serves both API and static client from the same origin,
// so an empty URL lets socket.io use window.location. In dev, hit the dev server.
const URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
