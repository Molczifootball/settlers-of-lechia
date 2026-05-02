import React from 'react';
import { T, RES_NAMES } from '../i18n';

const RESOURCE_DATA = {
  wood:  { icon:'🌲', bg:'#2d6a2d', border:'#4d8a4d' },
  brick: { icon:'🧱', bg:'#b5451b', border:'#d5653b' },
  sheep: { icon:'🐑', bg:'#7ec850', border:'#9ee870' },
  wheat: { icon:'🌾', bg:'#d4a017', border:'#f4c037' },
  ore:   { icon:'⛰️', bg:'#7a7a8c', border:'#9a9aac' },
};

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:12 },
  title: { fontSize:13, fontWeight:700, color:'#aaa', marginBottom:10 },
  hand: { display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', minHeight:78 },
  card: (data) => ({
    width:48, height:68, borderRadius:6,
    background: `linear-gradient(135deg, ${data.bg} 0%, ${data.border} 100%)`,
    border: `2px solid ${data.border}`,
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
    padding:'6px 4px', position:'relative',
    boxShadow:'0 2px 4px #0006',
    transition: 'transform 0.15s',
  }),
  cardIcon: { fontSize:22, lineHeight:1 },
  cardLabel: { fontSize:8, color:'#fff', fontWeight:700, textAlign:'center', textTransform:'uppercase', letterSpacing:0.3 },
  badge: {
    position:'absolute', top:-6, right:-6,
    background:'#1a1a2e', color:'#f1c40f', borderRadius:'50%',
    width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:11, fontWeight:800, border:'2px solid #f1c40f',
  },
  empty: { color:'#555', fontSize:11, alignSelf:'center', textAlign:'center', width:'100%' },
};

export default function ResourceCards({ player }) {
  if (!player || player.resources?._hidden) return null;

  const cards = Object.entries(player.resources)
    .filter(([, n]) => n > 0);

  return (
    <div style={s.wrap}>
      <div style={s.title}>🃏 {T.labels.bank ? 'Twoja Ręka' : 'Your Hand'}</div>
      <div style={s.hand}>
        {cards.length === 0 && <div style={s.empty}>— brak kart —</div>}
        {cards.map(([res, count]) => {
          const data = RESOURCE_DATA[res];
          if (!data) return null;
          return (
            <div key={res} style={s.card(data)} title={`${RES_NAMES[res]} ×${count}`}>
              <div style={s.cardIcon}>{data.icon}</div>
              <div style={s.cardLabel}>{RES_NAMES[res]}</div>
              {count > 1 && <div style={s.badge}>{count}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
