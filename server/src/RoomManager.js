const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const {
  createGameState, createPlayer, rollDice, totalResources,
  canAfford, deductCost, distributeResources, grantSetupResources,
  canPlaceSettlement, canPlaceRoad, recalcVictoryPoints,
  updateLargestArmy, updateLongestRoad, checkWinner,
  getBankRatio, BUILDING_COSTS,
} = require('./GameState');

const PERSIST_PATH = path.join(__dirname, '..', 'rooms.json');
const rooms = new Map();

function persist() {
  try {
    const data = {};
    rooms.forEach((room, id) => {
      // Strip ephemeral data; keep state for restore
      data[id] = { id: room.id, host: room.host, players: room.players, started: room.started, state: room.state };
    });
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(data));
  } catch (e) { /* non-fatal */ }
}

function loadPersisted() {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return;
    const raw = fs.readFileSync(PERSIST_PATH, 'utf8');
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([id, room]) => {
      // Mark all players disconnected on restart
      if (room.state) {
        room.state.players.forEach(p => { p.connected = false; });
      }
      rooms.set(id, room);
    });
  } catch (e) { /* ignore */ }
}
loadPersisted();

function createRoom(hostSocket, hostName) {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  const room = {
    id: roomId, host: hostSocket.id,
    players: [{ id: hostSocket.id, name: hostName, isBot: false }],
    spectators: [], state: null, started: false,
  };
  rooms.set(roomId, room);
  persist();
  return room;
}

function joinRoom(roomId, socket, playerName) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };

  if (room.started && room.state) {
    // Reconnection: match by name
    const existing = room.state.players.find(p => p.name === playerName);
    if (existing) {
      existing.id = socket.id;
      existing.connected = true;
      const original = room.players.find(p => p.name === playerName);
      if (original) original.id = socket.id;
      persist();
      return { room, reconnected: true };
    }
    // Otherwise spectator
    if (!room.spectators.find(s => s.id === socket.id)) {
      room.spectators.push({ id: socket.id, name: playerName });
    }
    return { room, spectator: true };
  }

  if (room.players.length >= 4) return { error: 'Room is full' };
  if (room.players.find(p => p.id === socket.id)) return { error: 'Already in room' };
  if (room.players.find(p => p.name === playerName)) return { error: 'Name already taken' };
  room.players.push({ id: socket.id, name: playerName, isBot: false });
  persist();
  return { room };
}

function addBot(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== socketId) return { error: 'Only host can add bots' };
  if (room.started) return { error: 'Already started' };
  if (room.players.length >= 4) return { error: 'Room is full' };
  const botNum = room.players.filter(p => p.isBot).length + 1;
  room.players.push({ id: 'bot_' + uuidv4().slice(0, 6), name: `Bot ${botNum}`, isBot: true });
  persist();
  return { room };
}

function startGame(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.host !== socketId) return { error: 'Only host can start' };
  if (room.players.length < 2) return { error: 'Need at least 2 players' };
  room.state = createGameState(room.players);
  room.started = true;
  room.state.log.unshift('Game started! Place your first settlement.');
  persist();
  return { room };
}

function getCurrentPlayer(state) { return state.players[state.turn]; }

function advanceSetupTurn(state) {
  if (state.phase === 'setup1') {
    if (state.turn < state.players.length - 1) {
      state.turn++;
      state.setupStep = 'settlement';
    } else {
      state.phase = 'setup2';
      state.setupStep = 'settlement';
    }
  } else if (state.phase === 'setup2') {
    if (state.turn > 0) {
      state.turn--;
      state.setupStep = 'settlement';
    } else {
      state.phase = 'main';
      state.turn = 0;
      state.setupStep = null;
      state.log.unshift('Setup complete! Main phase begins.');
    }
  }
}

function handleRollDice(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Not in main phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };
  if (state.diceRoll !== null) return { error: 'Already rolled' };

  const roll = rollDice();
  state.diceRoll = roll;

  if (roll === 7) {
    // Determine who needs to discard
    const mustDiscard = state.players
      .filter(p => totalResources(p) > 7)
      .map(p => ({ playerId: p.id, count: Math.floor(totalResources(p) / 2) }));
    if (mustDiscard.length > 0) {
      state.pendingAction = { type: 'discard', awaiting: mustDiscard, nextAction: { type: 'moveRobber', playerId: socketId } };
      state.log.unshift(`${cur.name} rolled 7 — players with >7 cards must discard half!`);
    } else {
      state.pendingAction = { type: 'moveRobber', playerId: socketId };
      state.log.unshift(`${cur.name} rolled 7 — must move the robber!`);
    }
  } else {
    distributeResources(state, roll);
    state.log.unshift(`${cur.name} rolled ${roll}`);
  }
  persist();
  return { state };
}

