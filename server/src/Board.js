// Board geometry — vertex/edge graph + ports.

const TILE_DISTRIBUTION = [
  'wood', 'wood', 'wood', 'wood',
  'brick', 'brick', 'brick',
  'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat',
  'ore', 'ore', 'ore',
  'desert',
];

const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const HEX_LAYOUT = [3, 4, 5, 4, 3];
const HEX_SIZE = 52;
const SQRT3 = Math.sqrt(3);

const PORT_TYPES = ['3:1', '3:1', '3:1', '3:1', 'wood', 'brick', 'sheep', 'wheat', 'ore'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hexCenter(row, col) {
  const rowSize = HEX_LAYOUT[row];
  const offsetX = ((5 - rowSize) / 2) * HEX_SIZE * SQRT3;
  return {
    x: offsetX + col * HEX_SIZE * SQRT3 + HEX_SIZE * SQRT3 / 2,
    y: row * HEX_SIZE * 1.5 + HEX_SIZE,
  };
}

function hexCornerPositions(cx, cy) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return {
      x: Math.round(cx + HEX_SIZE * Math.cos(angle)),
      y: Math.round(cy + HEX_SIZE * Math.sin(angle)),
    };
  });
}

// Returns true if the given token assignment has no two high-probability (6/8) tiles adjacent.
function isValidTokenLayout(tokenTiles, assignments, adjacency) {
  for (const tile of tokenTiles) {
    const t = assignments[tile.id];
    if (t !== 6 && t !== 8) continue;
    for (const adjId of adjacency[tile.id] || []) {
      const a = assignments[adjId];
      if (a === 6 || a === 8) return false;
    }
  }
  return true;
}

function generateBoard() {
  const tileResources = shuffle(TILE_DISTRIBUTION);

  const tiles = [];
  HEX_LAYOUT.forEach((rowSize, row) => {
    for (let col = 0; col < rowSize; col++) {
      const resource = tileResources[tiles.length];
      const { x, y } = hexCenter(row, col);
      tiles.push({
        id: tiles.length,
        resource, token: null, row, col,
        cx: x, cy: y,
        hasRobber: resource === 'desert',
        vertices: [], edges: [],
      });
    }
  });

  const vertexMap = new Map();
  const edgeMap = new Map();
  const vertices = [];
  const edges = [];

  tiles.forEach(tile => {
    const corners = hexCornerPositions(tile.cx, tile.cy);
    const vIds = [];
    corners.forEach(({ x, y }) => {
      const key = `${x},${y}`;
      let vid = vertexMap.get(key);
      if (vid === undefined) {
        vid = vertices.length;
        vertexMap.set(key, vid);
        vertices.push({ id: vid, x, y, tiles: [], edges: [], neighbors: [], port: null });
      }
      if (!vertices[vid].tiles.includes(tile.id)) vertices[vid].tiles.push(tile.id);
      vIds.push(vid);
    });
    tile.vertices = vIds;

    for (let i = 0; i < 6; i++) {
      const a = vIds[i], b = vIds[(i + 1) % 6];
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const key = `${lo}-${hi}`;
      let eid = edgeMap.get(key);
      if (eid === undefined) {
        eid = edges.length;
        edgeMap.set(key, eid);
        edges.push({ id: eid, v1: lo, v2: hi });
        vertices[lo].edges.push(eid);
        vertices[hi].edges.push(eid);
        if (!vertices[lo].neighbors.includes(hi)) vertices[lo].neighbors.push(hi);
        if (!vertices[hi].neighbors.includes(lo)) vertices[hi].neighbors.push(lo);
      }
      tile.edges.push(eid);
    }
  });

  // Build tile-to-tile adjacency (two tiles are adjacent iff they share a vertex).
  const tokenTiles = tiles.filter(t => t.resource !== 'desert');
  const adjacency = {};
  tokenTiles.forEach(t => {
    const tVerts = new Set(t.vertices);
    adjacency[t.id] = tokenTiles
      .filter(o => o.id !== t.id && o.vertices.some(v => tVerts.has(v)))
      .map(o => o.id);
  });

  // Find a token layout where no two 6/8 tiles touch. Re-shuffle until valid.
  let assignments = {};
  let found = false;
  for (let attempt = 0; attempt < 500 && !found; attempt++) {
    const numbers = shuffle(NUMBER_TOKENS);
    assignments = {};
    tokenTiles.forEach((t, i) => { assignments[t.id] = numbers[i]; });
    if (isValidTokenLayout(tokenTiles, assignments, adjacency)) found = true;
  }
  // Apply
  tokenTiles.forEach(t => { t.token = assignments[t.id]; });

  // Identify true coastal edges: edges that belong to exactly 1 tile.
  // A port sits on such an edge so its 2 vertices are settlements that
  // border the ocean side of one specific tile.
  const edgeTileCount = {};
  tiles.forEach(t => t.edges.forEach(eid => {
    edgeTileCount[eid] = (edgeTileCount[eid] || 0) + 1;
  }));
  // Eligible: coastal edge AND at least one endpoint touches >= 2 tiles
  // (avoids dangling single-tile corner ports that look detached).
  const eligibleEdges = edges.filter(e => {
    if (edgeTileCount[e.id] !== 1) return false;
    const v1 = vertices[e.v1], v2 = vertices[e.v2];
    return v1.tiles.length >= 2 || v2.tiles.length >= 2;
  });

  // Shuffle for randomness (was previously sorted by angle — too regular).
  const shuffledEdges = shuffle(eligibleEdges);
  const portTypes = shuffle(PORT_TYPES);
  const ports = [];
  const usedVertices = new Set();
  let portIdx = 0;
  for (const edge of shuffledEdges) {
    if (portIdx >= 9) break;
    if (usedVertices.has(edge.v1) || usedVertices.has(edge.v2)) continue;
    const type = portTypes[portIdx++];
    ports.push({ vertices: [edge.v1, edge.v2], type });
    vertices[edge.v1].port = type;
    vertices[edge.v2].port = type;
    usedVertices.add(edge.v1); usedVertices.add(edge.v2);
  }

  return { tiles, vertices, edges, ports };
}

module.exports = { generateBoard, HEX_SIZE };
