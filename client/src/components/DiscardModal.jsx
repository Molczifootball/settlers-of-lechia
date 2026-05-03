import React, { useState } from 'react';
import Modal from './Modal';
import socket from '../socket';
import { T, RES_NAMES } from '../i18n';

const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  resRow: { display:'flex', alignItems:'center', gap:10, padding:8, background:'#0f3460', borderRadius:6, marginBottom:6 },
  label: { flex:1, fontSize:13 },
  ctrl: { display:'flex', alignItems:'center', gap:6 },
  btn: { width:28, height:28, padding:0, fontSize:16, background:'#7b68ee', color:'#fff' },
  count: { minWidth:30, textAlign:'center', fontSize:14 },
  total: { textAlign:'center', fontSize:13, marginTop:8, padding:8, background:'#1a2e54', borderRadius:6 },
  confirm: { width:'100%', padding:10, marginTop:12, background:'#e74c3c', color:'#fff', fontSize:14 },
};

export default function DiscardModal({ player, count, roomId }) {
  const [picks, setPicks] = useState({});

  const total = Object.values(picks).reduce((a, b) => a + b, 0);
  const need = count - total;

  function inc(r) {
    if (need <= 0) return;
    if ((picks[r] || 0) >= (player.resources[r] || 0)) return;
    setPicks({ ...picks, [r]: (picks[r] || 0) + 1 });
  }
  function dec(r) {
    if ((picks[r] || 0) <= 0) return;
    setPicks({ ...picks, [r]: (picks[r] || 0) - 1 });
  }
  function confirm() {
    socket.emit('game:discard', { roomId, discarded: picks }, (res) => {
      if (res?.error) alert(res.error);
    });
  }

  return (
    <Modal title={T.msgs.mustDiscard.replace('%d', count)} variant="danger">
      {RES.map(r => (
        <div key={r} style={s.resRow}>
          <div>{ICONS[r]}</div>
          <div style={s.label}>{RES_NAMES[r]} ({player.resources[r] || 0})</div>
          <div style={s.ctrl}>
            <button style={s.btn} onClick={() => dec(r)}>−</button>
            <div style={s.count}>{picks[r] || 0}</div>
            <button style={s.btn} onClick={() => inc(r)}>+</button>
          </div>
        </div>
      ))}
      <div style={s.total}>
        Selected: {total} / {count}
      </div>
      <button style={s.confirm} disabled={total !== count} onClick={confirm}>
        {T.actions.confirm}
      </button>
    </Modal>
  );
}