function handleDiscard(roomId, socketId, discarded) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  const pa = state.pendingAction;
  if (pa?.type !== 'discard') return { error: 'No discard pending' };

  const entry = pa.awaiting.find(a => a.playerId === socketId);
  if (!entry) return { error: 'You do not need to discard' };

  const totalDiscarded = Object.values(discarded).reduce((a, b) => a + b, 0);
  if (totalDiscarded !== entry.count) return { error: `Must discard exactly ${entry.count}` };

  const player = state.players.find(p => p.id === socketId);
  for (const [r, n] of Object.entries(discarded)) {
    if ((player.resources[r] || 0) < n) return { error: 'Insufficient resources' };
  }
  for (const [r, n] of Object.entries(discarded)) {
    player.resources[r] -= n;
  }
  state.log.unshift(`${player.name} discarded ${entry.count} cards`);

  pa.awaiting = pa.awaiting.filter(a => a.playerId !== socketId);
  if (pa.awaiting.length === 0) {
    state.pendingAction = pa.nextAction || null;
  }
  persist();
  return { state };
}

function handleEndTurn(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Setup phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };
  if (state.diceRoll === null) return { error: 'Must roll first' };
  if (state.pendingAction) return { error: 'Resolve pending action first' };

  cur.devCards.forEach(c => { c.playable = true; });
  state.turn = (state.turn + 1) % state.players.length;
  state.diceRoll = null;
  if (state.turn === 0) state.round++;
  state.log.unshift(`${cur.name} ended their turn`);
  persist();
  return { state };
}

function handleBuild(roomId, socketId, building, position) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  const player = state.players.find(p => p.id === socketId);
  if (!player) return { error: 'Player not found' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };

  const isSetup = state.phase === 'setup1' || state.phase === 'setup2';
  if (isSetup) return handleSetupBuild(state, player, building, position, room);

  if (state.diceRoll === null) return { error: 'Must roll first' };

  const freeRoad = state.pendingAction?.type === 'freeRoads' && state.pendingAction.playerId === socketId;
  if (state.pendingAction && !freeRoad) return { error: 'Resolve pending action first' };

  if (building === 'road') {
    if (!freeRoad && !canAfford(player, 'road')) return { error: 'Insufficient resources' };
    if (!canPlaceRoad(state, player, position.edgeId, false)) return { error: 'Invalid road location' };
    if (!freeRoad) deductCost(player, 'road');
    player.roads.push(position.edgeId);
    state.log.unshift(`${player.name} built a road${freeRoad ? ' (free)' : ''}`);
    if (freeRoad) {
      state.pendingAction.roadsRemaining--;
      if (state.pendingAction.roadsRemaining <= 0) state.pendingAction = null;
    }
    updateLongestRoad(state);
  } else if (building === 'settlement') {
    if (!canAfford(player, 'settlement')) return { error: 'Insufficient resources' };
    if (!canPlaceSettlement(state, player, position.vertexId, false)) return { error: 'Invalid settlement location' };
    deductCost(player, 'settlement');
    player.settlements.push(position.vertexId);
    state.log.unshift(`${player.name} built a settlement`);
    updateLongestRoad(state);
  } else if (building === 'city') {
    if (!canAfford(player, 'city')) return { error: 'Insufficient resources' };
    const idx = player.settlements.indexOf(position.vertexId);
    if (idx === -1) return { error: 'No settlement here to upgrade' };
    deductCost(player, 'city');
    player.settlements.splice(idx, 1);
    player.cities.push(position.vertexId);
    state.log.unshift(`${player.name} upgraded to a city`);
  } else {
    return { error: 'Unknown building' };
  }

  checkWinner(state);
  persist();
  return { state };
}

function handleSetupBuild(state, player, building, position, room) {
  const expectedStep = state.setupStep;
  if (building !== expectedStep) return { error: `Place a ${expectedStep} now` };

  if (building === 'settlement') {
    if (!canPlaceSettlement(state, player, position.vertexId, true)) return { error: 'Invalid location' };
    player.settlements.push(position.vertexId);
    state.log.unshift(`${player.name} placed a settlement`);
    if (state.phase === 'setup2') grantSetupResources(state, player, position.vertexId);
    state.setupStep = 'road';
    state.lastSetupVertex = position.vertexId;
  } else if (building === 'road') {
    if (!canPlaceRoad(state, player, position.edgeId, true, state.lastSetupVertex)) {
      return { error: 'Road must connect to your new settlement' };
    }
    player.roads.push(position.edgeId);
    state.log.unshift(`${player.name} placed a road`);
    state.lastSetupVertex = null;
    advanceSetupTurn(state);
    updateLongestRoad(state);
  }

  state.players.forEach(p => recalcVictoryPoints(state, p));
  persist();
  return { state };
}

