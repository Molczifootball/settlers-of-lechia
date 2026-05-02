import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { T } from '../i18n';

const s = {
  wrap: { background:'#16213e', borderRadius:12, padding:12, display:'flex', flexDirection:'column', gap:8, height:280 },
  title: { fontSize:13, fontWeight:700, color:'#aaa', display:'flex', justifyContent:'space-between', alignItems:'center' },
  badge: { background:'#e74c3c', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 },
  list: { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4, padding:'4px 2px' },
  msg: { padding:'5px 8px', background:'#0f3460', borderRadius:6, fontSize:12, wordBreak:'break-word' },
  msgName: { fontWeight:700, color:'#7b68ee', marginRight:6 },
  msgText: { color:'#eee' },
  empty: { fontSize:12, color:'#666', textAlign:'center', marginTop:'40%' },
  inputRow: { display:'flex', gap:6 },
  input: { flex:1, fontSize:12, padding:'7px 10px' },
  sendBtn: { padding:'7px 12px', background:'#7b68ee', color:'#fff', fontSize:12 },
};

export default function ChatPanel({ roomId, myName }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const onNew = ({ message }) => {
      setMessages(prev => [...prev.slice(-99), message]);
      if (collapsed && message.name !== myName) setUnread(u => u + 1);
    };
    socket.on('chat:new', onNew);
    return () => socket.off('chat:new', onNew);
  }, [collapsed, myName]);

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

  function toggle() {
    setCollapsed(c => !c);
    if (collapsed) setUnread(0);
  }

  if (collapsed) {
    return (
      <div style={{ ...s.wrap, height:'auto', cursor:'pointer' }} onClick={toggle}>
        <div style={s.title}>
          <span>💬 {T.labels.chat}</span>
          {unread > 0 && <span style={s.badge}>{unread}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>
        <span style={{ cursor:'pointer' }} onClick={toggle}>💬 {T.labels.chat} ▾</span>
      </div>
      <div style={s.list} ref={listRef}>
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
