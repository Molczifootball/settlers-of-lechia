import React, { useEffect, useState } from 'react';

const ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };

const s = {
  wrap: {
    position:'fixed', top:'40%', left:'50%',
    transform:'translate(-50%, -50%)',
    pointerEvents:'none', zIndex:250,
    display:'flex', gap:10,
  },
  chip: (i) => ({
    background:'#16213e', borderRadius:10, padding:'14px 18px',
    fontSize:24, fontWeight:800, color:'#f1c40f',
    boxShadow:'0 4px 16px #000a',
    animation: `resourceFloat 1.5s ease-out ${i * 0.08}s forwards`,
    opacity: 0,
  }),
};

// Floating notification of resources just gained.
export default function ResourceFlash({ trigger, resources }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (!resources || Object.keys(resources).length === 0) return;
    setShow({ id: trigger, resources });
    const t = setTimeout(() => setShow(null), 1700);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;
  const items = Object.entries(show.resources).filter(([, n]) => n > 0);
  if (items.length === 0) return null;

  return (
    <div style={s.wrap}>
      {items.map(([r, n], i) => (
        <div key={r} style={s.chip(i)}>{ICONS[r]} +{n}</div>
      ))}
    </div>
  );
}