function handleBuyDevCard(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Not in main phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };
  if (state.diceRoll === null) return { error: 'Must roll first' };
  if (state.pendingAction) return { error: 'Resolve pending action first' };
  if (!canAfford(cur, 'devCard')) return { error: 'Insufficient resources' };
  if (state.devDeck.length === 0) return { error: 'Dev deck empty' };

  deductCost(cur, 'devCard');
  const card = state.devDeck.pop();
  cur.devCards.push({ type: card, playable: card === 'vp' });
  state.log.unshift(`${cur.name} bought a development card`);
  checkWinner(state);
  persist();
  return { state };
}

function handlePlayDevCard(roomId, socketId, payload) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Not in main phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };

  const { cardType } = payload;
  const cardIdx = cur.devCards.findIndex(c => c.type === cardType && c.playable);
  if (cardIdx === -1) return { error: 'No playable card' };
  if (cardType === 'vp') return { error: 'VP cards score automatically' };

  if (cardType === 'knight') {
    if (payload.tileId === undefined || payload.tileId === null) return { error: 'Select a tile' };
    state.robberTile = payload.tileId;
    cur.knightsPlayed++;
    cur.devCards.splice(cardIdx, 1);
    state.log.unshift(`${cur.name} played a Knight`);
    if (payload.stealFromId) {
      const victim = state.players.find(p => p.id === payload.stealFromId);
      if (victim) {
        const owned = Object.entries(victim.resources).filter(([, n]) => n > 0);
        if (owned.length > 0) {
          const [r] = owned[Math.floor(Math.random() * owned.length)];
          victim.resources[r]--; cur.resources[r]++;
          state.log.unshift(`${cur.name} stole from ${victim.name}`);
        }
      }
    }
    updateLargestArmy(state);
  } else if (cardType === 'roadBuilding') {
    cur.devCards.splice(cardIdx, 1);
    state.pendingAction = { type: 'freeRoads', playerId: socketId, roadsRemaining: 2 };
    state.log.unshift(`${cur.name} played Road Building — place 2 free roads`);
  } else if (cardType === 'yearOfPlenty') {
    const { resources } = payload;
    if (!Array.isArray(resources) || resources.length !== 2) return { error: 'Pick 2 resources' };
    cur.devCards.splice(cardIdx, 1);
    resources.forEach(r => { cur.resources[r] = (cur.resources[r] || 0) + 1; });
    state.log.unshift(`${cur.name} played Year of Plenty`);
  } else if (cardType === 'monopoly') {
    const { resource } = payload;
    if (!resource) return { error: 'Pick a resource' };
    cur.devCards.splice(cardIdx, 1);
    let total = 0;
    state.players.forEach(p => {
      if (p.id !== cur.id) {
        total += p.resources[resource] || 0;
        p.resources[resource] = 0;
      }
    });
    cur.resources[resource] += total;
    state.log.unshift(`${cur.name} monopolized ${resource} (+${total})`);
  }

  checkWinner(state);
  persist();
  return { state };
}

function handleMoveRobber(roomId, socketId, { tileId, stealFromId }) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.pendingAction?.type !== 'moveRobber' || state.pendingAction.playerId !== socketId) {
    return { error: 'No pending robber move' };
  }
  if (tileId === state.robberTile) return { error: 'Move to a different tile' };
  state.robberTile = tileId;
  const cur = getCurrentPlayer(state);
  state.log.unshift(`${cur.name} moved the robber`);
  if (stealFromId) {
    const victim = state.players.find(p => p.id === stealFromId);
    if (victim) {
      const owned = Object.entries(victim.resources).filter(([, n]) => n > 0);
      if (owned.length > 0) {
        const [r] = owned[Math.floor(Math.random() * owned.length)];
        victim.resources[r]--; cur.resources[r]++;
        state.log.unshift(`${cur.name} stole from ${victim.name}`);
      }
    }
  }
  state.pendingAction = null;
  persist();
  return { state };
}

// Bank trade with port-aware ratios
function handleBankTrade(roomId, socketId, { give, want }) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Not in main phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };
  if (state.diceRoll === null) return { error: 'Must roll first' };
  if (state.pendingAction) return { error: 'Resolve pending action first' };

  const ratio = getBankRatio(state, cur, give);
  if ((cur.resources[give] || 0) < ratio) return { error: `Need ${ratio} ${give}` };
  cur.resources[give] -= ratio;
  cur.resources[want] = (cur.resources[want] || 0) + 1;
  state.log.unshift(`${cur.name} traded ${ratio} ${give} for 1 ${want} (bank)`);
  persist();
  return { state };
}

