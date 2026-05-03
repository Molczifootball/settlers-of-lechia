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

  // Identify coastal vertices (those touching <3 tiles) and assign ports.
  const coastalVertices = vertices.filter(v => v.tiles.length < 3).map(v => v.id);
  // Pick 9 well-spaced coastal vertex pairs for ports (simplified: sample pairs)
  const portTypes = shuffle(PORT_TYPES);
  const ports = [];
  const usedVertices = new Set();
  // Sort coastal by angle from center for even spread
  const cx = 280, cy = 240;
  const sorted = coastalVertices.slice().sort((a, b) => {
    const va = vertices[a], vb = vertices[b];
    return Math.atan2(va.y - cy, va.x - cx) - Math.atan2(vb.y - cy, vb.x - cx);
  });
  let portIdx = 0;
  for (let i = 0; i < sorted.length && portIdx < 9; i += 2) {
    const v1 = sorted[i];
    const v2 = sorted[(i + 1) % sorted.length];
    if (usedVertices.has(v1) || usedVertices.has(v2)) continue;
    const type = portTypes[portIdx++];
    ports.push({ vertices: [v1, v2], type });
    vertices[v1].port = type;
    vertices[v2].port = type;
    usedVertices.add(v1); usedVertices.add(v2);
  }

  return { tiles, vertices, edges, ports };
}

module.exports = { generateBoard, HEX_SIZE };
