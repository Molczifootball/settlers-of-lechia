import React from 'react';

const s = {
  wrap: { background:'#16213e', borderRadius:10, display:'flex', flexDirection:'column', minHeight:0, flex:1 },
  bar: { display:'flex', borderBottom:'2px solid #0f3460' },
  tab: (active, hasBadge) => ({
    flex:1, padding:'8px 4px', fontSize:11, fontWeight:700,
    background: active ? '#0f3460' : 'transparent',
    color: active ? '#fff' : '#888',
    border: 'none', borderRadius: 0,
    cursor: 'pointer', position: 'relative',
    borderTop: active ? '2px solid #7b68ee' : '2px solid transparent',
  }),
  badge: {
    position:'absolute', top:2, right:6,
    background:'#e74c3c', color:'#fff', borderRadius:8,
    fontSize:9, padding:'1px 5px', fontWeight:800,
  },
  content: { flex:1, padding:8, overflowY:'auto', minHeight:0 },
};

export default function Tabs({ tabs, active, onChange }) {
  const current = tabs.find(t => t.id === active) || tabs[0];
  return (
    <div style={s.wrap}>
      <div style={s.bar}>
        {tabs.map(t => (
          <button key={t.id} style={s.tab(t.id === active)}
            onClick={() => onChange(t.id)}
            disabled={t.disabled}>
            {t.icon} {t.label}
            {t.badge > 0 && <span style={s.badge}>{t.badge}</span>}
          </button>
        ))}
      </div>
      <div style={s.content} className="scrollable">{current?.content}</div>
    </div>
  );
}
