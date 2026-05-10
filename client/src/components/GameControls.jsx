import React, { useState } from 'react';
import socket from '../socket';
import { T } from '../i18n';
import { playSound } from '../sounds';
import EndTurnConfirm, { getEndTurnWarnings } from './EndTurnConfirm';
import Dice from './Dice';

const s = {
  wrap: { background:'#16213e', borderRadius:10, padding:10, display:'flex', flexDirection:'column', gap:8 },
  // Compact turn header — round/turn name + dice + timer in one block
  header: { background:'#0f3460', borderRadius:8, padding:'8px 10px', display:'flex', flexDirection:'column', gap:4 },
  headerTop: { display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:12, color:'#aaa' },
  headerName: { fontSize:14, fontWeight:800, color:'#eee' },
  // Primary actions — bigger when active
  primaryRow: { display:'flex', gap:8 },
  rollBtn: (active, hasRolled) => ({
    flex:1,
    padding: active ? '14px 0' : '10px 0',
    background: active && !hasRolled ? '#7b68ee' : '#3a3a4e',
    color:'#fff', fontSize: active ? 15 : 13, fontWeight:800,
    boxShadow: active && !hasRolled ? '0 0 0 2px #b0a0ff66' : 'none',
    transition: 'all 0.2s',
  }),
  endBtn: (active, ready) => ({
    flex:1,
    padding: active ? '14px 0' : '10px 0',
    background: active && ready ? '#2ecc71' : '#3a3a4e',
    color:'#fff', fontSize: active ? 15 : 13, fontWeight:800,
    boxShadow: active && ready ? '0 0 0 2px #6ee9a166' : 'none',
    transition: 'all 0.2s',
  }),
  info: { fontSize:11, color:'#aaa', textAlign:'center' },
  log: { maxHeight:90, overflowY:'auto', display:'flex', flexDirection:'column', gap:2 },
  logEntry: { fontSize:10, color:'#ccc', padding:'2px 6px', background:'#0f3460', borderRadius:4 },
  banner: (bg) => ({ background:bg, color:'#fff', padding:'8px 12px', borderRadius:6, fontSize:12, textAlign:'center', fontWeight:700 }),
  logTitle: { fontSize:11, color:'#aaa', fontWeight:600, marginTop:4 },
};

export default function GameControls({ state, roomId, myId, isSpectator }) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  const isMyTurn = state.players[state.turn]?.id === myId;
  const hasRolled = state.diceRoll !== null;
  const inSetup = state.phase === 'setup1' || state.phase === 'setup2';
  const me = state.players.find(p => p.id === myId);
  const canEndTurn = isMyTurn && hasRolled && !state.pendingAction && !isSpectator;
  const canRoll = isMyTurn && !hasRolled && !isSpectator;

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

  const currentName = state.players[state.turn]?.name;
  const phaseLabel = inSetup
    ? `${T.labels.setup} ${state.phase === 'setup1' ? '1/2' : '2/2'}`
    : `${T.labels.round} ${state.round}`;

  return (
    <div style={s.wrap}>
      {/* Compact unified header: phase + active player + dice */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <span>{phaseLabel}</span>
          <span style={{ color: isMyTurn ? '#f1c40f' : '#888' }}>
            {isMyTurn ? '★ ' + T.msgs.yourTurn : '⏳'}
          </span>
        </div>
        <div style={s.headerName}>{currentName}</div>
        {!inSetup && <Dice value={state.diceRoll} />}
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
          <div style={s.primaryRow}>
            <button style={s.rollBtn(isMyTurn, hasRolled)} onClick={rollDice} disabled={!canRoll}
              title="Shortcut: R">
              🎲 {T.actions.rollDice}
            </button>
            <button style={s.endBtn(isMyTurn, hasRolled && !state.pendingAction)} onClick={endTurn} disabled={!canEndTurn}
              title="Shortcut: E">
              ✓ {T.actions.endTurn}
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
        </>
      )}

      <div style={s.logTitle}>{T.labels.gameLog}</div>
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
