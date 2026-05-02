// Client-side legality helpers — mirror server logic so we can highlight only valid spots.

export function isVertexAvailable(state, vertexId) {
  const occupied = new Set();
  state.players.forEach(p => {
    (p.settlements || []).forEach(v => occupied.add(v));
    (p.cities || []).forEach(v => occupied.add(v));
  });
  if (occupied.has(vertexId)) return false;
  const v = state.board.vertices[vertexId];
  return !v.neighbors.some(n => occupied.has(n));
}

export function canPlaceSettlement(state, player, vertexId, isSetup) {
  if (!player) return false;
  if (!isVertexAvailable(state, vertexId)) return false;
  if (isSetup) return true;
  const v = state.board.vertices[vertexId];
  return v.edges.some(e => (player.roads || []).includes(e));
}

export function canPlaceRoad(state, player, edgeId, isSetup, mustConnectToVertex = null) {
  if (!player) return false;
  const occupied = new Set();
  state.players.forEach(p => (p.roads || []).forEach(r => occupied.add(r)));
  if (occupied.has(edgeId)) return false;

  const edge = state.board.edges[edgeId];
  if (!edge) return false;

  if (isSetup && mustConnectToVertex !== null && mustConnectToVertex !== undefined) {
    return edge.v1 === mustConnectToVertex || edge.v2 === mustConnectToVertex;
  }

  // Opponent settlements/cities block road continuity through that vertex.
  const opponentVertices = new Set();
  state.players.forEach(p => {
    if (p.id === player.id) return;
    (p.settlements || []).forEach(v => opponentVertices.add(v));
    (p.cities || []).forEach(v => opponentVertices.add(v));
  });

  const myStuff = new Set([...(player.settlements || []), ...(player.cities || [])]);
  if (myStuff.has(edge.v1) || myStuff.has(edge.v2)) return true;

  return (player.roads || []).some(rid => {
    const re = state.board.edges[rid];
    let shared = null;
    if (re.v1 === edge.v1 || re.v2 === edge.v1) shared = edge.v1;
    else if (re.v1 === edge.v2 || re.v2 === edge.v2) shared = edge.v2;
    if (shared === null) return false;
    return !opponentVertices.has(shared);
  });
}

export function canUpgradeToCity(player, vertexId) {
  return !!player && (player.settlements || []).includes(vertexId);
}
