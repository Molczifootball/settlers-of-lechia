import React from 'react';
import Modal from './Modal';
import { T } from '../i18n';

const COLOR_MAP = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', orange:'#f39c12' };

const s = {
  list: { display:'flex', flexDirection:'column', gap:8 },
  btn: (color, disabled) => ({
    padding:'10px 14px', fontSize:14, color:'#fff',
    background: color, display:'flex', alignItems:'center', gap:10, textAlign:'left',
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  dot: (color) => ({ width:14, height:14, borderRadius:'50%', background:COLOR_MAP[color] || '#888' }),
  cards: { marginLeft:'auto', fontSize:11, color:'#eee' },
  emptyHint: { color:'#888', fontSize:11, marginTop:4, fontStyle:'italic' },
  skipRow: { display:'flex', gap:6, marginTop:12 },
  skip: { flex:1, padding:'10px', fontSize:12, background:'#0f3460', color:'#fff' },
  cancel: { flex:1, padding:'10px', fontSize:12, background:'#444', color:'#fff' },
};

function getTotalCards(p) {
  if (p.resources?._hidden) return p.resources.total || 0;
  return Object.values(p.resources || {}).reduce((a, b) => a + b, 0);
}

export default function StealModal({ candidates, onPick, onSkipSteal, onCancel }) {
  const candidatesWithCounts = candidates.map(p => ({ ...p, totalCards: getTotalCards(p) }));
  const noOneHasCards = candidatesWithCounts.length > 0 && candidatesWithCounts.every(c => c.totalCards === 0);

  return (
    <Modal title={T.msgs.stealFrom} onClose={onCancel} variant="warning">
      <div style={s.list}>
        {candidates.length === 0 && <div style={{ color:'#aaa', fontSize:13 }}>{T.msgs.noOneToSteal}</div>}
        {noOneHasCards && (
          <div style={{ color:'#f39c12', fontSize:12, padding:8, background:'#3a2a1a', borderRadius:6, marginBottom:4 }}>
            ⚠️ All players on this tile have empty hands — nothing to steal.
          </div>
        )}
        {candidatesWithCounts.map(p => {
          const empty = p.totalCards === 0;
          return (
            <button key={p.id} style={s.btn(COLOR_MAP[p.color], empty)}
              disabled={empty}
              onClick={() => !empty && onPick(p.id)}>
              <div style={s.dot(p.color)} />
              <div>{p.name}</div>
              <div style={s.cards}>📦 {p.totalCards}</div>
            </button>
          );
        })}
        <div style={s.skipRow}>
          <button style={s.skip} onClick={onSkipSteal}>Skip steal (move only)</button>
          <button style={s.cancel} onClick={onCancel}>{T.actions.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}
