import React, { useState } from 'react';
import Modal from './Modal';
import { loadSettings, saveSettings, applySettingsToDOM } from '../settings';
import { T } from '../i18n';

const s = {
  row: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#0f3460', borderRadius:8, marginBottom:8 },
  label: { fontSize:13 },
  hint: { fontSize:11, color:'#aaa', marginTop:8, fontStyle:'italic' },
  toggle: (on) => ({
    width:48, height:26, padding:0, background: on ? '#7b68ee' : '#444',
    border:'none', borderRadius:13, position:'relative',
    transition:'background 0.15s', cursor:'pointer',
  }),
  knob: (on) => ({
    position:'absolute', top:3, left: on ? 25 : 3,
    width:20, height:20, borderRadius:'50%', background:'#fff',
    transition:'left 0.15s',
  }),
  langRow: { display:'flex', gap:6 },
  langBtn: (active) => ({
    flex:1, padding:8, fontSize:13,
    background: active ? '#7b68ee' : '#0f3460',
    color:'#fff', border:'2px solid ' + (active ? '#b0a0ff' : 'transparent'),
  }),
  close: { width:'100%', padding:10, marginTop:14, background:'#444', color:'#fff', fontSize:13 },
};

function Toggle({ value, onChange }) {
  return (
    <button style={s.toggle(value)} onClick={() => onChange(!value)}>
      <span style={s.knob(value)} />
    </button>
  );
}

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(loadSettings);
  const [reloadHint, setReloadHint] = useState(false);

  function update(patch) {
    const next = saveSettings(patch);
    setSettings(next);
    applySettingsToDOM();
    if (patch.lang !== undefined) setReloadHint(true);
  }

  return (
    <Modal title={`⚙️ ${T.actions.settings}`} onClose={onClose}>
      <div style={s.row}>
        <span style={s.label}>{T.labels.language}</span>
        <div style={s.langRow}>
          <button style={s.langBtn(settings.lang === 'pl')} onClick={() => update({ lang:'pl' })}>🇵🇱 Polski</button>
          <button style={s.langBtn(settings.lang === 'en')} onClick={() => update({ lang:'en' })}>🇬🇧 English</button>
        </div>
      </div>

      <div style={s.row}>
        <span style={s.label}>🔊 {T.labels.sound}</span>
        <Toggle value={settings.sound} onChange={v => update({ sound: v })} />
      </div>

      <div style={s.row}>
        <span style={s.label}>✨ {T.labels.animations}</span>
        <Toggle value={settings.animations} onChange={v => update({ animations: v })} />
      </div>

      <div style={s.row}>
        <span style={s.label}>👁 {T.labels.colorblind}</span>
        <Toggle value={settings.colorblind} onChange={v => update({ colorblind: v })} />
      </div>

      <div style={s.row}>
        <span style={s.label}>🎲 {T.labels.viewMode}</span>
        <div style={s.langRow}>
          <button style={s.langBtn(settings.viewMode === 'flat')} onClick={() => update({ viewMode:'flat' })}>{T.labels.viewFlat}</button>
          <button style={s.langBtn(settings.viewMode === 'iso')} onClick={() => update({ viewMode:'iso' })}>{T.labels.viewIso}</button>
        </div>
      </div>

      {reloadHint && (
        <div style={s.hint}>
          {T.msgs.languageChangeReload}{' '}
          <button style={{ background:'#7b68ee', color:'#fff', padding:'4px 10px', fontSize:12 }}
            onClick={() => location.reload()}>Reload now</button>
        </div>
      )}

      <button style={s.close} onClick={onClose}>{T.actions.confirm}</button>
    </Modal>
  );
}
