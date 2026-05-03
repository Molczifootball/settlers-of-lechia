import React, { useState } from 'react';
import Modal from './Modal';
import socket from '../socket';
import { T, RES_NAMES } from '../i18n';

const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  side: { background:'#0f3460', borderRadius:8, padding:12, marginBottom:10 },
  label: { fontSize:11, color:'#aaa', marginBottom:6, fontWeight:600 },
  resList: { display:'flex', flexWrap:'wrap', gap:6 },
  chip: { background:'#1a2e54', borderRadius:5, padding:'4px 8px', fontSize:13 },
  arrow: { textAlign:'center', fontSize:20, margin:'8px 0', color:'#7b68ee' },
  btnRow: { display:'flex', gap:8, marginTop:14, flexWrap:'wrap' },
  btn: (bg, flex = 1) => ({ flex, padding:10, fontSize:14, color:'#fff', background:bg }),
  resRow: { display:'flex', alignItems:'center', gap:10, padding:6, background:'#0f3460', borderRadius:6, marginBottom:4 },
  resLabel: { flex:1, fontSize:12 },
  ctrl: { display:'flex', alignItems:'center', gap:6 },
  ctrlBtn: { width:24, height:24, padding:0, fontSize:14, background:'#7b68ee', color:'#fff' },
  count: { minWidth:24, textAlign:'center', fontSize:13 },
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

function ResourcePicker({ values, onChange, max }) {
  return (
    <>
      {RES.map(r => (
        <div key={r} style={s.resRow}>
          <div>{ICONS[r]}</div>
          <div style={s.resLabel}>{RES_NAMES[r]}{max && <span style={{ color:'#888', fontSize:11 }}> ({max[r] || 0})</span>}</div>
          <div style={s.ctrl}>
            <button style={s.ctrlBtn} onClick={() => onChange({ ...values, [r]: Math.max(0, (values[r] || 0) - 1) })}>−</button>
            <div style={s.count}>{values[r] || 0}</div>
            <button style={s.ctrlBtn} onClick={() => {
              const cur = values[r] || 0;
              if (max && cur >= (max[r] || 0)) return;
              onChange({ ...values, [r]: cur + 1 });
            }}>+</button>
          </div>
        </div>
      ))}
    </>
  );
}

export default function TradeOfferModal({ trade, fromName, isInitiator, isTarget, roomId, me }) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [give, setGive] = useState({});
  const [want, setWant] = useState({});

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

  function counter() {
    socket.emit('game:counterTrade', { roomId, give, want }, (res) => {
      if (res?.error) alert(res.error);
      else { setCounterOpen(false); setGive({}); setWant({}); }
    });
  }

  if (counterOpen) {
    return (
      <Modal title={`↩ Counter ${fromName}'s trade`} onClose={() => setCounterOpen(false)} variant="info">
        <div style={s.label}>You give:</div>
        <ResourcePicker values={give} onChange={setGive} max={me?.resources} />
        <div style={s.label}>You want from {fromName}:</div>
        <ResourcePicker values={want} onChange={setWant} />
        <div style={s.btnRow}>
          <button style={s.btn('#16a085')} onClick={counter}>Send Counter</button>
          <button style={s.btn('#444')} onClick={() => setCounterOpen(false)}>{T.actions.cancel}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`${fromName}${trade.isCounter ? ' counters' : ' proposes'} a trade`} variant="info">
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
          <button style={s.btn('#3498db')} onClick={() => setCounterOpen(true)}>↩ Counter</button>
          <button style={s.btn('#e74c3c')} onClick={() => respond(false)}>{T.actions.reject}</button>
        </div>
      )}
      {!isInitiator && !isTarget && (
        <div style={{ textAlign:'center', color:'#aaa', fontSize:13, marginTop:10 }}>Watching...</div>
      )}
    </Modal>
  );
}
