import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { T } from '../i18n';
import SettingsModal from './SettingsModal';

const s = {
  wrap: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:24, padding:16 },
  card: { background:'#16213e', borderRadius:16, padding:32, width:'100%', maxWidth:380, boxShadow:'0 8px 32px #0008' },
  title: { fontSize:26, fontWeight:800, marginBottom:4, letterSpacing:1, textAlign:'center' },
  subtitle: { color:'#aaa', fontSize:13, marginBottom:24, textAlign:'center' },
  label: { fontSize:12, color:'#aaa', marginBottom:4, display:'block' },
  field: { marginBottom:14 },
  btn: { width:'100%', padding:12, fontSize:14, background:'#7b68ee', color:'#fff', marginTop:6 },
  btnSecondary: { width:'100%', padding:12, fontSize:14, background:'#2a2a3e', color:'#eee', border:'1px solid #444', marginTop:6 },
  btnBot: { width:'100%', padding:10, fontSize:13, background:'#16a085', color:'#fff', marginTop:6 },
  divider: { textAlign:'center', color:'#555', margin:'12px 0', fontSize:12 },
  roomCode: { fontFamily:'monospace', fontSize:30, letterSpacing:6, color:'#7b68ee', textAlign:'center', padding:'12px 0' },
  playerList: { listStyle:'none', marginTop:10 },
  playerItem: { padding:'6px 0', borderBottom:'1px solid #2a2a3e', fontSize:13 },
  error: { color:'#ff6b6b', fontSize:13, marginTop:8 },
};

export default function Lobby({ onGameStart }) {
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [joinCode, setJoinCode] = useState('');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  function connect(cb) {
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', cb);
    } else cb();
  }

  function handleCreate() {
    if (!playerName.trim()) return setError('Enter your name');
    setError('');
    localStorage.setItem('playerName', playerName.trim());
    connect(() => {
      socket.emit('room:create', { playerName: playerName.trim() }, ({ roomId, players, error }) => {
        if (error) return setError(error);
        setRoomId(roomId); setPlayers(players); setIsHost(true); setScreen('waiting');
      });
    });
  }

  function handleJoin() {
    if (!playerName.trim()) return setError('Enter your name');
    if (!joinCode.trim()) return setError('Enter a room code');
    setError('');
    localStorage.setItem('playerName', playerName.trim());
    connect(() => {
      socket.emit('room:join', { roomId: joinCode.trim().toUpperCase(), playerName: playerName.trim() },
        ({ roomId: rid, players: pl, error: err, reconnected, spectator }) => {
          if (err) return setError(err);
          setRoomId(rid); setPlayers(pl);
          setIsHost(false);
          if (reconnected || spectator) {
            // Will receive game:stateUpdate which onGameStart handles via App
            setScreen('joining-game');
          } else {
            setScreen('waiting');
          }
        });
    });
  }

  function handleStart() {
    socket.emit('game:start', { roomId }, ({ error }) => { if (error) setError(error); });
  }

  function handleAddBot() {
    socket.emit('room:addBot', { roomId }, ({ error }) => { if (error) setError(error); });
  }

  useEffect(() => {
    const onUpdated = ({ players }) => setPlayers(players);
    const onStarted = ({ state }) => onGameStart(state, roomId, playerName.trim());
    const onStateUpdate = ({ state }) => onGameStart(state, roomId, playerName.trim());
    socket.on('room:updated', onUpdated);
    socket.on('game:started', onStarted);
    socket.on('game:stateUpdate', onStateUpdate);
    return () => {
      socket.off('room:updated', onUpdated);
      socket.off('game:started', onStarted);
      socket.off('game:stateUpdate', onStateUpdate);
    };
  }, [onGameStart, roomId, playerName]);

  if (screen === 'home') return (
    <div style={s.wrap}>
      <button onClick={() => setSettingsOpen(true)}
        style={{ position:'absolute', top:16, right:16, padding:'6px 12px', fontSize:18, background:'#0f3460', color:'#fff' }}
        title={T.actions.settings}>⚙️</button>
      <div>
        <div style={s.title}>{T.title}</div>
        <div style={{ color:'#aaa', textAlign:'center', fontSize:13 }}>{T.tagline}</div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <div style={s.card}>
        <div style={s.field}>
          <label style={s.label}>{T.labels.yourName}</label>
          <input value={playerName} onChange={e => setPlayerName(e.target.value)}
            placeholder="Imię" autoFocus />
        </div>
        <button style={s.btn} onClick={() => { if (!playerName.trim()) return setError('Enter your name'); setError(''); setScreen('create'); }}>
          {T.actions.create}
        </button>
        <div style={s.divider}>{T.labels.or}</div>
        <button style={s.btnSecondary} onClick={() => { if (!playerName.trim()) return setError('Enter your name'); setError(''); setScreen('join'); }}>
          {T.actions.join}
        </button>
        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );

  if (screen === 'create') return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>{T.actions.create}</div>
        <div style={s.subtitle}>Gracz: {playerName}</div>
        <button style={s.btn} onClick={handleCreate}>{T.actions.create}</button>
        <button style={s.btnSecondary} onClick={() => setScreen('home')}>{T.actions.back}</button>
        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );

  if (screen === 'join') return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>{T.actions.join}</div>
        <div style={s.subtitle}>Gracz: {playerName}</div>
        <div style={s.field}>
          <label style={s.label}>{T.labels.roomCode}</label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="ABC123" onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
        </div>
        <button style={s.btn} onClick={handleJoin}>{T.actions.join}</button>
        <button style={s.btnSecondary} onClick={() => setScreen('home')}>{T.actions.back}</button>
        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );

  if (screen === 'joining-game') return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>...</div>
        <div style={s.subtitle}>Łączenie...</div>
      </div>
    </div>
  );

  if (screen === 'waiting') return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.title}>{T.labels.players}</div>
        <div style={s.subtitle}>Udostępnij kod znajomym:</div>
        <div style={s.roomCode}>{roomId}</div>
        <ul style={s.playerList}>
          {players.map((p, i) => (
            <li key={p.id} style={s.playerItem}>
              {i + 1}. {p.name} {p.isBot && '🤖'} {i === 0 ? '👑' : ''}
            </li>
          ))}
        </ul>
        <div style={{ color:'#aaa', fontSize:12, marginTop:8 }}>{players.length}/4 graczy</div>
        {isHost && players.length < 4 && (
          <button style={s.btnBot} onClick={handleAddBot}>🤖 {T.actions.addBot}</button>
        )}
        {isHost && (
          <button style={{ ...s.btn, marginTop:14 }} onClick={handleStart} disabled={players.length < 2}>
            {players.length < 2 ? '...' : T.actions.start}
          </button>
        )}
        {!isHost && <div style={{ color:'#aaa', fontSize:12, marginTop:18, textAlign:'center' }}>Czekam na host...</div>}
        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );
}
