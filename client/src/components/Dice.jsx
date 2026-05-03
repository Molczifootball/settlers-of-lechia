import React, { useState, useEffect, useRef } from 'react';

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const s = {
  wrap: { textAlign:'center', minHeight:54, fontSize:42, display:'flex', justifyContent:'center', alignItems:'center', gap:6 },
  die: { display:'inline-block', transition:'transform 0.05s' },
  total: { fontSize:16, color:'#aaa', marginLeft:4 },
};

// Animated dice that tumbles through random faces before settling on the actual roll.
export default function Dice({ value }) {
  const [shownPair, setShownPair] = useState(null); // [d1, d2] or null
  const animTimer = useRef(null);

  useEffect(() => {
    if (animTimer.current) { clearInterval(animTimer.current); animTimer.current = null; }
    if (value == null) {
      setShownPair(null);
      return;
    }
    // Tumble through 6 random pairs, then settle
    let ticks = 0;
    animTimer.current = setInterval(() => {
      ticks++;
      if (ticks > 6) {
        // Settle on actual value
        const d1 = Math.ceil(value / 2);
        const d2 = value - d1;
        setShownPair([d1, d2]);
        clearInterval(animTimer.current);
        animTimer.current = null;
      } else {
        setShownPair([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      }
    }, 70);
    return () => {
      if (animTimer.current) clearInterval(animTimer.current);
    };
  }, [value]);

  if (value == null) {
    return (
      <div style={s.wrap}>
        <span style={{ fontSize:22, color:'#555' }}>🎲 ?</span>
      </div>
    );
  }

  const [d1, d2] = shownPair || [1, 1];
  const settled = !animTimer.current && shownPair && shownPair[0] + shownPair[1] === value;
  return (
    <div style={s.wrap}>
      <span style={{ ...s.die, transform: settled ? 'none' : `rotate(${(d1 * 47) % 360}deg)` }}>{DICE_FACES[d1]}</span>
      <span style={{ ...s.die, transform: settled ? 'none' : `rotate(${(d2 * 71) % 360}deg)` }}>{DICE_FACES[d2]}</span>
      {settled && <span style={s.total}>= {value}</span>}
    </div>
  );
}
