import React, { useState, useEffect } from 'react';
import { T } from '../i18n';

const KEY = 'lechia_tutorial_seen';

const STEPS_PL = [
  { title: '👋 Witaj na Bursztynowym Szlaku!', text: 'Wieloosobowa gra strategiczna o handlu i osadnictwie w średniowiecznej Lechii. Cel: zdobyć 10 punktów zwycięstwa jako pierwszy.' },
  { title: '🏠 Przygotowanie', text: 'Każdy gracz stawia 2 osady i 2 szlaki. Wybieraj wierzchołki blisko pól z kostkami 6 lub 8 — produkują najwięcej.' },
  { title: '🎲 Tura', text: 'Rzuć kośćmi — pola z taką liczbą produkują surowce. Następnie buduj, handluj, kup Karty Rozwoju.' },
  { title: '🦹 Zbójca', text: 'Wyrzucenie 7 przenosi zbójcę i blokuje pole. Gracze z >7 kart muszą odrzucić połowę.' },
  { title: '🛤 Najdłuższy Szlak / ⚔️ Najpotężniejsza Husaria', text: 'Bonusy +2 punkty. Można je przejąć tylko ŚCIŚLE bijąc liczbę poprzedniego posiadacza.' },
  { title: '⭐ Punkty Zwycięstwa', text: 'Osada=1, Gród=2, ukryte karty PZ=1 każda. Pierwszy do 10 wygrywa!' },
];

const STEPS_EN = [
  { title: '👋 Welcome to The Amber Trail!', text: 'A multiplayer strategy game of trade, exploration, and settlement in medieval Lechia. Goal: reach 10 honor points first.' },
  { title: '🏠 Setup', text: 'Each player places 2 hamlets and 2 trails. Pick vertices next to high-probability tiles (6 and 8 are best).' },
  { title: '🎲 Turn', text: 'Roll dice — tiles with that number produce resources. Then build, trade, or buy Decree Cards.' },
  { title: '🦹 The Robber', text: 'Rolling 7 moves the robber and blocks a tile. Players with 8+ cards must discard half.' },
  { title: '🛤 Longest Trail / ⚔️ Greatest Hussar Banner', text: 'Each is worth +2 honor. You can only steal them by STRICTLY beating the holder\'s count.' },
  { title: '⭐ Honor Points', text: 'Hamlet=1, Stronghold=2, hidden Honor cards=1 each. First to 10 wins!' },
];

const s = {
  overlay: {
    position:'fixed', inset:0, background:'#0009',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:300,
  },
  card: { background:'#16213e', borderRadius:14, padding:28, maxWidth:440, width:'90%', boxShadow:'0 16px 40px #000a' },
  title: { fontSize:20, fontWeight:800, marginBottom:10 },
  text: { fontSize:14, color:'#ccc', lineHeight:1.5, marginBottom:18 },
  dots: { display:'flex', gap:6, justifyContent:'center', marginBottom:14 },
  dot: (active) => ({ width:8, height:8, borderRadius:'50%', background: active ? '#7b68ee' : '#444' }),
  btnRow: { display:'flex', gap:8 },
  btn: (bg) => ({ flex:1, padding:10, background:bg, color:'#fff', fontSize:13 }),
};

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  // PL title is "Bursztynowy Szlak", EN is "The Amber Trail" — detect by Polish-specific char
  const steps = T.title.includes('Szlak') ? STEPS_PL : STEPS_EN;

  function dismiss() {
    localStorage.setItem(KEY, '1');
    onClose();
  }

  function next() {
    if (step + 1 >= steps.length) dismiss();
    else setStep(step + 1);
  }

  const cur = steps[step];
  return (
    <div style={s.overlay} onClick={dismiss}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <div style={s.title}>{cur.title}</div>
        <div style={s.text}>{cur.text}</div>
        <div style={s.dots}>
          {steps.map((_, i) => <div key={i} style={s.dot(i === step)} />)}
        </div>
        <div style={s.btnRow}>
          <button style={s.btn('#444')} onClick={dismiss}>Skip</button>
          {step > 0 && <button style={s.btn('#0f3460')} onClick={() => setStep(step - 1)}>Back</button>}
          <button style={s.btn('#7b68ee')} onClick={next}>{step + 1 >= steps.length ? 'Got it!' : 'Next →'}</button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTutorial() {
  return !localStorage.getItem(KEY);
}
