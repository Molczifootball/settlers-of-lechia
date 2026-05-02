import React, { useState } from 'react';
import socket from '../socket';
import { T } from '../i18n';
import { playSound } from '../sounds';
import EndTurnConfirm, { getEndTurnWarnings } from './EndTurnConfirm';

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:10 },
  title: { fontSize:13, fontWeight:700 },
  diceDisplay: { textAlign:'center', fontSize:42, minHeight:54 },
  row: { display:'flex', gap:8 },
  btn: (color) => ({ flex:1, padding:'10px 0', background:color, color:'#fff', fontSize:13 }),
  info: { fontSize:11, color:'#aaa', textAlign:'center' },
  log: { maxHeight:140, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 },
  logEntry: { fontSize:11, color:'#ccc', padding:'3px 6px', background:'#0f3460', borderRadius:4 },
  banner: (bg) => ({ background:bg, color:'#fff', padding:'8px 12px', borderRadius:6, fontSize:12, textAlign:'center', fontWeight:700 }),
};

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function GameControls({ state, roomId, myId, isSpectator }) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  const isMyTurn = state.players[state.turn]?.id === myId;
  const hasRolled = state.diceRoll !== null;
  const inSetup = state.phase === 'setup1' || state.phase === 'setup2';
  const me = state.players.find(p => p.id === myId);

  function rollDice() {
    socket.emit('game:rollDice', { roomId }, ({ error }) => {
      if (error) alert(error); else playSound('roll');
    });
  }

  function doEndTurn() {
    socket.emit('game:endTurn', { roomId }, ({ error }) => { if (error) alert(error); });
    setConfirmEnd(false);
  }

  function endTurn() {
    const warnings = getEndTurnWarnings(me);
    if (warnings.length > 0) setConfirmEnd(true);
    else doEndTurn();
  }

  const d1 = state.diceRoll ? Math.ceil(state.diceRoll / 2) : null;
  const d2 = state.diceRoll ? state.diceRoll - d1 : null;
  const currentName = state.players[state.turn]?.name;

  return (
    <div style={s.wrap}>
      <div style={s.title}>
        {inSetup ? `${T.labels.setup} ${state.phase === 'setup1' ? '1/2' : '2/2'}` : `${T.labels.round} ${state.round}`}
        {' '}— {currentName}
      </div>

      {isSpectator && <div style={s.banner('#16a085')}>👁 {T.msgs.spectator}</div>}

      {inSetup && isMyTurn && (
        <div style={s.banner('#7b68ee')}>
          {state.setupStep === 'settlement' ? T.msgs.placeSettlement : T.msgs.placeRoad}
        </div>
      )}
      {inSetup && !isMyTurn && (
        <div style={s.info}>{T.msgs.waitingFor.replace('%s', currentName)}</div>
      )}

      {!inSetup && (
        <>
          <div style={s.diceDisplay} className={state.diceRoll ? 'dice-rolled' : ''}>
            {state.diceRoll
              ? <>{DICE_FACES[d1]} {DICE_FACES[d2]} <span style={{ fontSize:16 }}>= {state.diceRoll}</span></>
              : <span style={{ fontSize:22, color:'#555' }}>🎲 ?</span>}
          </div>
          <div style={s.row}>
            <button style={s.btn('#7b68ee')} onClick={rollDice} disabled={!isMyTurn || hasRolled || isSpectator}>
              {T.actions.rollDice}
            </button>
            <button style={s.btn('#2ecc71')} onClick={endTurn} disabled={!isMyTurn || !hasRolled || state.pendingAction || isSpectator}>
              {T.actions.endTurn}
            </button>
          </div>
          {state.pendingAction?.type === 'moveRobber' && state.pendingAction.playerId === myId && (
            <div style={s.banner('#c0392b')}>{T.msgs.moveRobberPrompt}</div>
          )}
          {state.pendingAction?.type === 'freeRoads' && state.pendingAction.playerId === myId && (
            <div style={s.banner('#3498db')}>
              Place {state.pendingAction.roadsRemaining} more free road{state.pendingAction.roadsRemaining > 1 ? 's' : ''}
            </div>
          )}
          {!isMyTurn && !isSpectator && <div style={s.info}>{T.msgs.waitingFor.replace('%s', currentName)}</div>}
        </>
      )}

      <div style={{ fontSize:12, color:'#aaa', fontWeight:600, marginTop:4 }}>{T.labels.gameLog}</div>
      <div style={s.log}>
        {state.log.map((entry, i) => (<div key={i} style={s.logEntry}>{entry}</div>))}
      </div>

      {confirmEnd && (
        <EndTurnConfirm
          warnings={getEndTurnWarnings(me)}
          onConfirm={doEndTurn}
          onCancel={() => setConfirmEnd(false)}
        />
      )}
    </div>
  );
}
