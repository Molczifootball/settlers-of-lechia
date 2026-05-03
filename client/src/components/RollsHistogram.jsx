import React from 'react';
import { T } from '../i18n';

const NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const EXPECTED = { 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:5, 9:4, 10:3, 11:2, 12:1 };

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:10 },
  title: { fontSize:12, fontWeight:700, color:'#aaa', marginBottom:6 },
  row: { display:'flex', alignItems:'flex-end', gap:2, height:60 },
  bar: (h, special, isSeven) => ({
    flex:1,
    height: Math.max(2, h),
    background: isSeven ? '#c0392b' : (special ? '#e74c3c' : '#7b68ee'),
    borderRadius: '2px 2px 0 0',
    position:'relative',
    minHeight: 2,
    transition: 'height 0.3s ease',
  }),
  labels: { display:'flex', gap:2, marginTop:3 },
  label: { flex:1, fontSize:9, color:'#888', textAlign:'center' },
};

export default function RollsHistogram({ rolls }) {
  const counts = {};
  NUMBERS.forEach(n => { counts[n] = 0; });
  (rolls || []).forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const max = Math.max(1, ...Object.values(counts));
  const total = (rolls || []).length;

  return (
    <div style={s.wrap}>
      <div style={s.title}>📊 {T.labels.rollsTitle || 'Rolls'} ({total})</div>
      <div style={s.row}>
        {NUMBERS.map(n => (
          <div key={n} style={s.bar(counts[n] / max * 60, n === 6 || n === 8, n === 7)}
            title={`${n}: ${counts[n]} (expected ${(EXPECTED[n] / 36 * total).toFixed(1)})`} />
        ))}
      </div>
      <div style={s.labels}>
        {NUMBERS.map(n => (
          <div key={n} style={{ ...s.label, color: n === 6 || n === 8 ? '#e74c3c' : (n === 7 ? '#c0392b' : '#888') }}>{n}</div>
        ))}
      </div>
    </div>
  );
}
