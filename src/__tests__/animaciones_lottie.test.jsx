// Animaciones Lottie elegidas por Jonathan (13 nov 2026):
// - Cubos vacíos («Isometric Cubes Empty State Loader», Ision
//   Industries) en los estados vacíos: ciudad sin eventos, búsquedas
//   sin resultados y colecciones vacías de Mis Favoritos.
// - Confeti de logro («Confetti on transparent background», Sportbank
//   Design) una sola vez al completar la tarjeta de lealtad y al
//   canjear un premio (ScanView).
// - Boleto de avión («Plane Ticket - Blue», Yelena Mirsakova):
//   solo en el encabezado de /tours. Estuvo en el detalle del tour y
//   al inicio de Revista, pero Jonathan lo quitó de los dos (13 nov
//   2026): en Revista quedaba muy grande y estorbaba.
// - Trofeo de logro («trophy», Gift chuks): junto al confeti en
//   ScanView y cuando se completa una colección en Mis Favoritos.
// - Check de confirmación («Processing animation with a checkmark»,
//   Aswathy): al confirmar asistencia (RSVP) y al guardar cambios
//   (perfil y negocio).
// - Pin de ubicación («03 - Location») y reloj («time»): REMOTOS por
//   URL de LottieFiles en el detalle del tour (13 nov 2026, Jonathan
//   eligió solo la 1 y la 2 de la vista previa): el pin en el punto
//   de encuentro y el reloj junto a la duración, en bucle lento.
//   No hay binario en el repo: si la URL falla, LottieAnim se oculta.
// Las cinco primeras son gratuitas (Lottie Simple License) y viven en
// public/lottie/ como .lottie. El motor WASM va empaquetado con la
// app, sin CDN.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import LottieAnim from '../components/LottieAnim.jsx';
import EstadoVacio from '../components/EstadoVacio.jsx';
import ConfettiLogro from '../components/ConfettiLogro.jsx';
import TrofeoLogro from '../components/TrofeoLogro.jsx';
import CheckConfirmacion from '../components/CheckConfirmacion.jsx';
import { CUBOS_VACIOS_SRC, CONFETTI_LOGRO_SRC, BOLETO_AVION_SRC, TROFEO_LOGRO_SRC, CHECK_CONFIRMACION_SRC, PIN_UBICACION_SRC, RELOJ_DURACION_SRC } from '../lib/lottieAnimaciones.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const readBin = (p) => readFileSync(new URL(p, import.meta.url));

// Lee un .lottie (ZIP) y devuelve sus entradas infladas por nombre.
function entradasDotLottie(buf) {
  const entradas = {};
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const metodo = buf.readUInt16LE(off + 8);
    const tamComp = buf.readUInt32LE(off + 18);
    const tamNom = buf.readUInt16LE(off + 26);
    const tamExtra = buf.readUInt16LE(off + 28);
    const nombre = buf.toString('utf8', off + 30, off + 30 + tamNom);
    const inicioDatos = off + 30 + tamNom + tamExtra;
    const datosComp = buf.subarray(inicioDatos, inicioDatos + tamComp);
    entradas[nombre] = metodo === 8 ? inflateRawSync(datosComp) : datosComp;
    off = inicioDatos + tamComp;
  }
  return entradas;
}

function validarDotLottie(rutaPublic, nombreEsperado) {
  const buf = readBin(`../../public/lottie/${rutaPublic}`);
  expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
  const entradas = entradasDotLottie(buf);
  expect(Object.keys(entradas)).toContain('manifest.json');
  const manifest = JSON.parse(entradas['manifest.json'].toString('utf8'));
  expect(manifest.animations.length).toBeGreaterThan(0);
  // La animación puede vivir en `animations/<id>.json` (dotLottie v1)
  // o en `a/<nombre>.json` (dotLottie v2, p. ej. el check con su
  // state machine en `s/`): se busca la primera entrada JSON con
  // dimensiones y capas, que no sea el manifest ni la state machine.
  const idAnim = manifest.animations[0].id;
  const candidatos = [
    `animations/${idAnim}.json`,
    `a/${idAnim}.json`,
    ...Object.keys(entradas).filter(n => n.endsWith('.json') && n !== 'manifest.json'),
  ];
  let anim = null;
  for (const nombre of candidatos) {
    if (!entradas[nombre]) continue;
    try {
      const parsed = JSON.parse(entradas[nombre].toString('utf8'));
      if (typeof parsed.w === 'number' && typeof parsed.h === 'number' && Array.isArray(parsed.layers)) {
        anim = parsed;
        break;
      }
    } catch { /* no es la animación: seguir buscando */ }
  }
  expect(anim).not.toBeNull();
  expect(anim.w).toBeGreaterThan(0);
  expect(anim.h).toBeGreaterThan(0);
  expect(anim.op).toBeGreaterThan(anim.ip || 0);
  expect(anim.layers.length).toBeGreaterThan(0);
  return { buf, anim, manifest };
}

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#ddd',
  red: '#DC2626', gold: '#B8872A', green: '#000', greenL: '#F3F4F6',
  shadow: 'none', dark: false,
};

