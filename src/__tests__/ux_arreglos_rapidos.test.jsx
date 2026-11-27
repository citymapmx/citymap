// Arreglos rápidos de UX (26 nov 2026, ANALISIS-UX.md §11): una
// aserción por R sobre el código, más la prueba de comportamiento de
// R20 (el carrito persiste y vuelve tras recargar). Las pruebas de
// comportamiento de R7, R11 (vigencia), R18 y R19 viven en sus
// archivos (event_calendar, menu_promotions, event_listing) y las de
// R2 (render) en event_details.
import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

describe('UX arreglos rápidos R1–R20', () => {
  it('R1/R2: la tarjeta de evento pinta título, lugar, hora y precio', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('const price = getEventPrice(ev);');
    expect(src).toContain('const timeText = formatEventTime12h(ev.time, lang);');
    expect(src).toContain('eventos_precio_no_publicado');
    expect(src).toContain('eventos_hora_por_confirmar');
    expect(src).toContain('ev.venue_name');
  });
  it('R2: la tarjeta para compartir dice «Precio no publicado»', () => {
    expect(read('../lib/eventShareCard.js')).toContain("priceText = 'Precio no publicado';");
  });
  it('R3: la cáscara SEO excluye recurrentes de «Próximos eventos»', () => {
    const src = read('../../api/og.js');
    expect(src).toContain('is_recurring');
    expect(src).toContain('if (ev.is_recurring) return false;');
    expect(src).toContain('eventDateText(ev.end_date)');
  });
  it('R4: no queda ningún «me gusta» inventado ni corazón decorativo', () => {
    for (const path of ['../components/ExperienceViewer.jsx', '../components/TripsView.jsx']) {
      const src = read(path);
      expect(src).not.toContain('350 + 24');
      expect(src).not.toContain('charCodeAt');
    }
    expect(read('../components/ExperienceViewer.jsx')).not.toContain('CORAZON_LATE_SRC');
  });
  it('R5: /tours pide hasta 1000 filas, no 200', () => {
    const src = read('../components/ToursView.jsx');
    expect(src).toContain('limit=1000');
    expect(src).not.toContain('limit=200');
  });
  it('R6: un artículo inexistente muestra «ya no está disponible»', () => {
    const src = read('../components/TripsView.jsx');
    expect(src).toContain('const [lookupFailed, setLookupFailed] = useState(false);');
    expect(src).toContain('revista_articulo_no_existe');
    expect(src).toContain('Este artículo ya no está disponible');
  });
  it('R8: al guardar un evento se dispara el prompt de recordatorio', () => {
    expect(read('../App.jsx')).toContain('if (savedEvent) useUIStore.getState().setEventReminder(savedEvent);');
  });
  it('R9: la agenda del negocio pinta título y fecha sobre la foto', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain("[d ? `${d.day} ${d.month}` : null, fmtTime(ev.time)].filter(Boolean).join(' · ')");
  });
  it('R10: sin reseñas se lee «Sin reseñas aún», no 5 estrellas vacías', () => {
    expect(read('../views/DetailView.jsx')).toContain("t('detalle_sin_resenas', 'Sin reseñas aún')");
  });
  it('R11: el FAQ cuenta todas las ciudades y singulariza la reseña', () => {
    const src = read('../../api/og.js');
    expect(src).toContain('rest/v1/cities?select=slug&limit=100');
    expect(src).toContain("reseña${Number(bizData.review_count) === 1 ? '' : 's'}");
  });
  it('R12: la fecha del artículo se ve aunque no haya autor', () => {
    expect(read('../components/ExperienceViewer.jsx')).toContain('{(exp.author_name || exp.created_at) && (');
  });
  it('R13: la rueda enlaza «Ver todos los eventos»', () => {
    expect(read('../components/home/EventWheel3D.jsx')).toContain('seeAllHref');
    expect(read('../components/home/HomeEvents.jsx')).toContain("seeAllHref={activeCity ? `/eventos/${activeCity}` : '/eventos'}");
    expect(read('../views/GlobalHomeView.jsx')).toContain('seeAllHref="/eventos"');
    expect(read('../lib/i18n.js')).toContain('"eventos_ver_todos": "Ver todos los eventos"');
  });
  it('R14: «Mis Favoritos» ya no filtra por la ciudad activa', () => {
    const src = read('../views/FavsView.jsx');
    expect(src).not.toContain('isNear(');
    // Y trae por id los favoritos de otras ciudades (la tienda solo
    // carga la ciudad activa, así que quitar el filtro no bastaba).
    expect(src).toContain('const [extraBiz, setExtraBiz] = useState([]);');
    expect(src).toContain('id=in.(');
  });
  it('R15: la fila Lealtad/Reservar/VER MENÚ ya no se bloquea al cargar', () => {
    expect(read('../views/DetailView.jsx')).not.toContain('loyaltyLoading');
  });
  it('R16: fuera la fila «Impresiones (Est.)» inventada', () => {
    const src = read('../views/OwnerStatsView.jsx');
    expect(src).not.toContain('Math.floor(views * 1.8)');
    expect(src).toContain('Vistas');
  });
  it('R17: goDir usa coordenadas o cae a la dirección, nunca undefined', () => {
    const src = read('../App.jsx');
    expect(src).toContain('const hasCoords = b && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng));');
    expect(src).toContain("encodeURIComponent([b?.address, b?.name].filter(Boolean).join(', '))");
    expect(src).toContain('if (!destination) return;');
  });
});

describe('R20: el carrito persiste al recargar', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('guarda el pedido en localStorage y lo recupera con un módulo nuevo', async () => {
    // localStorage falso (un Map) antes de importar el store.
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, String(value)); },
      removeItem: (key) => { store.delete(key); },
    });
    vi.resetModules();
    const { useCart: cart1 } = await import('../hooks/useCart.js');
    expect(cart1.getState().addItem({ id: 'taco', name: 'Taco', price: 25 }, [], '', 1, 'biz-1')).toBe(true);
    const raw = store.get('citymap-cart');
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw);
    expect(saved.state.items).toHaveLength(1);
    expect(saved.state.items[0].product.name).toBe('Taco');
    expect(saved.state.businessId).toBe('biz-1');
    // isOpen NO se persiste: al volver, el carrito no se abre solo.
    expect(saved.state.isOpen).toBeUndefined();
    // «Recargar la página»: módulo nuevo, mismo almacenamiento.
    vi.resetModules();
    const { useCart: cart2 } = await import('../hooks/useCart.js');
    expect(cart2.getState().items).toHaveLength(1);
    expect(cart2.getState().items[0].product.name).toBe('Taco');
    expect(cart2.getState().businessId).toBe('biz-1');
    expect(cart2.getState().isOpen).toBe(false);
  });
  it('declara el nombre y el parcial en el código', () => {
    const src = read('../hooks/useCart.js');
    expect(src).toContain("name: 'citymap-cart'");
    expect(src).toContain('partialize: (state) => ({ businessId: state.businessId, items: state.items })');
  });
});
