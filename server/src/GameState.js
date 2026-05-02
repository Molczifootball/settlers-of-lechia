const { generateBoard } = require('./Board');

const PLAYER_COLORS = ['red', 'blue', 'green', 'orange'];
const STARTING_RESOURCES = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

const BUILDING_COSTS = {
  road:       { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city:       { wheat: 2, ore: 3 },
  devCard:    { sheep: 1, wheat: 1, ore: 1 },
};

const DEV_CARD_DECK = [
  ...Array(14).fill('knight'),
  ...Array(5).fill('vp'),
  ...Array(2).fill('roadBuilding'),
  ...Array(2).fill('yearOfPlenty'),
  ...Array(2).fill('monopoly'),
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayer(id, name, colorIndex, isBot = false) {
  return {
    id, name, isBot,
    color: PLAYER_COLORS[colorIndex],
    resources: { ...STARTING_RESOURCES },
    settlements: [],
    cities: [],
    roads: [],
    devCards: [],
    knightsPlayed: 0,
    victoryPoints: 0,
    hasLargestArmy: false,
    hasLongestRoad: false,
    longestRoadLength: 0,
    connected: true,
  };
}

function createGameState(players) {
  const board = generateBoard();
  const robberTile = board.tiles.find(t => t.resource === 'desert')?.id ?? 0;

  return {
    phase: 'setup1',
    setupStep: 'settlement',
    turn: 0,
    round: 1,
    diceRoll: null,
    board,
    robberTile,
    players: players.map((p, i) => createPlayer(p.id, p.name, i, p.isBot)),
    devDeck: shuffle(DEV_CARD_DECK),
    largestArmyHolder: null,
    longestRoadHolder: null,
    pendingAction: null,
    activeTrade: null,
    log: [],
    winner: null,
  };
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
}

function totalResources(player) {
  return Object.values(player.resources).reduce((a, b) => a + b, 0);
}

function canAfford(player, building) {
  return Object.entries(BUILDING_COSTS[building]).every(([r, n]) => player.resources[r] >= n);
}

function deductCost(player, building) {
  Object.entries(BUILDING_COSTS[building]).forEach(([r, n]) => { player.resources[r] -= n; });
}

function distributeResources(state, roll) {
  state.board.tiles.forEach(tile => {
    if (tile.token !== roll || tile.id === state.robberTile) return;
    state.players.forEach(p => {
      const s = p.settlements.filter(v => tile.vertices.includes(v)).length;
      const c = p.cities.filter(v => tile.vertices.includes(v)).length;
      p.resources[tile.resource] += s + c * 2;
    });
  });
}

function grantSetupResources(state, player, vertexId) {
  state.board.tiles.forEach(tile => {
    if (tile.vertices.includes(vertexId) && tile.resource !== 'desert') {
      player.resources[tile.resource] += 1;
    }
  });
}

function isVertexAvailable(state, vertexId) {
  const occupied = new Set();
  state.players.forEach(p => {
    p.settlements.forEach(v => occupied.add(v));
    p.cities.forEach(v => occupied.add(v));
  });
  if (occupied.has(vertexId)) return false;
  const v = state.board.vertices[vertexId];
  return !v.neighbors.some(n => occupied.has(n));
}

function canPlaceSettlement(state, player, vertexId, isSetup) {
  if (!isVertexAvailable(state, vertexId)) return false;
  if (isSetup) return true;
  const v = state.board.vertices[vertexId];
  return v.edges.some(e => player.roads.includes(e));
}

function canPlaceRoad(state, player, edgeId, isSetup, mustConnectToVertex = null) {
  const allRoads = new Set();
  state.players.forEach(p => p.roads.forEach(r => allRoads.add(r)));
  if (allRoads.has(edgeId)) return false;

  const edge = state.board.edges[edgeId];
  if (!edge) return false;

  if (isSetup && mustConnectToVertex !== null && mustConnectToVertex !== undefined) {
    return edge.v1 === mustConnectToVertex || edge.v2 === mustConnectToVertex;
  }

  // Vertex blocked by an opponent's building cannot be used to extend a road.
  const opponentVertices = new Set();
  state.players.forEach(p => {
    if (p.id === player.id) return;
    p.settlements.forEach(v => opponentVertices.add(v));
    p.cities.forEach(v => opponentVertices.add(v));
  });

  const myStuff = new Set([...player.settlements, ...player.cities]);
  // Direct connection to your own settlement/city always allowed (those vertices aren't opponent-blocked).
  if (myStuff.has(edge.v1) || myStuff.has(edge.v2)) return true;

  // Otherwise, the edge must share a vertex with one of your roads,
  // AND that shared vertex must NOT be occupied by an opponent's building.
  return player.roads.some(rid => {
    const re = state.board.edges[rid];
    let shared = null;
    if (re.v1 === edge.v1 || re.v2 === edge.v1) shared = edge.v1;
    else if (re.v1 === edge.v2 || re.v2 === edge.v2) shared = edge.v2;
    if (shared === null) return false;
    return !opponentVertices.has(shared);
  });
}

// Longest Road: DFS through player's road graph for longest simple path.
function computeLongestRoad(state, player) {
  const myRoads = new Set(player.roads);
  if (myRoads.size === 0) return 0;

  // Adjacency: vertex -> [edges]
  const vAdj = {};
  player.roads.forEach(eid => {
    const e = state.board.edges[eid];
    (vAdj[e.v1] = vAdj[e.v1] || []).push({ edge: eid, other: e.v2 });
    (vAdj[e.v2] = vAdj[e.v2] || []).push({ edge: eid, other: e.v1 });
  });

  // Vertices owned by other players block road continuity
  const blocked = new Set();
  state.players.forEach(p => {
    if (p.id === player.id) return;
    p.settlements.forEach(v => blocked.add(v));
    p.cities.forEach(v => blocked.add(v));
  });

  let best = 0;
  function dfs(vertex, usedEdges, length) {
    best = Math.max(best, length);
    const adj = vAdj[vertex] || [];
    for (const { edge, other } of adj) {
      if (usedEdges.has(edge)) continue;
      if (blocked.has(vertex) && length > 0) continue; // can't pass through opponent's building
      usedEdges.add(edge);
      dfs(other, usedEdges, length + 1);
      usedEdges.delete(edge);
    }
  }

  Object.keys(vAdj).forEach(v => dfs(parseInt(v, 10), new Set(), 0));
  return best;
}

function recalcVictoryPoints(state, player) {
  let vp = player.settlements.length + player.cities.length * 2;
  vp += player.devCards.filter(c => c.type === 'vp').length;
  if (player.hasLargestArmy) vp += 2;
  if (player.hasLongestRoad) vp += 2;
  player.victoryPoints = vp;
}

function publicVictoryPoints(player) {
  // VP cards stay hidden until win — public total excludes them
  let vp = player.settlements.length + player.cities.length * 2;
  if (player.hasLargestArmy) vp += 2;
  if (player.hasLongestRoad) vp += 2;
  return vp;
}

function updateLargestArmy(state) {
  const MIN = 3; // need at least 3 knights to claim it
  const currentId = state.largestArmyHolder;
  const current = currentId ? state.players.find(p => p.id === currentId) : null;
  // Current holder keeps the title until somebody STRICTLY exceeds them.
  // If no holder yet, anyone needs > MIN-1 (i.e. ≥ MIN) to claim.
  let threshold = current && current.knightsPlayed >= MIN ? current.knightsPlayed : MIN - 1;
  let leader = current && current.knightsPlayed >= MIN ? currentId : null;
  state.players.forEach(p => {
    if (p.knightsPlayed > threshold) { threshold = p.knightsPlayed; leader = p.id; }
  });
  if (leader !== state.largestArmyHolder) {
    state.players.forEach(p => { p.hasLargestArmy = (p.id === leader); });
    state.largestArmyHolder = leader;
    if (leader) {
      const name = state.players.find(p => p.id === leader)?.name;
      state.log.unshift(`${name} now holds the Largest Army!`);
    }
  }
}

function updateLongestRoad(state) {
  state.players.forEach(p => { p.longestRoadLength = computeLongestRoad(state, p); });

  const MIN = 5;
  const currentId = state.longestRoadHolder;
  const current = currentId ? state.players.find(p => p.id === currentId) : null;
  // Current holder keeps the title unless someone STRICTLY exceeds them.
  // If the current holder's road has been broken below MIN, they lose the title.
  let threshold = current && current.longestRoadLength >= MIN ? current.longestRoadLength : MIN - 1;
  let leader = current && current.longestRoadLength >= MIN ? currentId : null;
  state.players.forEach(p => {
    if (p.longestRoadLength > threshold) { threshold = p.longestRoadLength; leader = p.id; }
  });
  if (leader !== state.longestRoadHolder) {
    state.players.forEach(p => { p.hasLongestRoad = (p.id === leader); });
    state.longestRoadHolder = leader;
    if (leader) {
      const name = state.players.find(p => p.id === leader)?.name;
      state.log.unshift(`${name} now holds the Longest Road!`);
    } else {
      state.log.unshift('Longest Road is no longer claimed.');
    }
  }
}

function checkWinner(state) {
  state.players.forEach(p => recalcVictoryPoints(state, p));
  const winner = state.players.find(p => p.victoryPoints >= 10);
  if (winner && state.phase !== 'end') {
    state.winner = winner.id;
    state.phase = 'end';
    state.log.unshift(`🏆 ${winner.name} wins with ${winner.victoryPoints} VP!`);
  }
}

// Bank trade ratio considering ports
function getBankRatio(state, player, resource) {
  const myVertices = new Set([...player.settlements, ...player.cities]);
  let ratio = 4;
  myVertices.forEach(vid => {
    const port = state.board.vertices[vid]?.port;
    if (port === resource) ratio = Math.min(ratio, 2);
    else if (port === '3:1') ratio = Math.min(ratio, 3);
  });
  return ratio;
}

module.exports = {
  createGameState, createPlayer, rollDice, totalResources,
  canAfford, deductCost, distributeResources, grantSetupResources,
  isVertexAvailable, canPlaceSettlement, canPlaceRoad,
  recalcVictoryPoints, publicVictoryPoints,
  updateLargestArmy, updateLongestRoad, checkWinner,
  getBankRatio, computeLongestRoad,
  BUILDING_COSTS, DEV_CARD_DECK,
};
