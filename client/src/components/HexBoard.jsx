import React from 'react';
import { canPlaceSettlement, canPlaceRoad, canUpgradeToCity } from '../boardLogic';
import { T, RES_NAMES } from '../i18n';
import { useSettings } from '../settings';

// Probability dots for each token (out of 36 dice rolls)
const TOKEN_PROB = { 2:'1/36', 3:'2/36', 4:'3/36', 5:'4/36', 6:'5/36', 8:'5/36', 9:'4/36', 10:'3/36', 11:'2/36', 12:'1/36' };

function tileTooltip(tile, isRobber) {
  const resName = RES_NAMES[tile.resource] || tile.resource;
  if (tile.resource === 'desert') return `${resName}${isRobber ? ' 🦹' : ''}`;
  const prob = TOKEN_PROB[tile.token];
  return `${resName} • ${tile.token}${prob ? ` (${prob})` : ''}${isRobber ? ' 🦹' : ''}`;
}

function portTooltip(port) {
  if (port.type === '3:1') return '⚓ 3:1 — any 3 → 1';
  return `${RES_NAMES[port.type]} 2:1 — 2 ${RES_NAMES[port.type]} → any 1`;
}

const RESOURCE_COLORS = {
  wood: '#2d6a2d', brick: '#b5451b', sheep: '#7ec850',
  wheat: '#d4a017', ore: '#7a7a8c', desert: '#c8b560',
};
const RESOURCE_ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️', desert:'🏜️' };
const COLOR_MAP = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', orange:'#f39c12' };
const PORT_ICONS = { '3:1':'⚓', wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const HEX_SIZE = 52;

function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) };
  });
}

function hexPoints(cx, cy, size) {
  return hexCorners(cx, cy, size).map(p => `${p.x},${p.y}`).join(' ');
}

// For iso, render a darker "rim" below each hex showing the 3 visible bottom faces.
// Each rim quad has its own shade for a chiseled-rock look.
function hexRim(cx, cy, size, depth) {
  const top = hexCorners(cx, cy, size);
  const bottom = top.map(p => ({ x: p.x, y: p.y + depth }));
  const quads = [];
  for (let i = 0; i < 6; i++) {
    const a = top[i], b = top[(i + 1) % 6];
    const c = bottom[(i + 1) % 6], d = bottom[i];
    // Only render edges whose midpoint is BELOW center (visible from "above" the board)
    const midY = (a.y + b.y) / 2;
    if (midY > cy + 1) {
      // Closer to bottom = darker. Edge at exactly center = lightest.
      const verticalness = Math.min(1, (midY - cy) / size);
      quads.push({
        points: `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`,
        verticalness,
      });
    }
  }
  return quads;
}