describe('Archivos .lottie en public/lottie', () => {
  it('cubos vacíos: dotLottie válido, ~2 KB', () => {
    const { buf, anim } = validarDotLottie('cubos-vacios.lottie');
    expect(buf.length).toBeLessThan(4096);
    expect(anim.w).toBe(256);
    expect(anim.h).toBe(256);
  });

  it('confeti de logro: dotLottie válido, ~14 KB, vertical', () => {
    const { buf, anim } = validarDotLottie('confetti-logro.lottie');
    expect(buf.length).toBeLessThan(32768);
    expect(anim.h).toBeGreaterThan(anim.w);
  });

  it('las rutas del lib apuntan a los archivos', () => {
    expect(CUBOS_VACIOS_SRC).toBe('/lottie/cubos-vacios.lottie');
    expect(CONFETTI_LOGRO_SRC).toBe('/lottie/confetti-logro.lottie');
  });
});

describe('LottieAnim: reproductor reutilizable', () => {
  it('renderiza un canvas (el reproductor se monta en el cliente)', () => {
    const html = renderToStaticMarkup(<LottieAnim src={CUBOS_VACIOS_SRC} width={120} height={120} ariaLabel="Sin contenido" />);
    expect(html).toContain('<canvas');
  });

  it('sin src no pinta nada', () => {
    expect(renderToStaticMarkup(<LottieAnim src="" />)).toBe('');
  });

  it('el motor WASM va empaquetado, no de CDN', () => {
    const src = read('../components/LottieAnim.jsx');
    expect(src).toContain('dotlottie-player.wasm?url');
    expect(src).toContain('setWasmUrl');
    // Sin URLs de CDN: el comentario nombra jsdelivr/unpkg solo para
    // explicar lo que se evita.
    expect(src).not.toContain('https://cdn.jsdelivr');
    expect(src).not.toContain('https://unpkg.com');
  });

  it('la dependencia está en package.json', () => {
    const pkg = JSON.parse(read('../../package.json'));
    expect(pkg.dependencies['@lottiefiles/dotlottie-react']).toBeTruthy();
  });
});

describe('EstadoVacio: cubos en los 2 estados vacíos restantes', () => {
  it('renderiza título, descripción y botón con el copy que le pasan', () => {
    const html = renderToStaticMarkup(
      <EstadoVacio titulo="En Tepic todavía no hay eventos" descripcion="Pronto habrá novedades" accionLabel="Limpiar filtros" onAccion={() => {}} T={T} />,
    );
    expect(html).toContain('En Tepic todavía no hay eventos');
    expect(html).toContain('Pronto habrá novedades');
    expect(html).toContain('Limpiar filtros');
    expect(html).toContain('<canvas');
  });

  it('sin acción no hay botón', () => {
    const html = renderToStaticMarkup(
      <EstadoVacio titulo="Esta colección está vacía." descripcion="Guarda lugares para que aparezcan aquí." T={T} />,
    );
    expect(html).toContain('Esta colección está vacía.');
    expect(html).not.toContain('<button');
  });

  it('bucle lento y discreto (0.7x)', () => {
    const src = read('../components/EstadoVacio.jsx');
    expect(src).toContain('CUBOS_VACIOS_SRC');
    expect(src).toContain('speed={0.7}');
  });

  // Decisión de Jonathan, 13 Nov 2026: el inicio de ciudad sin eventos
  // ya no usa EstadoVacio (la sección «Próximos eventos» no se monta);
  // los cubos quedan para EventsView sin resultados y FavsView vacía.
  it('el inicio de ciudad (HomeEvents) ya NO usa EstadoVacio', () => {
    const src = read('../components/home/HomeEvents.jsx');
    expect(src).not.toContain('EstadoVacio');
    expect(src).not.toContain('eventos_ciudad_vacia');
  });

  it('Eventos sin resultados (EventsView) usa EstadoVacio con el mismo copy y botón', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('EstadoVacio');
    expect(src).toContain('eventos_sin_resultados');
    expect(src).toContain('eventos_sin_resultados_desc');
    expect(src).toContain('eventos_ciudad_vacia');
    expect(src).toContain('eventos_limpiar_filtros');
    expect(src).toContain('clearFilters');
  });

  it('colección vacía (FavsView) usa EstadoVacio con el mismo copy', () => {
    const src = read('../views/FavsView.jsx');
    expect(src).toContain('EstadoVacio');
    expect(src).toContain('col_vacia_1');
    expect(src).toContain('col_vacia_2');
    expect(src).toContain('Esta colección está vacía.');
    expect(src).toContain('Guarda lugares para que aparezcan aquí.');
  });
});

