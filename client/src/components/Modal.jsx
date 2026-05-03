import React from 'react';

const VARIANT_COLORS = {
  default: { accent: '#7b68ee', glow: 'rgba(123, 104, 238, 0.25)' },
  danger:  { accent: '#e74c3c', glow: 'rgba(231, 76, 60, 0.3)' },
  warning: { accent: '#f39c12', glow: 'rgba(243, 156, 18, 0.3)' },
  success: { accent: '#2ecc71', glow: 'rgba(46, 204, 113, 0.3)' },
  info:    { accent: '#16a085', glow: 'rgba(22, 160, 133, 0.3)' },
  victory: { accent: '#f1c40f', glow: 'rgba(241, 196, 15, 0.4)' },
};

const s = {
  overlay: { position:'fixed', inset:0, background:'#000a', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, animation:'fadeIn 0.2s' },
  box: (v) => ({
    background: '#16213e',
    borderRadius: 14,
    padding: 24,
    minWidth: 340,
    maxWidth: 520,
    boxShadow: `0 16px 48px #000a, 0 0 0 2px ${v.accent}88, 0 0 30px ${v.glow}`,
    borderTop: `4px solid ${v.accent}`,
    animation: 'slideUp 0.25s',
  }),
  title: (v) => ({ fontSize: 18, fontWeight: 800, marginBottom: 14, color: v.accent }),
};

export default function Modal({ title, onClose, children, size, variant = 'default' }) {
  const v = VARIANT_COLORS[variant] || VARIANT_COLORS.default;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.box(v), ...(size === 'lg' ? { minWidth:480 } : {}) }} onClick={e => e.stopPropagation()}>
        {title && <div style={s.title(v)}>{title}</div>}
        {children}
      </div>
    </div>
  );
}
