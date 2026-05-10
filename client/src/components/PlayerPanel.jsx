import React from 'react';
import { T, RES_NAMES } from '../i18n';
import Tooltip from './Tooltip';

const RESOURCE_ICONS = { wood:'🌲', brick:'🧱', sheep:'🐑', wheat:'🌾', ore:'⛰️' };
const COLOR_MAP = { red:'#e74c3c', blue:'#3498db', green:'#2ecc71', orange:'#f39c12' };

const s = {
  panel: { background:'#16213e', borderRadius:10, padding:10, minWidth:220 },
  playerRow: { padding:6, borderRadius:6, marginBottom:4, transition:'background 0.2s' },
  topLine: { display:'flex', alignItems:'center', gap:6 },
  dot: (color) => ({ width:11, height:11, borderRadius:'50%', background:COLOR_MAP[color] || '#888', flexShrink:0 }),
  name: { fontWeight:700, fontSize:13, flex:1 },
  vp: { fontSize:11, color:'#f1c40f', fontWeight:700 },
  resources: { display:'flex', gap:4, flexWrap:'wrap', marginTop:4 },
  resChip: { background:'#0f3460', borderRadius:5, padding:'2px 6px', fontSize:11, display:'flex', alignItems:'center', gap:2 },
  badges: { display:'flex', gap:4, marginTop:3, fontSize:11, flexWrap:'wrap' },
  currentLabel: { fontSize:10, color:'#7b68ee', fontWeight:700, marginTop:2 },
  offline: { fontSize:10, color:'#e74c3c', fontWeight:700 },
};

export default function PlayerPanel({ players, currentTurnIdx, myId, largestArmyHolder, longestRoadHolder }) {
  return (
    <div style={s.panel}>
      <div style={{ fontSize:13, color:'#aaa', marginBottom:10, fontWeight:600 }}>{T.labels.players}</div>
      {players.map((player, i) => {
        const isMe = player.id === myId;
        const isActive = i === currentTurnIdx;
        const hidden = player.resources?._hidden;
        const totalRes = hidden ? player.resources.total : Object.values(player.resources || {}).reduce((a, b) => a + b, 0);
        const totalDev = player.devCards?._hidden ? player.devCards.total : (player.devCards?.length || 0);
        const knightsPlayed = player.devCards?.knightsPlayed ?? player.knightsPlayed ?? 0;
        const playerColor = COLOR_MAP[player.color] || '#888';
        return (
          <div key={player.id}
            className={isActive ? 'active-turn' : ''}
            style={{
              ...s.playerRow,
              background: isActive
                ? `linear-gradient(90deg, ${playerColor}33 0%, transparent 100%)`
                : (isMe ? '#1e2d50' : 'transparent'),
              border: isActive ? `2px solid ${playerColor}` : '2px solid transparent',
              opacity: player.connected === false ? 0.5 : 1,
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
              transformOrigin: 'left center',
              transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
              '--turn-color': `${playerColor}80`,
            }}>
            <div style={s.topLine}>
              <div style={s.dot(player.color)} />
              <span style={s.name}>
                {player.name}{isMe ? ' (you)' : ''}
                {player.isBot && ' 🤖'}
              </span>
              <span style={s.vp}>⭐ {player.victoryPoints}</span>
            </div>
            {i === currentTurnIdx && <div style={s.currentLabel}>▶ {T.labels.currentTurn}</div>}
            {player.connected === false && <div style={s.offline}>● offline</div>}
            <div style={s.badges}>
              <Tooltip text={T.buildings.settlement}><span>🏠 {(player.settlements || []).length}</span></Tooltip>
              <Tooltip text={T.buildings.city}><span>🏰 {(player.cities || []).length}</span></Tooltip>
              <Tooltip text={T.buildings.road}><span>🛤 {(player.roads || []).length}</span></Tooltip>
              <Tooltip text={isMe ? T.buildings.devCard : 'Hidden'}><span>🎴 {totalDev}</span></Tooltip>
              <Tooltip text={T.labels.knights}><span>⚔️ {knightsPlayed}</span></Tooltip>
              <Tooltip text={isMe ? T.labels.yourHand : 'Resource cards'}><span>📦 {totalRes}</span></Tooltip>
              {player.id === largestArmyHolder && (
                <Tooltip text={`${T.labels.largestArmy} • ${knightsPlayed} ⚔️ • +2 VP`}>
                  <span style={{ color:'#f1c40f' }}>👑</span>
                </Tooltip>
              )}
              {player.id === longestRoadHolder && (
                <Tooltip text={`${T.labels.longestRoad} • ${player.longestRoadLength || 0} segments • +2 VP`}>
                  <span style={{ color:'#f1c40f' }}>🛣</span>
                </Tooltip>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
