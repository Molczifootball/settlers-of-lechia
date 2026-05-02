import React, { useState } from 'react';
import socket from '../socket';
import Modal from './Modal';
import { T, RES_NAMES } from '../i18n';

const CARD_NAMES = (t) => ({
  knight: '⚔️ ' + t.devCards.knight,
  vp: '⭐ ' + t.devCards.vp,
  roadBuilding: '🛣️ ' + t.devCards.roadBuilding,
  yearOfPlenty: '🌽 ' + t.devCards.yearOfPlenty,
  monopoly: '💰 ' + t.devCards.monopoly,
});

const RESOURCES = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const RES_ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:12, display:'flex', flexDirection:'column', gap:6 },
  title: { fontSize:13, fontWeight:700, color:'#aaa' },
  card: (playable) => ({
    padding:'7px 9px', background:'#0f3460', borderRadius:6,
    border: playable ? '2px solid #f1c40f' : '2px solid transparent',
    fontSize:11, cursor: playable ? 'pointer' : 'default',
    opacity: playable ? 1 : 0.6,
  }),
  count: { fontSize:11, color:'#aaa' },
  resBtn: { padding:'10px 14px', background:'#0f3460', fontSize:14, margin:4, color:'#fff' },
};

export default function DevCards({ player, isMyTurn, hasRolled, roomId, pendingAction, awaitingRobber }) {
  const [yopOpen, setYopOpen] = useState(false);
  const [yopPicks, setYopPicks] = useState([]);
  const [monoOpen, setMonoOpen] = useState(false);

  if (!player || player.devCards?._hidden) return null;
  const N = CARD_NAMES(T);

  const grouped = {};
  (player.devCards || []).forEach(c => {
    grouped[c.type] = grouped[c.type] || { count: 0, playable: 0 };
    grouped[c.type].count++;
    if (c.playable) grouped[c.type].playable++;
  });

  const canPlayKnight = isMyTurn && grouped.knight?.playable > 0 && !pendingAction;
  const canPlayRB = isMyTurn && hasRolled && grouped.roadBuilding?.playable > 0 && !pendingAction;
  const canPlayYOP = isMyTurn && hasRolled && grouped.yearOfPlenty?.playable > 0 && !pendingAction;
  const canPlayMono = isMyTurn && hasRolled && grouped.monopoly?.playable > 0 && !pendingAction;

  function play(cardType, payload = {}) {
    socket.emit('game:playDevCard', { roomId, cardType, ...payload }, (res) => {
      if (res?.error) alert(res.error);
    });
  }

  function confirmYOP() {
    if (yopPicks.length !== 2) return;
    play('yearOfPlenty', { resources: yopPicks });
    setYopOpen(false); setYopPicks([]);
  }

  function pickYopRes(r) {
    if (yopPicks.length < 2) setYopPicks([...yopPicks, r]);
  }

  function pickMono(r) {
    play('monopoly', { resource: r });
    setMonoOpen(false);
  }

  return (
    <>
      <div style={s.wrap}>
        <div style={s.title}>🎴 {T.buildings.devCard}s</div>
        {Object.keys(grouped).length === 0 && (
          <div style={{ fontSize:12, color:'#666' }}>No cards</div>
        )}
        {Object.entries(grouped).map(([type, info]) => {
          let onClick;
          if (type === 'knight' && canPlayKnight) onClick = () => awaitingRobber('knight');
          if (type === 'roadBuilding' && canPlayRB) onClick = () => play('roadBuilding');
          if (type === 'yearOfPlenty' && canPlayYOP) onClick = () => setYopOpen(true);
          if (type === 'monopoly' && canPlayMono) onClick = () => setMonoOpen(true);
          return (
            <div key={type} style={s.card(!!onClick)} onClick={onClick}>
              <div style={{ fontWeight:700 }}>{N[type]} <span style={s.count}>×{info.count}</span></div>
              {info.playable > 0 && type !== 'vp' && onClick && (
                <div style={{ fontSize:10, color:'#f1c40f', marginTop:2 }}>▶ Play</div>
              )}
              {info.playable === 0 && info.count > 0 && type !== 'vp' && (
                <div style={{ fontSize:10, color:'#666', marginTop:2 }}>Next turn</div>
              )}
            </div>
          );
        })}
      </div>

      {yopOpen && (
        <Modal title={`🌽 ${T.devCards.yearOfPlenty}`} onClose={() => { setYopOpen(false); setYopPicks([]); }}>
          <div style={{ fontSize:13, color:'#bbb', marginBottom:12 }}>Pick 2 resources:</div>
          <div style={{ display:'flex', flexWrap:'wrap' }}>
            {RESOURCES.map(r => (
              <button key={r} style={s.resBtn} onClick={() => pickYopRes(r)}>
                {RES_ICONS[r]} {RES_NAMES[r]}
              </button>
            ))}
          </div>
          <div style={{ marginTop:10, fontSize:13 }}>
            Picked: {yopPicks.map(r => RES_ICONS[r]).join(' ')}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button style={{ ...s.resBtn, flex:1, background:'#7b68ee' }}
              disabled={yopPicks.length !== 2} onClick={confirmYOP}>{T.actions.confirm}</button>
            <button style={{ ...s.resBtn, flex:1, background:'#444' }}
              onClick={() => { setYopOpen(false); setYopPicks([]); }}>{T.actions.cancel}</button>
          </div>
        </Modal>
      )}

      {monoOpen && (
        <Modal title={`💰 ${T.devCards.monopoly}`} onClose={() => setMonoOpen(false)}>
          <div style={{ fontSize:13, color:'#bbb', marginBottom:12 }}>Pick resource to claim from all opponents:</div>
          <div style={{ display:'flex', flexWrap:'wrap' }}>
            {RESOURCES.map(r => (
              <button key={r} style={s.resBtn} onClick={() => pickMono(r)}>
                {RES_ICONS[r]} {RES_NAMES[r]}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
