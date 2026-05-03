import React from 'react';
import { T, RES_NAMES } from '../i18n';

const s = {
  wrap: { background:'#16213e', borderRadius:10, padding:8 },
  title: { fontSize:11, fontWeight:700, color:'#aaa', marginBottom:6 },
  hand: { display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center', minHeight:84 },
  card: { position:'relative', width:60, height:84 },
  img: { width:'100%', height:'100%', objectFit:'contain', display:'block' },
  badge: {
    position:'absolute', top:-4, right:-4,
    background:'#1a1a2e', color:'#f1c40f', borderRadius:'50%',
    width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:11, fontWeight:800, border:'2px solid #f1c40f', zIndex:1,
  },
  empty: { color:'#555', fontSize:11, alignSelf:'center', textAlign:'center', width:'100%', padding:20 },
};

export default function ResourceCards({ player }) {
  if (!player || player.resources?._hidden) return null;

  const cards = Object.entries(player.resources).filter(([, n]) => n > 0);

  return (
    <div style={s.wrap}>
      <div style={s.title}>🃏 {T.labels.yourHand || 'Your Hand'}</div>
      <div style={s.hand}>
        {cards.length === 0 && <div style={s.empty}>— empty —</div>}
        {cards.map(([res, count]) => (
          <div key={res} style={s.card} title={`${RES_NAMES[res]} ×${count}`}>
            <img src={`/assets/cards/card_resource_${res}.png`} alt={RES_NAMES[res]} style={s.img} />
            {count > 1 && <div style={s.badge}>{count}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