// Player-to-player trade
function handleProposeTrade(roomId, socketId, { give, want, toPlayerId }) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (state.phase !== 'main') return { error: 'Not in main phase' };
  const cur = getCurrentPlayer(state);
  if (cur.id !== socketId) return { error: 'Not your turn' };
  if (state.diceRoll === null) return { error: 'Must roll first' };
  if (state.activeTrade) return { error: 'Trade already active' };

  const totalGive = Object.values(give).reduce((a, b) => a + b, 0);
  const totalWant = Object.values(want).reduce((a, b) => a + b, 0);
  if (totalGive === 0 || totalWant === 0) return { error: 'Must give and want at least 1' };

  for (const [r, n] of Object.entries(give)) {
    if ((cur.resources[r] || 0) < n) return { error: `Insufficient ${r}` };
  }

  const targets = toPlayerId ? [toPlayerId] : state.players.filter(p => p.id !== cur.id).map(p => p.id);
  state.activeTrade = {
    from: cur.id, give, want, targets, responses: {},
  };
  const fmt = (obj) => Object.entries(obj).filter(([, n]) => n > 0).map(([r, n]) => `${n}${r[0].toUpperCase()}`).join('+');
  const targetText = toPlayerId
    ? state.players.find(p => p.id === toPlayerId)?.name || '?'
    : 'all';
  state.log.unshift(`${cur.name} → ${targetText}: trade ${fmt(give)} for ${fmt(want)}`);
  persist();
  return { state };
}

function handleRespondTrade(roomId, socketId, { accept }) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  const trade = state.activeTrade;
  if (!trade) return { error: 'No active trade' };
  if (!trade.targets.includes(socketId)) return { error: 'Not a trade target' };
  if (socketId === trade.from) return { error: "Can't respond to own trade" };

  if (accept) {
    const initiator = state.players.find(p => p.id === trade.from);
    const responder = state.players.find(p => p.id === socketId);
    for (const [r, n] of Object.entries(trade.want)) {
      if ((responder.resources[r] || 0) < n) return { error: 'You lack required resources' };
    }
    for (const [r, n] of Object.entries(trade.give)) {
      initiator.resources[r] -= n;
      responder.resources[r] = (responder.resources[r] || 0) + n;
    }
    for (const [r, n] of Object.entries(trade.want)) {
      responder.resources[r] -= n;
      initiator.resources[r] = (initiator.resources[r] || 0) + n;
    }
    const fmt = (obj) => Object.entries(obj).filter(([, n]) => n > 0).map(([r, n]) => `${n}${r[0].toUpperCase()}`).join('+');
    state.log.unshift(`✓ ${responder.name} ↔ ${initiator.name}: ${fmt(trade.give)}↔${fmt(trade.want)}`);
    state.activeTrade = null;
  } else {
    trade.responses[socketId] = 'rejected';
    if (Object.keys(trade.responses).length >= trade.targets.length) {
      state.log.unshift(`Trade rejected by all`);
      state.activeTrade = null;
    }
  }
  persist();
  return { state };
}

function handleCancelTrade(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room?.state) return { error: 'No active game' };
  const state = room.state;
  if (!state.activeTrade) return { error: 'No active trade' };
  if (state.activeTrade.from !== socketId) return { error: 'Only initiator can cancel' };
  state.activeTrade = null;
  state.log.unshift('Trade cancelled');
  persist();
  return { state };
}

function removePlayer(socketId) {
  for (const [roomId, room] of rooms.entries()) {
    // Mark as disconnected in active games (don't delete)
    if (room.state) {
      const player = room.state.players.find(p => p.id === socketId);
      if (player) {
        player.connected = false;
        return { roomId, room, kept: true };
      }
    }
    // Remove from lobby if not started
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx !== -1 && !room.started) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) rooms.delete(roomId);
      else if (room.host === socketId) room.host = room.players[0].id;
      return { roomId, room };
    }
    // Remove spectator
    const sIdx = room.spectators?.findIndex(s => s.id === socketId);
    if (sIdx !== undefined && sIdx !== -1) {
      room.spectators.splice(sIdx, 1);
      return { roomId, room };
    }
  }
  return null;
}

function getRoom(id) { return rooms.get(id); }
function listRooms() { return rooms; }

module.exports = {
  createRoom, joinRoom, addBot, startGame,
  handleRollDice, handleDiscard, handleEndTurn, handleBuild,
  handleBuyDevCard, handlePlayDevCard, handleMoveRobber,
  handleBankTrade, handleProposeTrade, handleRespondTrade, handleCancelTrade,
  removePlayer, getRoom, listRooms, persist,
};
