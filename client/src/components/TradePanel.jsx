import React, { useState } from 'react';
import Modal from './Modal';
import socket from '../socket';
import { T, RES_NAMES } from '../i18n';

const RES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  wrap: { display:'flex', flexDirection:'column', gap:6 },
  title: { fontSize:11, fontWeight:700, color:'#aaa' },
  btn: (bg) => ({ padding:'8px', fontSize:12, background:bg, color:'#fff' }),
  section: { marginBottom:14 },
  label: { fontSize:13, color:'#aaa', marginBottom:6, fontWeight:600 },
  resRow: { display:'flex', alignItems:'center', gap:10, padding:6, background:'#0f3460', borderRadius:6, marginBottom:4 },
  resLabel: { flex:1, fontSize:12 },
  ctrl: { display:'flex', alignItems:'center', gap:6 },
  ctrlBtn: { width:24, height:24, padding:0, fontSize:14, background:'#7b68ee', color:'#fff' },
  count: { minWidth:24, textAlign:'center', fontSize:13 },
  ratio: { fontSize:11, color:'#aaa' },
};

// Generic 1-step picker (player trades, want side of bank)
function ResourcePicker({ values, onChange, max, ratios }) {
  return (
    <>
      {RES.map(r => (
        <div key={r} style={s.resRow}>
          <div>{ICONS[r]}</div>
          <div style={s.resLabel}>
            {RES_NAMES[r]}
            {ratios && ratios[r] && <span style={s.ratio}> ({ratios[r]}:1)</span>}
            {max && max[r] !== undefined && <span style={s.ratio}> max {max[r]}</span>}
          </div>
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

// Bank-give picker: clicking +/- adds/removes the resource's RATIO so values
// always stay valid multiples (e.g. clicking + on wood with 4:1 adds 4).
function BankGivePicker({ values, onChange, max, ratios }) {
  return (
    <>
      {RES.map(r => {
        const ratio = ratios?.[r] || 4;
        const cur = values[r] || 0;
        const have = max?.[r] || 0;
        const canInc = cur + ratio <= have;
        return (
          <div key={r} style={s.resRow}>
            <div>{ICONS[r]}</div>
            <div style={s.resLabel}>
              {RES_NAMES[r]} <span style={s.ratio}>({ratio}:1)</span>
              <span style={s.ratio}> have {have}</span>
            </div>
            <div style={s.ctrl}>
              <button style={s.ctrlBtn}
                onClick={() => onChange({ ...values, [r]: Math.max(0, cur - ratio) })}>−</button>
              <div style={s.count}>{cur}</div>
              <button style={s.ctrlBtn}
                disabled={!canInc}
                onClick={() => canInc && onChange({ ...values, [r]: cur + ratio })}>+</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function getBankRatios(state, player) {
  const myV = new Set([...(player.settlements || []), ...(player.cities || [])]);
  const ratios = {};
  RES.forEach(r => { ratios[r] = 4; });
  myV.forEach(vid => {
    const port = state.board.vertices[vid]?.port;
    if (!port) return;
    if (port === '3:1') RES.forEach(r => { ratios[r] = Math.min(ratios[r], 3); });
    else ratios[port] = Math.min(ratios[port] || 4, 2);
  });
  return ratios;
}

export default function TradePanel({ state, me, isMyTurn, hasRolled, roomId }) {
  const [open, setOpen] = useState(null);
  const [give, setGive] = useState({});
  const [want, setWant] = useState({});
  const [target, setTarget] = useState('all'); // 'all' | playerId

  if (!me) return null;

  const canTrade = isMyTurn && hasRolled && !state.pendingAction && !state.activeTrade;
  const opponents = state.players.filter(p => p.id !== me.id);

  function reset() { setGive({}); setWant({}); setOpen(null); setTarget('all'); }

  function bankTrade() {
    socket.emit('game:bankTrade', { roomId, give, want }, (res) => {
      if (res?.error) alert(res.error);
      else reset();
    });
  }

  function proposeTrade() {
    const payload = { roomId, give, want };
    if (target !== 'all') payload.toPlayerId = target;
    socket.emit('game:proposeTrade', payload, (res) => {
      if (res?.error) alert(res.error);
      else reset();
    });
  }

  const bankRatios = getBankRatios(state, me);

  return (
    <>
      <div style={s.wrap}>
        <div style={s.title}>{T.actions.trade}</div>
        <button style={s.btn(canTrade ? '#3498db' : '#444')} disabled={!canTrade} onClick={() => setOpen('bank')}>
          🏦 {T.actions.bankTrade}
        </button>
        <button style={s.btn(canTrade ? '#16a085' : '#444')} disabled={!canTrade} onClick={() => setOpen('player')}>
          🤝 Player Trade
        </button>
      </div>

      {open === 'bank' && (() => {
        const giveUnits = Object.entries(give).reduce((sum, [r, n]) => {
          const ratio = bankRatios[r] || 4;
          return sum + (n > 0 && n % ratio === 0 ? n / ratio : 0);
        }, 0);
        const wantUnits = Object.values(want).reduce((a, b) => a + (b > 0 ? b : 0), 0);
        const balanced = giveUnits > 0 && giveUnits === wantUnits;
        const diff = giveUnits - wantUnits;
        return (
          <Modal title={`🏦 ${T.actions.bankTrade}`} onClose={reset}>
            <div style={s.label}>{T.labels.give}</div>
            <BankGivePicker values={give} onChange={setGive} max={me.resources} ratios={bankRatios} />
            <div style={s.label}>{T.labels.want}</div>
            <ResourcePicker values={want} onChange={setWant} />

            <div style={{
              padding:'8px 10px', background: balanced ? '#1e3d2e' : '#2a2a3e',
              border: `2px solid ${balanced ? '#2ecc71' : '#444'}`,
              borderRadius:6, marginTop:10, fontSize:12, textAlign:'center', fontWeight:700,
            }}>
              {balanced
                ? `✓ Balanced: ${giveUnits} ↔ ${wantUnits}`
                : giveUnits === 0 && wantUnits === 0
                  ? 'Pick what to give and want'
                  : diff > 0
                    ? `Give ${diff} more want unit${diff > 1 ? 's' : ''} or remove ${diff * (bankRatios[Object.keys(give).find(k => give[k] > 0)] || 4)} resource${diff > 1 ? 's' : ''} from give`
                    : `Need ${-diff} more want unit${-diff > 1 ? 's' : ''}`}
            </div>

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button style={{ ...s.btn('#7b68ee'), flex:1, padding:10, opacity: balanced ? 1 : 0.5 }}
                disabled={!balanced} onClick={bankTrade}>{T.actions.confirm}</button>
              <button style={{ ...s.btn('#444'), flex:1, padding:10 }} onClick={reset}>{T.actions.cancel}</button>
            </div>
          </Modal>
        );
      })()}

      {open === 'player' && (
        <Modal title="🤝 Trade with Players" onClose={reset}>
          <div style={s.label}>{T.labels.give}</div>
          <ResourcePicker values={give} onChange={setGive} max={me.resources} />
          <div style={s.label}>{T.labels.want}</div>
          <ResourcePicker values={want} onChange={setWant} />

          <div style={{ ...s.label, marginTop:8 }}>{T.labels.to}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
            <button
              style={{ ...s.btn(target === 'all' ? '#16a085' : '#0f3460'), padding:'6px 10px', flex:'1 1 80px' }}
              onClick={() => setTarget('all')}>
              👥 {T.labels.everyone}
            </button>
            {opponents.map(p => (
              <button key={p.id}
                style={{ ...s.btn(target === p.id ? '#16a085' : '#0f3460'), padding:'6px 10px', flex:'1 1 80px' }}
                onClick={() => setTarget(p.id)}>
                {p.name}{p.isBot ? ' 🤖' : ''}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button style={{ ...s.btn('#16a085'), flex:1, padding:10 }} onClick={proposeTrade}>Propose</button>
            <button style={{ ...s.btn('#444'), flex:1, padding:10 }} onClick={reset}>{T.actions.cancel}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
