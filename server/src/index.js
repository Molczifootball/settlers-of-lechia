const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const RM = require('./RoomManager');
const { findBotMove } = require('./Bot');
const { publicVictoryPoints } = require('./GameState');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.get('/health', (_, res) => res.json({ ok: true }));

// In production, serve the built client from server/../client/dist
const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback — serve index.html for any non-API GET
  app.get(/^(?!\/(socket\.io|health)).*/, (_, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
  console.log(`Serving client from ${CLIENT_DIST}`);
}

// Sanitize state per viewer — hide opponents' resources, dev cards, VP.
function sanitizeFor(state, viewerId) {
  if (!state) return state;
  return {
    ...state,
    players: state.players.map(p => {
      if (p.id === viewerId || state.winner) return p;
      // Hide individual resources/dev cards from opponents
      const totalRes = Object.values(p.resources).reduce((a, b) => a + b, 0);
      const totalDev = p.devCards.length;
      return {
        ...p,
        resources: { _hidden: true, total: totalRes },
        devCards: { _hidden: true, total: totalDev, knightsPlayed: p.knightsPlayed },
        victoryPoints: publicVictoryPoints(p),
      };
    }),
  };
}

function broadcastState(roomId) {
  const room = RM.getRoom(roomId);
  if (!room?.state) return;
  io.in(roomId).fetchSockets().then(sockets => {
    sockets.forEach(s => {
      s.emit('game:stateUpdate', { state: sanitizeFor(room.state, s.id) });
    });
  });
}

// Turn timer — auto-skip after TURN_TIMEOUT_MS if active player is idle
const TURN_TIMEOUT_MS = 120 * 1000;
setInterval(() => {
  RM.listRooms().forEach((room, roomId) => {
    const state = room.state;
    if (!state || state.winner) return;
    if (state.phase !== 'main' || !state.turnStart) return;
    const cur = state.players[state.turn];
    if (!cur || cur.isBot) return;
    const elapsed = Date.now() - state.turnStart;
    if (elapsed > TURN_TIMEOUT_MS) {
      console.log(`[timer] auto-ending turn in ${roomId} for ${cur.name}`);
      const r = RM.handleEndTurn(roomId, cur.id, { force: true });
      if (!r.error) broadcastState(roomId);
    }
  });
}, 5000);

// Drive bots (poll-based after each state change)
function driveBots(roomId) {
  const room = RM.getRoom(roomId);
  if (!room?.state || room.state.winner) return;
  const state = room.state;
  const cur = state.players[state.turn];

  // Discard awaiting includes bots
  if (state.pendingAction?.type === 'discard') {
    const botEntry = state.pendingAction.awaiting.find(a => {
      const p = state.players.find(pl => pl.id === a.playerId);
      return p?.isBot;
    });
    if (botEntry) {
      const bot = state.players.find(p => p.id === botEntry.playerId);
      const move = findBotMove(state, bot);
      if (move?.type === 'discard') {
        setTimeout(() => {
          const r = RM.handleDiscard(roomId, bot.id, move.discarded);
          if (!r.error) { broadcastState(roomId); driveBots(roomId); }
        }, 600);
      }
      return;
    }
  }

  // Trade pending — bot targets respond
  if (state.activeTrade) {
    const botTargets = state.activeTrade.targets.filter(tid => {
      const p = state.players.find(pl => pl.id === tid);
      return p?.isBot && state.activeTrade.from !== tid && !state.activeTrade.responses[tid];
    });
    if (botTargets.length > 0) {
      const bot = state.players.find(p => p.id === botTargets[0]);
      const move = findBotMove(state, bot);
      if (move?.type === 'respondTrade') {
        setTimeout(() => {
          const r = RM.handleRespondTrade(roomId, bot.id, { accept: move.accept });
          if (!r.error) { broadcastState(roomId); driveBots(roomId); }
        }, 700);
      }
      return;
    }
  }

  if (!cur?.isBot) return;
  const move = findBotMove(state, cur);
  if (!move) return;

  setTimeout(() => {
    let r;
    if (move.type === 'rollDice') r = RM.handleRollDice(roomId, cur.id);
    else if (move.type === 'endTurn') r = RM.handleEndTurn(roomId, cur.id);
    else if (move.type === 'build') r = RM.handleBuild(roomId, cur.id, move.building, move.position);
    else if (move.type === 'moveRobber') r = RM.handleMoveRobber(roomId, cur.id, { tileId: move.tileId, stealFromId: move.stealFromId });
    else if (move.type === 'discard') r = RM.handleDiscard(roomId, cur.id, move.discarded);
    else if (move.type === 'buyDevCard') r = RM.handleBuyDevCard(roomId, cur.id);
    else if (move.type === 'playDevCard') r = RM.handlePlayDevCard(roomId, cur.id, {
      cardType: move.cardType, tileId: move.tileId, stealFromId: move.stealFromId,
      resources: move.resources, resource: move.resource,
    });
    else if (move.type === 'bankTrade') r = RM.handleBankTrade(roomId, cur.id, { give: move.give, want: move.want });
    if (r && !r.error) {
      broadcastState(roomId);
      driveBots(roomId);
    }
  }, 800);
}

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('room:create', ({ playerName, isPublic }, cb) => {
    const room = RM.createRoom(socket, playerName, { isPublic });
    socket.join(room.id);
    cb({ roomId: room.id, players: room.players, isPublic: room.isPublic });
    if (room.isPublic) io.emit('lobby:publicRooms', RM.listPublicRooms());
  });

  socket.on('lobby:listPublic', (_, cb) => {
    cb({ rooms: RM.listPublicRooms() });
  });

  socket.on('room:join', ({ roomId, playerName }, cb) => {
    const r = RM.joinRoom(roomId, socket, playerName);
    if (r.error) return cb({ error: r.error });
    socket.join(roomId);
    if (r.reconnected) {
      cb({ roomId, players: r.room.players, reconnected: true });
      socket.emit('game:stateUpdate', { state: sanitizeFor(r.room.state, socket.id) });
      io.to(roomId).emit('room:updated', { players: r.room.players });
    } else if (r.spectator) {
      cb({ roomId, players: r.room.players, spectator: true });
      socket.emit('game:stateUpdate', { state: sanitizeFor(r.room.state, socket.id) });
    } else {
      cb({ roomId, players: r.room.players });
      io.to(roomId).emit('room:updated', { players: r.room.players });
      if (r.room.isPublic) io.emit('lobby:publicRooms', RM.listPublicRooms());
    }
  });

  socket.on('room:addBot', ({ roomId }, cb) => {
    const r = RM.addBot(roomId, socket.id);
    if (r.error) return cb({ error: r.error });
    cb({ ok: true });
    io.to(roomId).emit('room:updated', { players: r.room.players });
  });

  socket.on('game:start', ({ roomId }, cb) => {
    const r = RM.startGame(roomId, socket.id);
    if (r.error) return cb({ error: r.error });
    io.in(roomId).fetchSockets().then(sockets => {
      sockets.forEach(s => s.emit('game:started', { state: sanitizeFor(r.room.state, s.id), roomId }));
    });
    cb({ ok: true });
    driveBots(roomId);
    io.emit('lobby:publicRooms', RM.listPublicRooms());
  });

  function ack(roomId, r, cb) {
    if (r.error) return cb({ error: r.error });
    broadcastState(roomId);
    cb({ ok: true });
    driveBots(roomId);
  }

  socket.on('game:rollDice',   ({ roomId }, cb) => ack(roomId, RM.handleRollDice(roomId, socket.id), cb));
  socket.on('game:endTurn',    ({ roomId }, cb) => ack(roomId, RM.handleEndTurn(roomId, socket.id), cb));
  socket.on('game:build',      ({ roomId, building, position }, cb) => ack(roomId, RM.handleBuild(roomId, socket.id, building, position), cb));
  socket.on('game:buyDevCard', ({ roomId }, cb) => ack(roomId, RM.handleBuyDevCard(roomId, socket.id), cb));
  socket.on('game:playDevCard',({ roomId, ...payload }, cb) => ack(roomId, RM.handlePlayDevCard(roomId, socket.id, payload), cb));
  socket.on('game:moveRobber', ({ roomId, tileId, stealFromId }, cb) => ack(roomId, RM.handleMoveRobber(roomId, socket.id, { tileId, stealFromId }), cb));
  socket.on('game:discard',    ({ roomId, discarded }, cb) => ack(roomId, RM.handleDiscard(roomId, socket.id, discarded), cb));
  socket.on('game:bankTrade',  ({ roomId, give, want }, cb) => ack(roomId, RM.handleBankTrade(roomId, socket.id, { give, want }), cb));
  socket.on('game:proposeTrade', ({ roomId, give, want, toPlayerId }, cb) => ack(roomId, RM.handleProposeTrade(roomId, socket.id, { give, want, toPlayerId }), cb));
  socket.on('game:respondTrade', ({ roomId, accept }, cb) => ack(roomId, RM.handleRespondTrade(roomId, socket.id, { accept }), cb));
  socket.on('game:cancelTrade',  ({ roomId }, cb) => ack(roomId, RM.handleCancelTrade(roomId, socket.id), cb));
  socket.on('game:counterTrade', ({ roomId, give, want }, cb) => ack(roomId, RM.handleCounterTrade(roomId, socket.id, { give, want }), cb));

  socket.on('chat:send', ({ roomId, message }, cb) => {
    const room = RM.getRoom(roomId);
    if (!room) return cb({ error: 'No room' });
    const sender = room.players.find(p => p.id === socket.id)
                || (room.spectators || []).find(s => s.id === socket.id)
                || (room.state?.players || []).find(p => p.id === socket.id);
    if (!sender) return cb({ error: 'Not in room' });
    const text = String(message || '').trim().slice(0, 200);
    if (!text) return cb({ error: 'Empty message' });
    const msg = { id: Date.now() + Math.random(), name: sender.name, text, ts: Date.now() };
    io.to(roomId).emit('chat:new', { message: msg });
    cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const r = RM.removePlayer(socket.id);
    if (r) {
      io.to(r.roomId).emit('room:updated', { players: r.room.players });
      if (r.kept) broadcastState(r.roomId);
    }
    console.log(`[-] ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
