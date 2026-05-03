import React, { useState, useEffect } from 'react';

const TURN_LIMIT = 120;

const s = {
  bar: (pct, danger) => ({
    height:4, width: pct + '%',
    background: danger ? '#e74c3c' : '#7b68ee',
    transition:'width 1s linear, background 0.3s',
    borderRadius: 2,
  }),
  wrap: { height:4, background:'#0f3460', borderRadius:2, marginTop:4, overflow:'hidden' },
};

export default function TurnTimer({ turnStart, isMyTurn, inSetup }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (inSetup || !turnStart) return null;
  const elapsed = (now - turnStart) / 1000;
  const remaining = Math.max(0, TURN_LIMIT - elapsed);
  const pct = (remaining / TURN_LIMIT) * 100;
  const danger = remaining < 20 && isMyTurn;
  return (
    <div style={s.wrap} title={`${Math.ceil(remaining)}s left in turn`}>
      <div style={s.bar(pct, danger)} />
    </div>
  );
}