describe('ConfettiLogro: una sola vez, sin bloquear', () => {
  it('con show=false no pinta nada', () => {
    expect(renderToStaticMarkup(<ConfettiLogro show={false} onDone={() => {}} />)).toBe('');
  });

  it('con show=true pinta la capa fija de pantalla completa', () => {
    const html = renderToStaticMarkup(<ConfettiLogro show onDone={() => {}} />);
    expect(html).toContain('position:fixed');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('<canvas');
  });

  it('una sola reproducción y desmontaje con temporizador de seguridad', () => {
    const src = read('../components/ConfettiLogro.jsx');
    expect(src).toContain('CONFETTI_LOGRO_SRC');
    expect(src).toContain('loop={false}');
    expect(src).toContain('pointerEvents');
    expect(src).toContain('5000');
  });

  it('ScanView dispara el confeti al completar la tarjeta y al canjear el premio', () => {
    const src = read('../views/ScanView.jsx');
    expect(src).toContain('ConfettiLogro');
    expect(src).toContain('showConfetti');
    // Solo en los dos logros: completar sellos y canjear premio.
    expect(src).toContain('setShowConfetti(true)');
    expect(src).toMatch(/¡Premio entregado![\s\S]*setShowConfetti\(true\)/);
    expect(src).toMatch(/ha completado todos los sellos[\s\S]*setShowConfetti\(true\)/);
    // Los avisos y el flujo de sellos no cambian.
    expect(src).toContain('Sello agregado exitosamente.');
  });
});

describe('Archivos .lottie nuevos (ampliación, 3 más)', () => {
  it('boleto de avión: dotLottie válido, ~6 KB, formato ancho', () => {
    const { buf, anim } = validarDotLottie('boleto-avion.lottie');
    expect(buf.length).toBeGreaterThan(5000);
    expect(buf.length).toBeLessThan(9000);
    expect(anim.w).toBe(700);
    expect(anim.h).toBe(290);
  });

  it('trofeo de logro: dotLottie válido, ~3 KB, cuadrado', () => {
    const { buf, anim } = validarDotLottie('trofeo-logro.lottie');
    expect(buf.length).toBeGreaterThan(2500);
    expect(buf.length).toBeLessThan(5000);
    expect(anim.w).toBe(500);
    expect(anim.h).toBe(500);
  });

  it('check de confirmación: dotLottie válido, ~7 KB, con state machine', () => {
    const { buf, anim, manifest } = validarDotLottie('check-confirmacion.lottie');
    expect(buf.length).toBeGreaterThan(6000);
    expect(buf.length).toBeLessThan(9000);
    expect(anim.w).toBe(512);
    expect(anim.h).toBe(512);
    // Es un dotLottie v2: la escena lleva su máquina de estados
    // (reposo / proceso / palomita); el reproductor la ignora y
    // reproduce la escena completa una sola vez.
    expect(Array.isArray(manifest.stateMachines)).toBe(true);
    expect(manifest.stateMachines.length).toBeGreaterThan(0);
  });

  it('las rutas nuevas del lib apuntan a los archivos', () => {
    expect(BOLETO_AVION_SRC).toBe('/lottie/boleto-avion.lottie');
    expect(TROFEO_LOGRO_SRC).toBe('/lottie/trofeo-logro.lottie');
    expect(CHECK_CONFIRMACION_SRC).toBe('/lottie/check-confirmacion.lottie');
    for (const ruta of [BOLETO_AVION_SRC, TROFEO_LOGRO_SRC, CHECK_CONFIRMACION_SRC]) {
      expect(readBin(`../../public${ruta}`).length).toBeGreaterThan(0);
    }
  });
});

