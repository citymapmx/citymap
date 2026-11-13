// Pin HTML sobre Google Maps con OverlayView (12 nov 2026).
//
// POR QUÉ EXISTE ESTE ARCHIVO: Google eliminó `google.maps.Marker` de la
// API de JavaScript en el canal weekly (v3.66, referencia oficial
// actualizada 25 oct 2026: la sección "Marker (deprecated)" aparece
// tachada, igual que MarkerOptions, PlacesService, DirectionsService y
// DirectionsRenderer). La app carga el script SIN versión (canal weekly),
// así que la clase `google.maps.Marker` dejó de existir en tiempo de
// ejecución y montar Mis Favoritos (PR #267) lanzó
// `TypeError: ... is not a constructor`, que el ErrorBoundary convirtió
// «Algo salió mal» de toda la vista.
//
// OverlayView SÍ sigue vigente (librería "maps") y es el mismo mecanismo
// que ya usa el mapa principal para sus pines (HTMLMarker en GMap.jsx),
// así que este helper es la vía duradera: no necesita la librería
// "marker" ni un mapId (a diferencia de AdvancedMarkerElement, que exige
// mapId y no lo tenemos en modo oscuro).
//
// Uso:
//   const pin = createOverlayMarker(window.google, {
//     map, position: { lat, lng }, content: '<svg…/>', title: 'Nombre',
//     zIndex: 1, anchor: 'bottom' | 'center', opacity: 1,
//     onClick: () => onSelect(id),
//   });
//   pin.setPosition({ lat, lng }); // mueve el pin
//   pin.setContent('<svg…/>');    // cambia el dibujo
//   pin.setMap(null);              // lo quita del mapa
//
// `content` acepta un string HTML o un elemento. El pin se dibuja con un
// div posicionado en el pane overlayMouseTarget, así que recibe clics.

export function createOverlayMarker(google, options = {}) {
  const {
    map,
    position,
    content,
    title,
    zIndex = 0,
    anchor = 'bottom',
    opacity = 1,
    onClick,
  } = options;

  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.cursor = onClick ? 'pointer' : 'default';
  if (title) div.title = title;
  if (zIndex) div.style.zIndex = String(zIndex);
  if (opacity !== 1) div.style.opacity = String(opacity);
  if (typeof content === 'string') div.innerHTML = content;
  else if (content) div.appendChild(content);
  if (onClick) div.addEventListener('click', onClick);

  // La punta de la gota queda sobre el punto (como el anchor del Marker
  // viejo); 'center' centra el dibujo sobre el punto (pin de usuario).
  const transform = anchor === 'center'
    ? 'translate(-50%, -50%)'
    : 'translate(-50%, -100%)';

  class OverlayMarker extends google.maps.OverlayView {
    onAdd() {
      this.getPanes().overlayMouseTarget.appendChild(div);
    }

    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const p = proj.fromLatLngToDivPixel(this._pos);
      if (!p) return;
      div.style.left = `${p.x}px`;
      div.style.top = `${p.y}px`;
      div.style.transform = transform;
    }

    onRemove() {
      div.remove();
    }
  }

  const marker = new OverlayMarker();
  marker._pos = position;
  marker.div = div;
  // Compat con lo que el código viejo leía del Marker.
  marker.getPosition = () => marker._pos;
  marker.setPosition = (pos) => {
    marker._pos = pos;
    marker.draw();
  };
  marker.setContent = (next) => {
    if (typeof next === 'string') div.innerHTML = next;
    else if (next) div.replaceChildren(next);
  };
  marker.setOpacity = (value) => {
    div.style.opacity = String(value);
  };
  marker.setZIndex = (value) => {
    div.style.zIndex = String(value);
  };
  if (map) marker.setMap(map);
  return marker;
}
