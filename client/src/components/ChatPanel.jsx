import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { T } from '../i18n';

const s = {
  wrap: { display:'flex', flexDirection:'column', gap:6, height:'100%', minHeight:0 },
  list: { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:3, padding:'4px 2px', minHeight:0 },
  msg: { padding:'4px 7px', background:'#0f3460', borderRadius:5, fontSize:11, wordBreak:'break-word' },
  msgName: { fontWeight:700, color:'#7b68ee', marginRight:5 },
  msgText: { color:'#eee' },
  empty: { fontSize:11, color:'#666', textAlign:'center', padding:20 },
  inputRow: { display:'flex', gap:4 },
  input: { flex:1, fontSize:11, padding:'5px 8px' },
  sendBtn: { padding:'5px 10px', background:'#7b68ee', color:'#fff', fontSize:11 },
};

export default function ChatPanel({ roomId, myName, onUnreadChange, isActive }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const onNew = ({ message }) => {
      setMessages(prev => [...prev.slice(-99), message]);
      if (!isActive && message.name !== myName) {
        onUnreadChange?.(u => u + 1);
      }
    };
    socket.on('chat:new', onNew);
    return () => socket.off('chat:new', onNew);
  }, [isActive, myName, onUnreadChange]);

  useEffect(() => {
    if (isActive) onUnreadChange?.(0);
  }, [isActive, onUnreadChange]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    socket.emit('chat:send', { roomId, message: text }, (res) => {
      if (res?.error) alert(res.error);
    });
    setDraft('');
  }

  return (
    <div style={s.wrap}>
      <div style={s.list} ref={listRef} className="scrollable">
        {messages.length === 0 && <div style={s.empty}>{T.msgs.noChat}</div>}
        {messages.map(m => (
          <div key={m.id} style={s.msg}>
            <span style={s.msgName}>{m.name}:</span>
            <span style={s.msgText}>{m.text}</span>
          </div>
        ))}
      </div>
      <div style={s.inputRow}>
        <input
          style={s.input}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={T.msgs.typeMessage}
          maxLength={200}
        />
        <button style={s.sendBtn} onClick={send}>{T.actions.send}</button>
      </div>
    </div>
  );
}
