import React from 'react';
import Modal from './Modal';
import { T } from '../i18n';

const COSTS = {
  road:       { wood:1, brick:1 },
  settlement: { wood:1, brick:1, sheep:1, wheat:1 },
  city:       { wheat:2, ore:3 },
  devCard:    { sheep:1, wheat:1, ore:1 },
};

function canAfford(player, building) {
  return Object.entries(COSTS[building]).every(([r, n]) => (player.resources[r] || 0) >= n);
}

const s = {
  list: { listStyle:'none', padding:0, margin:'10px 0', fontSize:13 },
  item: { padding:'5px 8px', background:'#0f3460', borderRadius:5, marginBottom:4 },
  warn: { color:'#f39c12', fontWeight:700, fontSize:13 },
  btnRow: { display:'flex', gap:8, marginTop:14 },
  btn: (bg) => ({ flex:1, padding:10, background:bg, color:'#fff', fontSize:14 }),
};

export function getEndTurnWarnings(player) {
  const warnings = [];
  if (!player) return warnings;
  if (player.resources?._hidden) return warnings;

  const affordable = [];
  if (canAfford(player, 'city'))       affordable.push(T.buildings.city);
  if (canAfford(player, 'settlement')) affordable.push(T.buildings.settlement);
  if (canAfford(player, 'devCard'))    affordable.push(T.buildings.devCard);
  if (affordable.length > 0) {
    warnings.push(T.msgs.canAfford.replace('%s', affordable.join(', ')));
  }

  const playableNonVP = (player.devCards || []).filter(c => c.playable && c.type !== 'vp');
  if (playableNonVP.length > 0) {
    warnings.push(T.msgs.havePlayableDev.replace('%d', playableNonVP.length));
  }
  return warnings;
}

export default function EndTurnConfirm({ warnings, onConfirm, onCancel }) {
  return (
    <Modal title={`⚠️ ${T.actions.endTurn}?`} onClose={onCancel}>
      <div style={s.warn}>{T.msgs.endTurnWarn}</div>
      <ul style={s.list}>
        {warnings.map((w, i) => (
          <li key={i} style={s.item}>• {w}</li>
        ))}
      </ul>
      <div style={s.btnRow}>
        <button style={s.btn('#7b68ee')} onClick={onConfirm}>{T.actions.endTurn}</button>
        <button style={s.btn('#444')} onClick={onCancel}>{T.actions.cancel}</button>
      </div>
    </Modal>
  );
}
