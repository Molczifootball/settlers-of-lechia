import React from 'react';
import Modal from './Modal';
import socket from '../socket';
import { T, RES_NAMES } from '../i18n';

const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  side: { background:'#0f3460', borderRadius:8, padding:12, marginBottom:10 },
  label: { fontSize:11, color:'#aaa', marginBottom:6, fontWeight:600 },
  resList: { display:'flex', flexWrap:'wrap', gap:6 },
  chip: { background:'#1a2e54', borderRadius:5, padding:'4px 8px', fontSize:13 },
  arrow: { textAlign:'center', fontSize:20, margin:'8px 0', color:'#7b68ee' },
  btnRow: { display:'flex', gap:8, marginTop:14 },
  btn: (bg) => ({ flex:1, padding:10, fontSize:14, color:'#fff', background:bg }),
};

function ResList({ resources }) {
  const items = Object.entries(resources).filter(([, n]) => n > 0);
  if (items.length === 0) return <div style={{ color:'#888', fontSize:12 }}>—</div>;
  return (
    <div style={s.resList}>
      {items.map(([r, n]) => (
        <div key={r} style={s.chip}>{ICONS[r]} {RES_NAMES[r]} ×{n}</div>
      ))}
    </div>
  );
}

export default function TradeOfferModal({ trade, fromName, isInitiator, isTarget, roomId }) {
  function respond(accept) {
    socket.emit('game:respondTrade', { roomId, accept }, (res) => {
      if (res?.error) alert(res.error);
    });
  }

  function cancel() {
    socket.emit('game:cancelTrade', { roomId }, (res) => {
      if (res?.error) alert(res.error);
    });
  }

  return (
    <Modal title={`${fromName} proposes a trade`}>
      <div style={s.side}>
        <div style={s.label}>They give:</div>
        <ResList resources={trade.give} />
      </div>
      <div style={s.arrow}>⬇️</div>
      <div style={s.side}>
        <div style={s.label}>They want:</div>
        <ResList resources={trade.want} />
      </div>

      {isInitiator && (
        <div style={s.btnRow}>
          <button style={s.btn('#444')} onClick={cancel}>{T.actions.cancel}</button>
        </div>
      )}
      {isTarget && (
        <div style={s.btnRow}>
          <button style={s.btn('#2ecc71')} onClick={() => respond(true)}>{T.actions.accept}</button>
          <button style={s.btn('#e74c3c')} onClick={() => respond(false)}>{T.actions.reject}</button>
        </div>
      )}
      {!isInitiator && !isTarget && (
        <div style={{ textAlign:'center', color:'#aaa', fontSize:13, marginTop:10 }}>Watching...</div>
      )}
    </Modal>
  );
}