describe('Boleto de avión: solo /tours; Revista y detalle de tour ya no lo montan', () => {
  it('ToursView lo pone en el encabezado, en bucle lento', () => {
    const src = read('../components/ToursView.jsx');
    expect(src).toContain('BOLETO_AVION_SRC');
    expect(src).toContain('LottieAnim');
    expect(src).toContain('speed={0.7}');
    expect(src).toContain('width={220}');
  });

  it('TripsView (Revista) ya NO lo monta en ninguna posición', () => {
    // 13 nov 2026, Jonathan: quedó muy grande y estorbaba al inicio de
    // Revista; la animación queda solo en /tours.
    const src = read('../components/TripsView.jsx');
    expect(src).not.toContain('BOLETO_AVION_SRC');
    expect(src).not.toContain('LottieAnim');
    expect(src).not.toContain('width={320}');
    // El subtítulo y las píldoras siguen ahí, sin nada entre medias.
    const iSubtitulo = src.indexOf('revista_subtitulo", "Historias');
    const iPildoras = src.indexOf('selectedKey={typeFilter}');
    expect(iSubtitulo).toBeGreaterThan(-1);
    expect(iPildoras).toBeGreaterThan(iSubtitulo);
  });

  it('ExperienceViewer ya NO pone el boleto en el detalle del tour', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).not.toContain('BOLETO_AVION_SRC');
    // El detalle SÍ usa LottieAnim desde el 13 nov 2026, pero solo
    // para el pin (punto de encuentro) y el reloj (duración).
    expect(src).not.toContain('Reservar tour');
  });
});

describe('Pin y reloj remotos en el detalle del tour (solo la 1 y la 2)', () => {
  it('las rutas remotas son las URLs verificadas de la vista previa', () => {
    expect(PIN_UBICACION_SRC).toBe('https://assets-v2.lottiefiles.com/a/33adfd0a-1152-11ee-bf4c-cf4f5408cb33/Qw1z0D2rdR.lottie');
    expect(RELOJ_DURACION_SRC).toBe('https://assets-v2.lottiefiles.com/a/399811bc-1164-11ee-ab46-5f393e5d8bac/9mUqK6fQog.lottie');
  });

  it('el pin se monta solo con punto de encuentro, en su caja de icono', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).toContain('PIN_UBICACION_SRC');
    expect(src).toContain('LottieAnim');
    // Dentro del bloque condicionado por exp.meeting_point (si el tour
    // no tiene punto de encuentro, no se monta nada).
    expect(src.indexOf('exp.meeting_point && (')).toBeGreaterThan(-1);
    expect(src.indexOf('<LottieAnim src={PIN_UBICACION_SRC}')).toBeGreaterThan(src.indexOf('exp.meeting_point && ('));
    // En la caja de 36 del icono, en bucle lento, tamaño chico.
    expect(src).toContain('width={30}');
    expect(src).toContain('height={30}');
    expect(src).toContain('speed={0.7}');
  });

  it('el reloj se monta solo con duración, junto a ella en el héroe', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).toContain('RELOJ_DURACION_SRC');
    // Dentro del bloque condicionado por exp.duration (si el tour no
    // tiene duración, no se monta nada).
    expect(src.indexOf('exp.duration && (')).toBeGreaterThan(-1);
    expect(src.indexOf('<LottieAnim src={RELOJ_DURACION_SRC}')).toBeGreaterThan(src.indexOf('exp.duration && ('));
    // Tamaño chico, en bucle lento, sobre círculo blanco (el arte del
    // reloj es negro y el héroe es oscuro).
    expect(src).toContain('width={20}');
    expect(src).toContain('height={20}');
    expect(src).toContain('rgba(255,255,255,0.95)');
  });

  it('el reproductor acepta URL remota: renderiza el canvas', () => {
    const htmlPin = renderToStaticMarkup(<LottieAnim src={PIN_UBICACION_SRC} width={30} height={30} ariaLabel="Punto de encuentro" />);
    expect(htmlPin).toContain('<canvas');
    const htmlReloj = renderToStaticMarkup(<LottieAnim src={RELOJ_DURACION_SRC} width={20} height={20} ariaLabel="Duración" />);
    expect(htmlReloj).toContain('<canvas');
  });

  it('la 3 (corazón) y la 4 (check) NO se agregan al detalle', () => {
    const src = read('../components/ExperienceViewer.jsx');
    expect(src).not.toContain('CHECK_CONFIRMACION_SRC');
    expect(src).not.toContain('CheckConfirmacion');
    expect(src).not.toContain('TROFEO_LOGRO_SRC');
  });
});

