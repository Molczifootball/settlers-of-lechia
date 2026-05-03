import React from 'react';
import Modal from './Modal';
import socket from '../socket';
import { T } from '../i18n';
import { playSound } from '../sounds';

const s = {
  hint: { fontSize:13, color:'#aaa', marginBottom:14, textAlign:'center' },
  options: { display:'flex', flexDirection:'column', gap:8 },
  primary: {
    padding:'14px 16px', fontSize:15, fontWeight:800, color:'#fff',
    background:'#7b68ee', border:'2px solid #b0a0ff', textAlign:'left',
    display:'flex', alignItems:'center', gap:10,
  },
  knight: {
    padding:'14px 16px', fontSize:15, fontWeight:800, color:'#fff',
    background:'#c0392b', border:'2px solid #e74c3c', textAlign:'left',
    display:'flex', alignItems:'center', gap:10,
  },
  later: {
    padding:'8px', fontSize:11, background:'#444', color:'#fff',
    marginTop:4,
  },
  desc: { fontSize:11, fontWeight:400, opacity:0.85, marginTop:2 },
};

export default function TurnStartModal({ roomId, hasPlayableKnight, onClose, awaitingRobber }) {
  function rollDice() {
    socket.emit('game:rollDice', { roomId }, ({ error }) => {
      if (error) alert(error);
      else { playSound('roll'); onClose(); }
    });
  }

  function chooseKnight() {
    // Tell App.jsx we're starting a knight play; awaitingRobber sets buildMode to 'robber-knight'
    awaitingRobber('knight');
    onClose();
  }

  return (
    <Modal title={`★ ${T.msgs.yourTurn}`} variant="success" onClose={onClose}>
      <div style={s.hint}>{T.msgs.turnStartHint}</div>
      <div style={s.options}>
        <button style={s.primary} onClick={rollDice}>
          <span style={{ fontSize:22 }}>🎲</span>
          <div>
            <div>{T.actions.rollDice}</div>
            <div style={s.desc}>{T.msgs.rollHint}</div>
          </div>
        </button>

        {hasPlayableKnight && (
          <button style={s.knight} onClick={chooseKnight}>
            <span style={{ fontSize:22 }}>⚔️</span>
            <div>
              <div>{T.msgs.playKnightFirst}</div>
              <div style={s.desc}>{T.msgs.knightHint}</div>
            </div>
          </button>
        )}

        <button style={s.later} onClick={onClose}>{T.msgs.decideLater}</button>
      </div>
    </Modal>
  );
}
