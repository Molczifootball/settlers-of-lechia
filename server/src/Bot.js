// Heuristic bot.

const {
  canAfford, canPlaceSettlement, canPlaceRoad, getBankRatio, BUILDING_COSTS,
} = require('./GameState');

const TOKEN_DOTS = { 2:1, 3:2, 4:3, 5:4, 6:5, 7:0, 8:5, 9:4, 10:3, 11:2, 12:1 };

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function scoreVertex(state, vertexId) {
  const v = state.board.vertices[vertexId];
  if (!v) return 0;
  let score = 0;
  const resources = new Set();
  v.tiles.forEach(tid => {
    const tile = state.board.tiles[tid];
    if (!tile || tile.resource === 'desert') return;
    score += TOKEN_DOTS[tile.token] || 0;
    resources.add(tile.resource);
  });
  score += resources.size * 0.5;
  if (v.port === '3:1') score += 0.5;
  else if (v.port) score += 1;
  return score;
}

function pickSetupSettlement(state, bot) {
  const valid = state.board.vertices.filter(v => canPlaceSettlement(state, bot, v.id, true));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => scoreVertex(state, b.id) > scoreVertex(state, a.id) ? b : a);
}

function pickSetupRoad(state, bot) {
  const lastV = state.lastSetupVertex;
  const valid = state.board.edges.filter(e => canPlaceRoad(state, bot, e.id, true, lastV));
  if (valid.length === 0) return null;
  let best = valid[0], bestScore = -1;
  valid.forEach(e => {
    const farV = e.v1 === lastV ? e.v2 : e.v1;
    const s = scoreVertex(state, farV);
    if (s > bestScore) { bestScore = s; best = e; }
  });
  return best;
}

function pickMainSettlement(state, bot) {
  const valid = state.board.vertices.filter(v => canPlaceSettlement(state, bot, v.id, false));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => scoreVertex(state, b.id) > scoreVertex(state, a.id) ? b : a);
}

function pickMainRoad(state, bot) {
  const valid = state.board.edges.filter(e => canPlaceRoad(state, bot, e.id, false));
  if (valid.length === 0) return null;
  let best = null, bestScore = -1;
  valid.forEach(e => {
    const s = Math.max(scoreVertex(state, e.v1), scoreVertex(state, e.v2));
    if (s > bestScore) { bestScore = s; best = e; }
  });
  return best;
}

function pickCityUpgrade(state, bot) {
  if (bot.settlements.length === 0) return null;
  return bot.settlements.reduce((a, b) => scoreVertex(state, b) > scoreVertex(state, a) ? b : a);
}

function pickRobberTarget(state, bot) {
  const opponents = state.players.filter(p => p.id !== bot.id);
  // Sort opponents by VP desc to target leader; tiebreak by knights played
  opponents.sort((a, b) => (b.victoryPoints - a.victoryPoints) || (b.knightsPlayed - a.knightsPlayed));
  for (const opp of opponents) {
    const oppVerts = new Set([...opp.settlements, ...opp.cities]);
    const candidates = state.board.tiles.filter(t =>
      t.id !== state.robberTile &&
      t.resource !== 'desert' &&
      t.vertices.some(v => oppVerts.has(v))
    );
    if (candidates.length > 0) {
      candidates.sort((a, b) => (TOKEN_DOTS[b.token] || 0) - (TOKEN_DOTS[a.token] || 0));
      return { tileId: candidates[0].id, stealFromId: opp.id };
    }
  }
  // Fallback: any non-robber non-desert tile
  const fallback = state.board.tiles.filter(t => t.id !== state.robberTile && t.resource !== 'desert');
  if (fallback.length > 0) return { tileId: pickRandom(fallback).id, stealFromId: null };
  // Very last resort
  return { tileId: state.board.tiles.find(t => t.id !== state.robberTile)?.id || 0, stealFromId: null };
}

function pickDiscard(bot, count) {
  const discarded = {};
  let need = count;
  // Prefer dropping resources we have most of (preserve scarce resources)
  const sorted = Object.entries(bot.resources).sort(([, a], [, b]) => b - a);
  for (const [r, n] of sorted) {
    if (need <= 0) break;
    const take = Math.min(n, need);
    if (take > 0) { discarded[r] = take; need -= take; }
  }
  return discarded;
}

// What resources is the bot most lacking for its goals?
function neededResources(bot) {
  // Goal priority: city > settlement > road
  const target = !canAfford(bot, 'city') ? 'city'
              : !canAfford(bot, 'settlement') ? 'settlement'
              : !canAfford(bot, 'road') ? 'road'
              : 'devCard';
  const cost = BUILDING_COSTS[target];
  const missing = {};
  Object.entries(cost).forEach(([r, n]) => {
    const have = bot.resources[r] || 0;
    if (have < n) missing[r] = n - have;
  });
  return { target, missing };
}

