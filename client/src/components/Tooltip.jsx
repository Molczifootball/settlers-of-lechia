import React, { useState, useRef } from 'react';

const s = {
  wrap: { display:'inline-block', position:'relative' },
  bubble: {
    position:'absolute', bottom:'calc(100% + 6px)', left:'50%',
    transform:'translateX(-50%)', background:'#000d', color:'#fff',
    padding:'5px 9px', borderRadius:5, fontSize:11, whiteSpace:'nowrap',
    zIndex:300, pointerEvents:'none',
    boxShadow:'0 2px 8px #0008',
  },
  arrow: {
    position:'absolute', top:'100%', left:'50%', marginLeft:-4,
    width:0, height:0, borderStyle:'solid',
    borderWidth:'4px 4px 0 4px', borderColor:'#000d transparent transparent transparent',
  },
};

export default function Tooltip({ text, children, delay = 250 }) {
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  function onEnter() {
    timer.current = setTimeout(() => setShow(true), delay);
  }
  function onLeave() {
    clearTimeout(timer.current);
    setShow(false);
  }

  return (
    <span style={s.wrap} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && text && (
        <span style={s.bubble}>
          {text}
          <span style={s.arrow} />
        </span>
      )}
    </span>
  );
}
