import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { T } from '../i18n';
import SettingsModal from './SettingsModal';

const s = {
  wrap: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    minHeight:'100vh', gap:24, padding:16,
    backgroundImage:'linear-gradient(rgba(26,26,46,0.65), rgba(26,26,46,0.85)), url("/assets/ui/bg_lobby.png")',
    backgroundSize:'cover', backgroundPosition:'center',
  },
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
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [publicRooms, setPublicRooms] = useState([]);

  // Read ?room=ABC123 from URL on first load and prefill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinCode(roomParam.toUpperCase());
      // If we already have a name, jump straight to join
      if (playerName.trim()) {
        setScreen('join');
      }
    }
  }, []);

  function copyInvite() {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

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
      socket.emit('room:create', { playerName: playerName.trim(), isPublic }, ({ roomId, players, error }) => {
        if (error) return setError(error);
        setRoomId(roomId); setPlayers(players); setIsHost(true); setScreen('waiting');
      });
    });
  }

  function fetchPublicRooms() {
    connect(() => {
      socket.emit('lobby:listPublic', {}, ({ rooms }) => {
        setPublicRooms(rooms || []);
      });
    });
  }

  // Subscribe to public rooms list updates while on the join screen
  useEffect(() => {
    if (screen !== 'join') return;
    const onUpdate = (rooms) => setPublicRooms(rooms || []);
    socket.on('lobby:publicRooms', onUpdate);
    fetchPublicRooms();
    return () => socket.off('lobby:publicRooms', onUpdate);
  }, [screen]);

  function joinPublic(code) {
    setJoinCode(code);
    handleJoin(code);
  }

  function handleJoin(codeOverride) {
    if (!playerName.trim()) return setError('Enter your name');
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!code) return setError('Enter a room code');
    setError('');
    localStorage.setItem('playerName', playerName.trim());
    connect(() => {
      socket.emit('room:join', { roomId: code, playerName: playerName.trim() },
        ({ roomId: rid, players: pl, error: err, reconnected, spectator }) => {
          if (err) return setError(err);
          setRoomId(rid); setPlayers(pl);
          setIsHost(false);
          if (reconnected || spectator) {
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

        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          <button
            style={{ flex:1, padding:'10px', fontSize:13,
              background: isPublic ? '#16a085' : '#0f3460',
              color:'#fff', border:'2px solid '+(isPublic?'#1abc9c':'transparent') }}
            onClick={() => setIsPublic(true)}>🌐 Public</button>
          <button
            style={{ flex:1, padding:'10px', fontSize:13,
              background: !isPublic ? '#7b68ee' : '#0f3460',
              color:'#fff', border:'2px solid '+(!isPublic?'#b0a0ff':'transparent') }}
            onClick={() => setIsPublic(false)}>🔒 Private</button>
        </div>
        <div style={{ fontSize:11, color:'#888', textAlign:'center', marginBottom:10 }}>
          {isPublic
            ? 'Public rooms appear in the games list. Anyone can join with the code.'
            : 'Private rooms only joinable with the room code or invite link.'}
        </div>

        <button style={s.btn} onClick={handleCreate}>{T.actions.create}</button>
        <button style={s.btnSecondary} onClick={() => setScreen('home')}>{T.actions.back}</button>
        {error && <div style={s.error}>{error}</div>}
      </div>
    </div>
  );

  if (screen === 'join') return (
    <div style={s.wrap}>
      <div style={{ ...s.card, maxWidth:440 }}>
        <div style={s.title}>{T.actions.join}</div>
        <div style={s.subtitle}>Gracz: {playerName}</div>
        <div style={s.field}>
          <label style={s.label}>{T.labels.roomCode}</label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
            placeholder="ABC123" onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
        </div>
        <button style={s.btn} onClick={() => handleJoin()}>{T.actions.join}</button>

        <div style={{ marginTop:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontSize:12, color:'#aaa', fontWeight:700 }}>🌐 Public games ({publicRooms.length})</span>
            <button style={{ padding:'4px 8px', background:'#0f3460', color:'#fff', fontSize:11 }}
              onClick={fetchPublicRooms}>↻</button>
          </div>
          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {publicRooms.length === 0 && (
              <div style={{ fontSize:11, color:'#666', textAlign:'center', padding:12 }}>
                No public games right now. Create one!
              </div>
            )}
            {publicRooms.map(r => (
              <button key={r.id}
                style={{ padding:'8px 10px', background:'#0f3460', color:'#fff',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  fontSize:12, textAlign:'left' }}
                onClick={() => joinPublic(r.id)}>
                <span><b style={{ color:'#7b68ee' }}>{r.id}</b> · {r.hostName}'s game</span>
                <span style={{ color:'#aaa' }}>{r.playerCount}/4 👥</span>
              </button>
            ))}
          </div>
        </div>

        <button style={{ ...s.btnSecondary, marginTop:14 }} onClick={() => setScreen('home')}>{T.actions.back}</button>
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
        <div style={s.subtitle}>{T.msgs.shareCode || 'Share with friends:'}</div>
        <div style={s.roomCode}>{roomId}</div>
        <button onClick={copyInvite}
          style={{ width:'100%', padding:8, background: copied ? '#2ecc71' : '#0f3460', color:'#fff', fontSize:12, marginBottom:8 }}>
          {copied ? '✓ Copied!' : '🔗 Copy invite link'}
        </button>
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
