import React, { useCallback, useEffect, useRef } from 'react';
import useCompass from '../../hooks/useCompass.js';
import { headingDelta } from '../../lib/compass.js';

const messages = {
  requesting: 'Permite el acceso a la orientación del teléfono.',
  waiting: 'Buscando dirección… Si no aparece, prueba al aire libre con el teléfono plano.',
  denied: 'Activa el permiso de movimiento y orientación en los ajustes del navegador.',
  unavailable: 'La brújula no está disponible en este dispositivo o navegador.',
};

export default function MapCompass({ map, location }) {
  const overlay = useRef(null);
  const bearing = useRef(null);
  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lng);
  const updateHeading = useCallback(heading => {
    bearing.current = heading;
    overlay.current?.updateHeading(heading);
  }, []);
  const { status, enabled, toggle } = useCompass(updateHeading);

  useEffect(() => {
    if (!map || !hasLocation) return;
    const maps = window.google.maps;
    class DirectionOverlay extends maps.OverlayView {
      constructor() {
        super();
        this.position = new maps.LatLng(location.lat, location.lng);
        this.angle = null;
        this.div = document.createElement('div');
        this.div.className = 'citymap-direction-cone';
        this.div.setAttribute('aria-hidden', 'true');
        this.div.style.cssText = 'position:absolute;width:96px;height:96px;pointer-events:none;transform:translate(-50%,-50%);display:none;';
        this.div.innerHTML = '<svg width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="citymap-compass-blue" x1="0" y1="1" x2="0" y2="0"><stop stop-color="#3b82f6" stop-opacity=".45"/><stop offset="1" stop-color="#3b82f6" stop-opacity=".04"/></linearGradient></defs><path d="M48 48 L16 9 Q48 -8 80 9 Z" fill="url(#citymap-compass-blue)"/></svg>';
      }
      onAdd() { this.getPanes().overlayLayer.appendChild(this.div); }
      onRemove() { this.div.remove(); }
      draw() {
        const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
        if (point) { this.div.style.left = `${point.x}px`; this.div.style.top = `${point.y}px`; }
      }
      updateHeading(heading) {
        this.div.style.display = heading === null ? 'none' : 'block';
        if (heading === null) { this.angle = null; return; }
        const target = heading - (map.getHeading?.() || 0);
        this.angle = this.angle === null ? target : this.angle + headingDelta(this.angle, target);
        this.div.firstElementChild.style.transform = `rotate(${this.angle}deg)`;
      }
    }
    const cone = new DirectionOverlay();
    overlay.current = cone;
    cone.setMap(map);
    cone.updateHeading(bearing.current);
    const headingListener = map.addListener('heading_changed', () => cone.updateHeading(bearing.current));
    return () => { headingListener.remove(); cone.setMap(null); overlay.current = null; };
    // Position is updated separately so GPS changes never recreate the cone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, hasLocation]);

  useEffect(() => {
    if (overlay.current && hasLocation) {
      overlay.current.position = new window.google.maps.LatLng(location.lat, location.lng);
      overlay.current.draw();
    }
  }, [hasLocation, location?.lat, location?.lng]);

  return <>
    <style>{`.citymap-direction-cone svg{transition:transform 160ms linear;transform-origin:48px 48px}@media(prefers-reduced-motion:reduce){.citymap-direction-cone svg{transition:none}}`}</style>
    {messages[status] && <div role="status" style={{ position: 'absolute', right: 66, bottom: 82, maxWidth: 'min(260px, calc(100% - 85px))', padding: '10px 12px', background: '#fff', color: '#334155', borderRadius: 12, fontSize: 12, lineHeight: 1.4, boxShadow: '0 3px 16px #0002', zIndex: 10 }}>{messages[status]}</div>}
    <button type="button" onClick={toggle} disabled={status === 'requesting' || !hasLocation}
      aria-label={enabled ? 'Desactivar brújula' : 'Activar brújula'} aria-pressed={enabled}
      title={!hasLocation ? 'Activa tu ubicación para usar la brújula' : enabled ? 'Desactivar brújula' : 'Activar brújula'}
      style={{ position: 'absolute', right: 14, bottom: 82, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: enabled ? '#eff6ff' : 'rgba(255,255,255,.95)', border: `1px solid ${enabled ? '#93c5fd' : 'rgba(0,0,0,.08)'}`, borderRadius: 14, boxShadow: '0 4px 16px #0002', color: enabled ? '#2563eb' : '#1f2937', opacity: hasLocation ? 1 : .5, cursor: hasLocation ? 'pointer' : 'default', zIndex: 10 }}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="m15.5 8.5-2 5-5 2 2-5Z" fill="currentColor"/><path d="M12 1v2" stroke="currentColor" strokeWidth="1.5"/></svg>
    </button>
    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }} role="status">{status === 'active' ? 'Brújula activa. El cono azul indica hacia dónde apunta tu teléfono.' : ''}</span>
  </>;
}
