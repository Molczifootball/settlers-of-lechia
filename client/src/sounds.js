// Tiny synth via Web Audio API — no asset files needed.

import { loadSettings } from './settings';

let ctx = null;
function getCtx() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {}
  }
  return ctx;
}

function tone({ freq = 440, dur = 0.08, type = 'sine', vol = 0.15, attack = 0.005, decay = 0.05, slideTo }) {
  const c = getCtx(); if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.linearRampToValueAtTime(0, t0 + dur + decay);

  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + decay + 0.02);
}

function noise({ dur = 0.08, vol = 0.05, lowpass = 1500 }) {
  const c = getCtx(); if (!c) return;
  const t0 = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

const SOUNDS = {
  roll: () => {
    // A series of clatter clicks
    for (let i = 0; i < 5; i++) {
      setTimeout(() => noise({ dur: 0.04, vol: 0.07, lowpass: 2200 }), i * 70);
    }
  },
  build: () => {
    // Low thud
    tone({ freq: 220, dur: 0.05, type: 'square', vol: 0.12, slideTo: 80, decay: 0.08 });
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.15, decay: 0.15 }), i * 90);
    });
  },
  error: () => {
    tone({ freq: 300, dur: 0.08, type: 'sawtooth', vol: 0.1, slideTo: 150 });
  },
  click: () => {
    tone({ freq: 800, dur: 0.02, type: 'sine', vol: 0.08, decay: 0.03 });
  },
  newCard: () => {
    tone({ freq: 600, dur: 0.06, type: 'triangle', vol: 0.1, slideTo: 900 });
  },
};

export function playSound(name) {
  const s = loadSettings();
  if (!s.sound) return;
  const fn = SOUNDS[name];
  if (fn) fn();
}
