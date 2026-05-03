import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { T } from '../i18n';

const STATES = {
  connected:    { color:'#2ecc71', label: () => T.msgs.connected, dot:'●' },
  disconnected: { color:'#e74c3c', label: () => T.msgs.disconnected, dot:'●' },
  reconnecting: { color:'#f1c40f', label: () => T.msgs.reconnecting, dot:'◐' },
};

const s = {
  wrap: {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'4px 10px', borderRadius:14, background:'#0f3460',
    fontSize:11, fontWeight:700,
  },
};

export default function ConnectionIndicator() {
  const [state, setState] = useState(socket.connected ? 'connected' : 'disconnected');

  useEffect(() => {
    const onConnect = () => setState('connected');
    const onDisconnect = () => setState('disconnected');
    const onReconnectAttempt = () => setState('reconnecting');
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onConnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onConnect);
    };
  }, []);

  const cfg = STATES[state] || STATES.disconnected;
  return (
    <div style={s.wrap} title={cfg.label()}>
      <span style={{ color: cfg.color, fontSize:14, lineHeight:1 }}>{cfg.dot}</span>
      <span>{cfg.label()}</span>
    </div>
  );
}
