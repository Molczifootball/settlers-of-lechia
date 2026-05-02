import React, { useState, useCallback, useEffect } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import HexBoard from './components/HexBoard';
import PlayerPanel from './components/PlayerPanel';
import GameControls from './components/GameControls';
import BuildMenu from './components/BuildMenu';
import DevCards from './components/DevCards';
import TradePanel from './components/TradePanel';
import TradeOfferModal from './components/TradeOfferModal';
import DiscardModal from './components/DiscardModal';
import StealModal from './components/StealModal';
import EndGameScreen from './components/EndGameScreen';
import ResourceCards from './components/ResourceCards';
import SettingsModal from './components/SettingsModal';
import ChatPanel from './components/ChatPanel';
import { applySettingsToDOM } from './settings';
import { playSound } from './sounds';
import { T } from './i18n';

const s = {
  gameWrap: { display:'flex', gap:16, padding:16, minHeight:'100vh', alignItems:'flex-start', justifyContent:'center', flexWrap:'wrap' },
  boardSection: { display:'flex', flexDirection:'column', alignItems:'center', gap:12 },
  sideSection: { display:'flex', flexDirection:'column', gap:12, width:240 },
  title: { fontSize:18, fontWeight:800, color:'#7b68ee', letterSpacing:1 },
  errBox: { padding:24, color:'#ff6b6b', fontFamily:'monospace', whiteSpace:'pre-wrap' },
};

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={s.errBox}>
          <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>⚠ Render error</div>
          <div>{String(this.state.error?.message || this.state.error)}</div>
          <div style={{ marginTop:8, fontSize:11, opacity:0.7 }}>{(this.state.error?.stack || '').slice(0, 1500)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameView() {
  const [gameState, setGameState] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [myName, setMyName] = useState('');
  const [buildMode, setBuildMode] = useState(null);
  const [stealCtx, setStealCtx] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { applySettingsToDOM(); }, []);

  // Detect changes in own piece counts to play sound on build
  const prevCounts = React.useRef({});
  useEffect(() => {
    if (!gameState) return;
    const my = gameState.players?.find(p => p.id === socket.id);
    if (!my) return;
    const counts = {
      s: (my.settlements || []).length,
      c: (my.cities || []).length,
      r: (my.roads || []).length,
      d: my.devCards?._hidden ? my.devCards.total : (my.devCards?.length || 0),
    };
    const prev = prevCounts.current;
    if (prev.s !== undefined) {
      if (counts.s > prev.s || counts.c > prev.c || counts.r > prev.r) playSound('build');
      else if (counts.d > prev.d) playSound('newCard');
    }
    prevCounts.current = counts;
  }, [gameState]);

  // Win fanfare
  const prevWinner = React.useRef(null);
  useEffect(() => {
    if (gameState?.winner && gameState.winner !== prevWinner.current) {
      prevWinner.current = gameState.winner;
      playSound('win');
    }
  }, [gameState && gameState.winner]);

  const myId = socket.id;
  const me = gameState && gameState.players ? gameState.players.find(p => p.id === myId) : null;
  const isSpectator = gameState && gameState.players && !me;

  const currentTurnPlayer = gameState && gameState.players && gameState.players.length > 0
    ? gameState.players[gameState.turn] : null;
  const isMyTurn = !!(currentTurnPlayer && currentTurnPlayer.id === myId);
  const inSetup = !!(gameState && (gameState.phase === 'setup1' || gameState.phase === 'setup2'));
  const hasRolled = !!(gameState && gameState.diceRoll != null);

  const handleGameStart = useCallback((state, room, name) => {
    setGameState(state);
    setRoomId(room);
    setMyName(name);
  }, []);

  useEffect(() => {
    const onUpdate = ({ state }) => setGameState(state);
    socket.on('game:stateUpdate', onUpdate);
    return () => { socket.off('game:stateUpdate', onUpdate); };
  }, []);

  useEffect(() => {
    if (!gameState) return;
    if (inSetup && isMyTurn) {
      setBuildMode(gameState.setupStep);
    } else if (!isMyTurn && !inSetup) {
      setBuildMode(null);
    }
  }, [inSetup, isMyTurn, gameState && gameState.setupStep]);

  useEffect(() => {
    const pa = gameState && gameState.pendingAction;
    if (pa && pa.playerId === myId) {
      if (pa.type === 'moveRobber') setBuildMode('robber');
      if (pa.type === 'freeRoads') setBuildMode('road');
    }
  }, [gameState && gameState.pendingAction, myId]);

  function build(building, position) {
    const wasInSetup = inSetup;
    const pendingFreeRoad = gameState && gameState.pendingAction && gameState.pendingAction.type === 'freeRoads';
    socket.emit('game:build', { roomId, building, position }, (res) => {
      if (res && res.error) { alert(res.error); return; }
      if (!wasInSetup && !(pendingFreeRoad && building === 'road')) setBuildMode(null);
    });
  }

  function buyDevCard() {
    socket.emit('game:buyDevCard', { roomId }, (res) => {
      if (res && res.error) alert(res.error);
    });
  }

  function awaitingRobber() { setBuildMode('robber-knight'); }

  function onTileClick(tileId) {
    if (!gameState) return;
    const tile = gameState.board.tiles[tileId];
    const candidates = gameState.players.filter(p =>
      p.id !== myId &&
      ((p.settlements || []).some(v => tile.vertices.includes(v)) ||
       (p.cities || []).some(v => tile.vertices.includes(v)))
    );

    if (buildMode === 'robber') {
      if (candidates.length === 0) {
        socket.emit('game:moveRobber', { roomId, tileId, stealFromId: null }, (res) => {
          if (res && res.error) alert(res.error); else setBuildMode(null);
        });
      } else {
        setStealCtx({ source: 'roll7', tileId, candidates });
      }
    } else if (buildMode === 'robber-knight') {
      if (candidates.length === 0) {
        socket.emit('game:playDevCard', { roomId, cardType:'knight', tileId, stealFromId: null }, (res) => {
          if (res && res.error) alert(res.error); else setBuildMode(null);
        });
      } else {
        setStealCtx({ source: 'knight', tileId, candidates });
      }
    }
  }

  function resolveSteal(victimId) {
    if (!stealCtx) return;
    const { source, tileId } = stealCtx;
    if (source === 'roll7') {
      socket.emit('game:moveRobber', { roomId, tileId, stealFromId: victimId }, (res) => {
        if (res && res.error) {
          alert(res.error);
          // Always dismiss the modal — user can pick a different tile
          setStealCtx(null);
        } else {
          setBuildMode(null);
          setStealCtx(null);
        }
      });
    } else {
      socket.emit('game:playDevCard', { roomId, cardType:'knight', tileId, stealFromId: victimId }, (res) => {
        if (res && res.error) {
          alert(res.error);
          setStealCtx(null);
        } else {
          setBuildMode(null);
          setStealCtx(null);
        }
      });
    }
  }

  function cancelSteal() {
    // Just close modal locally; user keeps build mode and can pick a different tile.
    setStealCtx(null);
  }

  if (!gameState) return <Lobby onGameStart={handleGameStart} />;

  const boardMode =
    buildMode === 'road' ? 'road' :
    buildMode === 'settlement' ? 'settlement' :
    buildMode === 'city' ? 'city' :
    (buildMode === 'robber' || buildMode === 'robber-knight') ? 'robber' :
    null;

  // Discard handling
  const discardEntry = gameState.pendingAction?.type === 'discard'
    ? gameState.pendingAction.awaiting.find(a => a.playerId === myId)
    : null;

  // Trade handling
  const trade = gameState.activeTrade;
  const showTradeOffer = trade && (trade.from === myId || trade.targets.includes(myId));
  const fromPlayer = trade ? gameState.players.find(p => p.id === trade.from) : null;

  return (
    <div style={s.gameWrap} className="game-wrap">
      <div style={s.sideSection} className="side-section">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={s.title}>{T.title}</div>
          <button onClick={() => setSettingsOpen(true)}
            style={{ padding:'6px 10px', fontSize:14, background:'#0f3460', color:'#fff' }}
            title={T.actions.settings}>⚙️</button>
        </div>
        <PlayerPanel
          players={gameState.players}
          currentTurnIdx={gameState.turn}
          myId={myId}
          largestArmyHolder={gameState.largestArmyHolder}
          longestRoadHolder={gameState.longestRoadHolder}
        />
      </div>

      <div style={s.boardSection} className="board-section">
        <HexBoard
          state={gameState}
          mode={boardMode}
          myPlayer={me}
          onTileClick={onTileClick}
          onVertexClick={(vertexId) => {
            if (buildMode === 'settlement') build('settlement', { vertexId });
            else if (buildMode === 'city') build('city', { vertexId });
          }}
          onEdgeClick={(edgeId) => {
            if (buildMode === 'road') build('road', { edgeId });
          }}
        />
        {me && !inSetup && <ResourceCards player={me} />}
        {buildMode && (
          <div style={{ fontSize:12, color:'#aaa' }}>
            {buildMode === 'road' && T.msgs.placeRoad}
            {buildMode === 'settlement' && T.msgs.placeSettlement}
            {buildMode === 'city' && T.msgs.placeCity}
            {(buildMode === 'robber' || buildMode === 'robber-knight') && T.msgs.moveRobberPrompt}
          </div>
        )}
      </div>

      <div style={s.sideSection} className="side-section">
        {!inSetup && !isSpectator && (
          <BuildMenu
            player={me}
            isMyTurn={isMyTurn}
            hasRolled={hasRolled}
            mode={buildMode}
            setMode={setBuildMode}
            onBuyDevCard={buyDevCard}
            pendingAction={gameState.pendingAction}
          />
        )}
        <GameControls state={gameState} roomId={roomId} myId={myId} isSpectator={isSpectator} />
        {!inSetup && !isSpectator && (
          <>
            <TradePanel
              state={gameState}
              me={me}
              isMyTurn={isMyTurn}
              hasRolled={hasRolled}
              roomId={roomId}
            />
            <DevCards
              player={me}
              isMyTurn={isMyTurn}
              hasRolled={hasRolled}
              roomId={roomId}
              pendingAction={gameState.pendingAction}
              awaitingRobber={awaitingRobber}
            />
          </>
        )}
        <ChatPanel roomId={roomId} myName={myName} />
      </div>

      {/* Modals */}
      {discardEntry && me && (
        <DiscardModal player={me} count={discardEntry.count} roomId={roomId} />
      )}
      {stealCtx && (
        <StealModal
          candidates={stealCtx.candidates}
          onPick={resolveSteal}
          onSkipSteal={() => resolveSteal(null)}
          onCancel={cancelSteal}
        />
      )}
      {showTradeOffer && fromPlayer && (
        <TradeOfferModal
          trade={trade}
          fromName={fromPlayer.name}
          isInitiator={trade.from === myId}
          isTarget={trade.targets.includes(myId)}
          roomId={roomId}
        />
      )}
      {gameState.winner && <EndGameScreen state={gameState} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameView />
    </ErrorBoundary>
  );
}
