import React from 'react';
import { T } from '../i18n';

const COSTS = {
  road:       { wood:1, brick:1 },
  settlement: { wood:1, brick:1, sheep:1, wheat:1 },
  city:       { wheat:2, ore:3 },
  devCard:    { sheep:1, wheat:1, ore:1 },
};

const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  wrap: { display:'flex', flexDirection:'column', gap:6 },
  title: { fontSize:11, fontWeight:700, color:'#aaa' },
  btn: (active, disabled) => ({
    padding:'8px 10px',
    background: active ? '#7b68ee' : '#0f3460',
    color: disabled ? '#666' : '#fff',
    border: active ? '2px solid #b0a0ff' : '2px solid transparent',
    fontSize:12, textAlign:'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }),
  cost: { fontSize:10, color:'#bbb', marginTop:2 },
  cancel: { padding:'6px', fontSize:11, background:'#c0392b', color:'#fff', marginTop:4 },
};

function costString(building) {
  return Object.entries(COSTS[building])
    .map(([res, n]) => `${n}${ICONS[res]}`).join(' ');
}

function canAfford(player, building) {
  if (!player?.resources || player.resources._hidden) return false;
  return Object.entries(COSTS[building]).every(([res, n]) => player.resources[res] >= n);
}

export default function BuildMenu({ player, isMyTurn, hasRolled, mode, setMode, onBuyDevCard, pendingAction }) {
  if (!player) return null;

  const canBuild = isMyTurn && hasRolled && !pendingAction;
  const freeRoadMode = pendingAction?.type === 'freeRoads' && pendingAction.playerId === player.id;
  const buildings = ['road', 'settlement', 'city'];

  return (
    <div style={s.wrap}>
      <div style={s.title}>{T.actions.build}</div>
      {buildings.map(b => {
        const affordable = freeRoadMode && b === 'road' ? true : canAfford(player, b);
        const enabled = (canBuild || (freeRoadMode && b === 'road')) && affordable;
        const active = mode === b;
        const glow = enabled && !active && affordable;
        return (
          <button key={b}
            className={glow ? 'afford-glow' : ''}
            style={s.btn(active, !enabled)} disabled={!enabled}
            onClick={() => setMode(active ? null : b)}>
            <div style={{ fontWeight:700 }}>{T.buildings[b]}</div>
            <div style={s.cost}>{freeRoadMode && b === 'road' ? 'Free!' : costString(b)}</div>
          </button>
        );
      })}
      {(() => {
        const devEnabled = canBuild && canAfford(player, 'devCard');
        return (
          <button
            className={devEnabled ? 'afford-glow' : ''}
            style={s.btn(false, !devEnabled)}
            disabled={!devEnabled}
            onClick={onBuyDevCard}>
            <div style={{ fontWeight:700 }}>🎴 {T.buildings.devCard}</div>
            <div style={s.cost}>{costString('devCard')}</div>
          </button>
        );
      })()}
      {mode && <button style={s.cancel} onClick={() => setMode(null)}>{T.actions.cancel}</button>}
    </div>
  );
}