function findBotMove(state, bot) {
  const isSetup = state.phase === 'setup1' || state.phase === 'setup2';

  // Discard awaiting (any player's turn)
  if (state.pendingAction?.type === 'discard') {
    const entry = state.pendingAction.awaiting.find(a => a.playerId === bot.id);
    if (entry) {
      return { type: 'discard', discarded: pickDiscard(bot, entry.count) };
    }
  }

  // Trade offer waiting on bot
  if (state.activeTrade && state.activeTrade.targets.includes(bot.id) && state.activeTrade.from !== bot.id) {
    // Accept if we can afford to give what they want AND we receive something useful
    const trade = state.activeTrade;
    const canAffordGive = Object.entries(trade.want).every(([r, n]) => (bot.resources[r] || 0) >= n);
    if (!canAffordGive) {
      return { type: 'respondTrade', accept: false };
    }
    // Score: do we want what they're giving?
    const { missing } = neededResources(bot);
    const helpful = Object.entries(trade.give).some(([r]) => missing[r]);
    const wasteful = Object.entries(trade.want).some(([r]) => missing[r]);
    return { type: 'respondTrade', accept: helpful && !wasteful };
  }

  if (isSetup) {
    if (state.setupStep === 'settlement') {
      const v = pickSetupSettlement(state, bot);
      if (v) return { type: 'build', building: 'settlement', position: { vertexId: v.id } };
    } else if (state.setupStep === 'road') {
      const e = pickSetupRoad(state, bot);
      if (e) return { type: 'build', building: 'road', position: { edgeId: e.id } };
    }
    return null;
  }

  // Main phase
  if (state.diceRoll === null) return { type: 'rollDice' };

  if (state.pendingAction?.type === 'moveRobber' && state.pendingAction.playerId === bot.id) {
    const tgt = pickRobberTarget(state, bot);
    return { type: 'moveRobber', tileId: tgt.tileId, stealFromId: tgt.stealFromId };
  }

  if (state.pendingAction?.type === 'freeRoads' && state.pendingAction.playerId === bot.id) {
    const e = pickMainRoad(state, bot);
    if (e) return { type: 'build', building: 'road', position: { edgeId: e.id } };
    return { type: 'endTurn' };
  }

  // Play knight if it would protect us OR claim Largest Army
  const playableKnight = bot.devCards?.find(c => c.type === 'knight' && c.playable);
  const robberOnMyTile = state.board.tiles[state.robberTile]?.vertices
    ?.some(v => bot.settlements.includes(v) || bot.cities.includes(v));
  const couldClaimLargestArmy = bot.knightsPlayed >= 2 &&
    !state.players.some(p => p.id !== bot.id && p.knightsPlayed > bot.knightsPlayed);
  if (playableKnight && (robberOnMyTile || (couldClaimLargestArmy && bot.knightsPlayed < 4))) {
    const tgt = pickRobberTarget(state, bot);
    return { type: 'playDevCard', cardType: 'knight', tileId: tgt.tileId, stealFromId: tgt.stealFromId };
  }

  // Year of Plenty: take exactly the missing resources for top goal
  const playableYoP = bot.devCards?.find(c => c.type === 'yearOfPlenty' && c.playable);
  if (playableYoP) {
    const { missing } = neededResources(bot);
    const missingList = [];
    Object.entries(missing).forEach(([r, n]) => { for (let i = 0; i < n; i++) missingList.push(r); });
    if (missingList.length >= 1) {
      const r1 = missingList[0] || 'wheat';
      const r2 = missingList[1] || r1 || 'ore';
      return { type: 'playDevCard', cardType: 'yearOfPlenty', resources: [r1, r2] };
    }
  }

  // Monopoly: pick the most-held resource type across opponents (estimate by what we lack)
  const playableMono = bot.devCards?.find(c => c.type === 'monopoly' && c.playable);
  if (playableMono) {
    const { missing } = neededResources(bot);
    const want = Object.keys(missing)[0] || 'wheat';
    return { type: 'playDevCard', cardType: 'monopoly', resource: want };
  }

  // Road Building if we have spare roads to build and at least one good spot
  const playableRB = bot.devCards?.find(c => c.type === 'roadBuilding' && c.playable);
  if (playableRB && bot.roads.length < 12) {
    const e = pickMainRoad(state, bot);
    if (e) return { type: 'playDevCard', cardType: 'roadBuilding' };
  }

  // Build priority: city > settlement > road > dev card
  if (canAfford(bot, 'city')) {
    const v = pickCityUpgrade(state, bot);
    if (v !== null && v !== undefined) {
      return { type: 'build', building: 'city', position: { vertexId: v } };
    }
  }
  if (canAfford(bot, 'settlement')) {
    const v = pickMainSettlement(state, bot);
    if (v) return { type: 'build', building: 'settlement', position: { vertexId: v.id } };
  }
  if (canAfford(bot, 'road') && bot.roads.length < 12) {
    const e = pickMainRoad(state, bot);
    if (e && Math.random() < 0.6) {
      return { type: 'build', building: 'road', position: { edgeId: e.id } };
    }
  }
  if (canAfford(bot, 'devCard') && state.devDeck.length > 0 && Math.random() < 0.4) {
    return { type: 'buyDevCard' };
  }

  // Bank trade: find surplus and trade for missing
  const total = Object.values(bot.resources).reduce((a, b) => a + b, 0);
  if (total >= 4 && !state.activeTrade) {
    const { missing } = neededResources(bot);
    const wantRes = Object.keys(missing)[0];
    if (wantRes) {
      // Find a resource we have surplus of (more than ratio amount, and not the one we want)
      for (const [give, n] of Object.entries(bot.resources)) {
        if (give === wantRes) continue;
        const ratio = getBankRatio(state, bot, give);
        if (n >= ratio) {
          return { type: 'bankTrade', give, want: wantRes };
        }
      }
    }
  }

  return { type: 'endTurn' };
}

module.exports = { findBotMove };
