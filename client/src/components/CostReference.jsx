import React from 'react';
import { T } from '../i18n';

const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };
const COSTS = {
  road: { wood:1, brick:1 },
  settlement: { wood:1, brick:1, sheep:1, wheat:1 },
  city: { wheat:2, ore:3 },
  devCard: { sheep:1, wheat:1, ore:1 },
};

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:12, fontSize:11 },
  title: { fontSize:13, fontWeight:700, color:'#aaa', marginBottom:6 },
  row: { display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #0f3460' },
  name: { fontWeight:600, color:'#ccc' },
  cost: { color:'#aaa' },
};

export default function CostReference() {
  return (
    <div style={s.wrap}>
      <div style={s.title}>💰 Costs</div>
      {Object.entries(COSTS).map(([b, c]) => (
        <div key={b} style={s.row}>
          <span style={s.name}>{T.buildings[b]}</span>
          <span style={s.cost}>{Object.entries(c).map(([r, n]) => `${n}${ICONS[r]}`).join(' ')}</span>
        </div>
      ))}
    </div>
  );
}
