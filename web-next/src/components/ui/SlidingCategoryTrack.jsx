import React, {useLayoutEffect, useRef, useState} from 'react';

export default function SlidingCategoryTrack({selectedKey, dark, variant = 'pill', children, style, className = '', ...props}) {
  const track = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const node = track.current;
    if (!node) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const selected = node.querySelector(':scope > [aria-pressed="true"], :scope > [aria-selected="true"], :scope > [aria-current="page"]');
      if (!selected) { setPosition(null); return; }
      // Layout offsets stay stable while buttons scale under the pointer.
      const next = variant === 'dot'
        ? {x:selected.offsetLeft + (selected.offsetWidth - 4) / 2,y:selected.offsetTop + selected.offsetHeight - 4,width:4,height:4}
        : {x:selected.offsetLeft,y:selected.offsetTop,width:selected.offsetWidth,height:selected.offsetHeight};
      setPosition(previous => previous && Object.keys(next).every(key => previous[key] === next[key]) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    node.querySelectorAll(':scope > button, :scope > a').forEach(button => observer?.observe(button));
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(() => { if (!cancelled) measure(); });
    return () => { cancelled = true; observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [selectedKey, children, variant]);
  return <div {...props} ref={track} className={`sliding-category-track ${className}`} data-variant={variant} data-ready={Boolean(position)} style={{scrollbarWidth:'none',...style,position:'relative',isolation:'isolate'}}>
    <style>{`
      .sliding-category-track > button, .sliding-category-track > a { position: relative; z-index: 1; }
      .sliding-category-track[data-variant="pill"][data-ready="true"] > button { background: transparent !important; }
      .sliding-category-indicator { transition: transform 280ms cubic-bezier(.22,1,.36,1), width 280ms cubic-bezier(.22,1,.36,1), height 280ms cubic-bezier(.22,1,.36,1), background-color 180ms ease; }
      @media (prefers-reduced-motion: reduce) { .sliding-category-indicator { transition: none; } }
    `}</style>
    {position && <span aria-hidden="true" className="sliding-category-indicator" style={{position:'absolute',top:0,left:0,zIndex:0,pointerEvents:'none',borderRadius:9999,background:dark ? '#FFFFFF' : '#0F172A',width:position.width,height:position.height,transform:`translate3d(${position.x}px,${position.y}px,0)`}} />}
    {children}
  </div>;
}
