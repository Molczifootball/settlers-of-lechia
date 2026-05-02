import React from 'react';
import Modal from './Modal';
import { T } from '../i18n';

const COLOR_MAP = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', orange:'#f39c12' };

const s = {
  hero: { textAlign:'center', fontSize:32, fontWeight:800, color:'#f1c40f', marginBottom:16 },
  scoreboard: { display:'flex', flexDirection:'column', gap:8, marginTop:14 },
  row: { display:'flex', alignItems:'center', gap:10, padding:10, background:'#0f3460', borderRadius:8 },
  rowWin: { background:'#1e3d2e', border:'2px solid #f1c40f' },
  dot: (color) => ({ width:14, height:14, borderRadius:'50%', background:COLOR_MAP[color] || '#888' }),
  name: { flex:1, fontWeight:700 },
  vp: { fontSize:18, fontWeight:800, color:'#f1c40f' },
  detail: { fontSize:11, color:'#aaa', marginTop:2 },
  btn: { width:'100%', padding:12, marginTop:18, background:'#7b68ee', color:'#fff', fontSize:15 },
};

export default function EndGameScreen({ state }) {
  if (!state.winner) return null;
  const sorted = [...state.players].sort((a, b) => b.victoryPoints - a.victoryPoints);
  const winner = sorted[0];

  return (
    <Modal>
      <div style={s.hero}>{T.msgs.youWin.split(' ')[0]} {winner.name}!</div>
      <div style={s.scoreboard}>
        {sorted.map((p, i) => (
          <div key={p.id} style={{ ...s.row, ...(p.id === state.winner ? s.rowWin : {}) }}>
            <div style={s.dot(p.color)} />
            <div style={s.name}>
              {i + 1}. {p.name}
              <div style={s.detail}>
                🏠 {p.settlements?.length || 0} | 🏰 {p.cities?.length || 0} | 🛤 {p.roads?.length || 0} | ⚔️ {p.knightsPlayed || 0}
                {p.hasLargestArmy && ' | 👑 Army'}
                {p.hasLongestRoad && ' | 🛣 Road'}
              </div>
            </div>
            <div style={s.vp}>⭐ {p.victoryPoints}</div>
          </div>
        ))}
      </div>
      <button style={s.btn} onClick={() => location.reload()}>{T.msgs.backToLobby}</button>
    </Modal>
  );
}