function darken(hex, factor = 0.7) {
  const m = hex.match(/^#(..)(..)(..)$/);
  if (!m) return hex;
  const r = Math.round(parseInt(m[1], 16) * factor);
  const g = Math.round(parseInt(m[2], 16) * factor);
  const b = Math.round(parseInt(m[3], 16) * factor);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

export default function HexBoard({ state, mode, myPlayer, onTileClick, onVertexClick, onEdgeClick }) {
  if (!state?.board) return null;
  const { tiles, vertices, edges, ports } = state.board;

  const vertexOwner = {};
  const edgeOwner = {};
  state.players.forEach(p => {
    (p.settlements || []).forEach(v => { vertexOwner[v] = { color: p.color, kind: 'settlement' }; });
    (p.cities || []).forEach(v => { vertexOwner[v] = { color: p.color, kind: 'city' }; });
    (p.roads || []).forEach(e => { edgeOwner[e] = { color: p.color }; });
  });

  const svgWidth = 580, svgHeight = 520;
  const offsetX = 30, offsetY = 20;

  const inSetup = state.phase === 'setup1' || state.phase === 'setup2';
  const showSettlementSpots = mode === 'settlement';
  const showCitySpots = mode === 'city';
  const showRoadSpots = mode === 'road';
  const showRobberSpots = mode === 'robber';

  // Compute valid spots client-side
  const validVertices = new Set();
  const validEdges = new Set();
  if (showSettlementSpots && myPlayer) {
    vertices.forEach(v => {
      if (canPlaceSettlement(state, myPlayer, v.id, inSetup)) validVertices.add(v.id);
    });
  }
  if (showCitySpots && myPlayer) {
    (myPlayer.settlements || []).forEach(v => {
      if (canUpgradeToCity(myPlayer, v)) validVertices.add(v);
    });
  }
  if (showRoadSpots && myPlayer) {
    edges.forEach(e => {
      if (canPlaceRoad(state, myPlayer, e.id, inSetup, state.lastSetupVertex)) validEdges.add(e.id);
    });
  }

  const settings = useSettings();
  const isoMode = settings.viewMode === 'iso';
  const TILE_DEPTH = 22;
  const Y_SQUASH = 0.62; // More pronounced "looking down at table" effect

  const isoTransform = `translate(0, ${svgHeight * 0.18}) scale(1, ${Y_SQUASH})`;

  return (
    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ background:'#0a1733', borderRadius:12, display:'block' }}>
      <rect width={svgWidth} height={svgHeight} fill="#0a1733" />
      <g transform={isoMode ? isoTransform : ''}>

      {/* Tile rims (iso depth) — drawn first so the top hex covers them properly */}
      {isoMode && tiles.map(tile => {
        const cx = tile.cx + offsetX, cy = tile.cy + offsetY;
        const rims = hexRim(cx, cy, HEX_SIZE - 2, TILE_DEPTH);
        const base = RESOURCE_COLORS[tile.resource];
        return rims.map((rim, i) => (
          <polygon key={`rim${tile.id}-${i}`} points={rim.points}
            fill={darken(base, 0.55 - rim.verticalness * 0.2)}
            stroke="#0a1733" strokeWidth={0.5}
            pointerEvents="none" />
        ));
      })}

      {/* Tiles */}
      {tiles.map(tile => {
        const isCurrentRobberTile = tile.id === state.robberTile;
        const tileClickable = showRobberSpots && !isCurrentRobberTile;
        return (
        <g key={`t${tile.id}`} onClick={() => tileClickable && onTileClick?.(tile.id)}
           style={{ cursor: tileClickable ? 'pointer' : 'default' }}>
          <title>{tileTooltip(tile, tile.id === state.robberTile)}</title>
          <polygon
            points={hexPoints(tile.cx + offsetX, tile.cy + offsetY, HEX_SIZE - 2)}
            fill={RESOURCE_COLORS[tile.resource]}
            stroke={tileClickable ? '#fff' : '#1a1a2e'}
            strokeWidth={tileClickable ? 3 : 2}
            className="hex-tile"
            opacity={showRobberSpots && isCurrentRobberTile ? 0.5 : 1}
          />
          <text x={tile.cx + offsetX} y={tile.cy + offsetY - 8} textAnchor="middle"
                fontSize={18} style={{ userSelect:'none', pointerEvents:'none' }}>
            {RESOURCE_ICONS[tile.resource]}
          </text>
          {tile.token && (
            <>
              <circle cx={tile.cx + offsetX} cy={tile.cy + offsetY + 10} r={13} fill="#f5e6c8" pointerEvents="none" />
              <text x={tile.cx + offsetX} y={tile.cy + offsetY + 15} textAnchor="middle"
                fontSize={12} fontWeight="bold"
                fill={tile.token === 6 || tile.token === 8 ? '#c0392b' : '#222'}
                style={{ userSelect:'none', pointerEvents:'none' }}>
                {tile.token}
              </text>
            </>
          )}
          {tile.id === state.robberTile && (
            <text x={tile.cx + offsetX} y={tile.cy + offsetY + 32} textAnchor="middle"
              fontSize={20} pointerEvents="none">🦹</text>
          )}
        </g>
        );
      })}

      {/* Ports — render only on the COASTAL VERTEX, not at edge midpoint, so roads stay visible */}
      {(ports || []).map((port, i) => {
        const v1 = vertices[port.vertices[0]];
        const v2 = vertices[port.vertices[1]];
        // Place port marker offset from board center, away from coastal edge
        const cx0 = (v1.x + v2.x) / 2;
        const cy0 = (v1.y + v2.y) / 2;
        // Push outward away from board center (280, 240)
        const dx = cx0 - 280, dy = cy0 - 240;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const cx = cx0 + (dx / len) * 22 + offsetX;
        const cy = cy0 + (dy / len) * 22 + offsetY;
        return (
          <g key={`port${i}`}>
            <title>{portTooltip(port)}</title>
            <line x1={v1.x + offsetX} y1={v1.y + offsetY} x2={cx} y2={cy} stroke="#f5e6c8" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.5} pointerEvents="none" />
            <line x1={v2.x + offsetX} y1={v2.y + offsetY} x2={cx} y2={cy} stroke="#f5e6c8" strokeWidth={1.5} strokeDasharray="3,2" opacity={0.5} pointerEvents="none" />
            <circle cx={cx} cy={cy} r={13} fill="#f5e6c8" stroke="#7b68ee" strokeWidth={2} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={13} pointerEvents="none">
              {PORT_ICONS[port.type] || '?'}
            </text>
            <text x={cx} y={cy + 22} textAnchor="middle" fontSize={9} fill="#fff" fontWeight="bold" pointerEvents="none">
              {port.type === '3:1' ? '3:1' : '2:1'}
            </text>
          </g>
        );
      })}

      {/* Roads — wrap rotation in <g> so CSS animations don't override the SVG transform */}
      {edges.map(edge => {
        const owner = edgeOwner[edge.id];
        const v1 = vertices[edge.v1], v2 = vertices[edge.v2];
        const cx = (v1.x + v2.x) / 2 + offsetX;
        const cy = (v1.y + v2.y) / 2 + offsetY;
        const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x) * 180 / Math.PI;

        if (owner) {
          return (
            <g key={`e${edge.id}`} transform={`rotate(${angle} ${cx} ${cy})`} pointerEvents="none">
              <rect x={cx - 20} y={cy - 5} width={40} height={10}
                fill={COLOR_MAP[owner.color]}
                stroke="#1a1a2e" strokeWidth={1.5}
                rx={2} />
            </g>
          );
        }
        if (showRoadSpots && validEdges.has(edge.id)) {
          return (
            <g key={`e${edge.id}`}>
              <circle cx={cx} cy={cy} r={8}
                fill="rgba(255,255,255,0.15)" stroke="#7b68ee" strokeWidth={2}
                style={{ cursor:'pointer' }} className="build-spot"
                onClick={() => onEdgeClick?.(edge.id)} />
            </g>
          );
        }
        return null;
      })}

      {/* Vertices */}
      {vertices.map(v => {
        const owner = vertexOwner[v.id];
        const x = v.x + offsetX, y = v.y + offsetY;
        const cityUpgradeable = showCitySpots && owner?.kind === 'settlement' && validVertices.has(v.id);

        if (owner) {
          const interactive = cityUpgradeable;
          const handler = interactive ? () => onVertexClick?.(v.id) : undefined;
          const cursor = interactive ? 'pointer' : 'default';
          const piece = owner.kind === 'settlement' ? (
            <polygon
              points={`${x-8},${y+6} ${x-8},${y-3} ${x},${y-10} ${x+8},${y-3} ${x+8},${y+6}`}
              fill={COLOR_MAP[owner.color]} stroke="#1a1a2e" strokeWidth={1.5}
              className="placed-piece"
              style={{ cursor }}
              onClick={handler}
              pointerEvents={interactive ? 'auto' : 'none'} />
          ) : (
            <rect x={x-10} y={y-10} width={20} height={20}
              fill={COLOR_MAP[owner.color]} stroke="#1a1a2e" strokeWidth={1.5}
              rx={2} className="placed-piece"
              pointerEvents="none" />
          );
          return (
            <g key={`v${v.id}`}>
              {cityUpgradeable && (
                <circle cx={x} cy={y} r={14}
                  fill="none" stroke="#f1c40f" strokeWidth={3}
                  className="build-spot" pointerEvents="none" />
              )}
              {piece}
            </g>
          );
        }
        if (showSettlementSpots && validVertices.has(v.id)) {
          return (
            <circle key={`v${v.id}`} cx={x} cy={y} r={8}
              fill="rgba(255,255,255,0.15)" stroke="#f1c40f" strokeWidth={2.5}
              style={{ cursor:'pointer' }} className="build-spot"
              onClick={() => onVertexClick?.(v.id)} />
          );
        }
        return null;
      })}
      </g>
    </svg>
  );
}
