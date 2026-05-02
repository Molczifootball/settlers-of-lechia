import React from 'react';

const s = {
  overlay: { position:'fixed', inset:0, background:'#000a', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, animation:'fadeIn 0.2s' },
  box: { background:'#16213e', borderRadius:14, padding:24, minWidth:340, maxWidth:520, boxShadow:'0 16px 48px #000a', animation:'slideUp 0.25s' },
  title: { fontSize:18, fontWeight:800, marginBottom:14, color:'#7b68ee' },
};

export default function Modal({ title, onClose, children, size }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.box, ...(size === 'lg' ? { minWidth:480 } : {}) }} onClick={e => e.stopPropagation()}>
        {title && <div style={s.title}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
