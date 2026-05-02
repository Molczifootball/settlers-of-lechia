import React from 'react';
import Modal from './Modal';
import { T } from '../i18n';

const COLOR_MAP = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', orange:'#f39c12' };

const s = {
  list: { display:'flex', flexDirection:'column', gap:8 },
  btn: (color) => ({
    padding:'10px 14px', fontSize:14, color:'#fff',
    background: color, display:'flex', alignItems:'center', gap:10, textAlign:'left',
  }),
  dot: (color) => ({ width:14, height:14, borderRadius:'50%', background:COLOR_MAP[color] || '#888' }),
  skipRow: { display:'flex', gap:6, marginTop:12 },
  skip: { flex:1, padding:'10px', fontSize:12, background:'#0f3460', color:'#fff' },
  cancel: { flex:1, padding:'10px', fontSize:12, background:'#444', color:'#fff' },
};

export default function StealModal({ candidates, onPick, onSkipSteal, onCancel }) {
  return (
    <Modal title={T.msgs.stealFrom} onClose={onCancel}>
      <div style={s.list}>
        {candidates.length === 0 && <div style={{ color:'#aaa', fontSize:13 }}>{T.msgs.noOneToSteal}</div>}
        {candidates.map(p => (
          <button key={p.id} style={s.btn(COLOR_MAP[p.color])} onClick={() => onPick(p.id)}>
            <div style={s.dot(p.color)} />
            <div>{p.name}</div>
          </button>
        ))}
        <div style={s.skipRow}>
          <button style={s.skip} onClick={onSkipSteal}>Skip steal (move only)</button>
          <button style={s.cancel} onClick={onCancel}>{T.actions.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}