describe('TrofeoLogro: una sola vez, por encima del confeti', () => {
  it('con show=false no pinta nada', () => {
    expect(renderToStaticMarkup(<TrofeoLogro show={false} onDone={() => {}} />)).toBe('');
  });

  it('con show=true pinta el overlay centrado sin bloquear', () => {
    const html = renderToStaticMarkup(<TrofeoLogro show mensaje="¡Colección completada!" onDone={() => {}} />);
    expect(html).toContain('position:fixed');
    expect(html).toContain('pointer-events:none');
    expect(html).toContain('¡Colección completada!');
    expect(html).toContain('<canvas');
  });

  it('una sola reproducción, por encima del confeti, con temporizador de seguridad', () => {
    const src = read('../components/TrofeoLogro.jsx');
    expect(src).toContain('TROFEO_LOGRO_SRC');
    expect(src).toContain('loop={false}');
    expect(src).toContain('pointerEvents');
    expect(src).toContain('5000');
    // zIndex mayor que el del confeti (200000): el trofeo queda encima.
    expect(src).toContain('200001');
  });

  it('ScanView dispara el trofeo junto al confeti en los dos logros', () => {
    const src = read('../views/ScanView.jsx');
    expect(src).toContain('TrofeoLogro');
    expect(src).toContain('showTrofeo');
    expect(src).toContain('setShowTrofeo(true)');
    expect(src).toMatch(/¡Premio entregado![\s\S]*setShowTrofeo\(true\)/);
    expect(src).toMatch(/ha completado todos los sellos[\s\S]*setShowTrofeo\(true\)/);
  });

  it('FavsView celebra cuando se completa una colección', () => {
    const src = read('../views/FavsView.jsx');
    expect(src).toContain('TrofeoLogro');
    expect(src).toContain('showTrofeo');
    expect(src).toContain('fav_coleccion_completada');
    // Solo en la transición a completa: no estaba completa antes y
    // ahora sí; una colección vacía nunca dispara el trofeo.
    expect(src).toContain('antesCompleta');
    expect(src).toContain('ahoraCompleta');
    expect(src).toContain('valid.length > 0');
    expect(src).toContain('setShowTrofeo(true)');
  });
});

describe('CheckConfirmacion: una sola vez, en línea', () => {
  it('con show=false no pinta nada', () => {
    expect(renderToStaticMarkup(<CheckConfirmacion show={false} onDone={() => {}} />)).toBe('');
  });

  it('con show=true pinta el check en línea', () => {
    const html = renderToStaticMarkup(<CheckConfirmacion show onDone={() => {}} />);
    expect(html).toContain('check-confirmacion');
    expect(html).toContain('<canvas');
  });

  it('una sola reproducción, más rápido que la velocidad normal, con temporizador de seguridad', () => {
    const src = read('../components/CheckConfirmacion.jsx');
    expect(src).toContain('CHECK_CONFIRMACION_SRC');
    expect(src).toContain('loop={false}');
    expect(src).toContain('speed={1.5}');
    expect(src).toContain('5000');
  });

  it('RSVP muestra el check al confirmar asistencia', () => {
    const src = read('../components/detail/PrivateEventRsvp.jsx');
    expect(src).toContain('CheckConfirmacion');
    expect(src).toContain('showCheck');
    expect(src).toContain('setShowCheck(true)');
    // El aviso y la línea minimizada no cambian.
    expect(src).toContain('Confirmación guardada');
    expect(src).toContain('setCollapsed(true)');
  });

  it('el perfil muestra el check al guardar y cierra al terminar', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('CheckConfirmacion');
    expect(src).toContain('showCheck');
    expect(src).toContain('setShowCheck(true)');
    expect(src).toContain('setIsEditingProfile(false)');
    expect(src).toContain('Perfil actualizado');
  });

  it('el formulario de negocio muestra el check al guardar y cierra al terminar', () => {
    const src = read('../components/admin/AdminBizTab.jsx');
    expect(src).toContain('CheckConfirmacion');
    expect(src).toContain('showCheck');
    expect(src).toContain('setShowCheck(true)');
    expect(src).toContain('setBizForm(null)');
  });
});
