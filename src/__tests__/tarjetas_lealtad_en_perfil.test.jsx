import React from 'react';
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';
import { loadLoyaltyEntries, prefetchLoyaltyEntries, getPrefetchedLoyaltyEntries, refreshLoyaltyEntries, clearPrefetchedLoyaltyEntries } from '../lib/loyaltyMemberships.js';
import ProfileLoyaltyCarousel from '../components/loyalty/ProfileLoyaltyCarousel.jsx';
import AccountView from '../components/AccountView.jsx';
import { AppContext } from '../context/AppContext.jsx';

vi.mock('../lib/supabase.js', () => ({ sb: { get: vi.fn() } }));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};

const USER = {
  id: 'user-jonathan',
  email: 'jgarana18@gmail.com',
  user_metadata: { name: 'Jonathan Arana', avatar_url: null },
};

const CARRITO_CARD = {
  id: 'card-carrito', biz_id: 'biz-carrito', stamps_required: 5,
  bg_color: '#F59E0B', text_color: '#451A03', primary_color: '#78350F',
  reward_text: '2 Tostadas gratis', type: 'stamps',
};
const CARRITO_BIZ = { id: 'biz-carrito', name: 'Carrito La Paz Tostadas de Atún' };

function makeEntry(id, name, stamps = 0) {
  return {
    member: { id: `m-${id}`, card_id: `card-${id}`, biz_id: `biz-${id}`, stamps },
    card: {
      id: `card-${id}`, biz_id: `biz-${id}`, stamps_required: 5,
      bg_color: '#F59E0B', text_color: '#451A03', primary_color: '#78350F',
      reward_text: '2 Tostadas gratis', type: 'stamps',
    },
    biz: { id: `biz-${id}`, name },
  };
}

const CARRITO = {
  id: 'biz-carrito',
  name: 'Carrito La Paz Tostadas de Atún',
  status: 'approved',
  plan: 'premium',
  city_slug: 'tepic',
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  category: 'restaurantes',
};

const noop = () => {};
const fn = () => vi.fn();

function renderCarousel(props = {}) {
  return renderToStaticMarkup(
    <ProfileLoyaltyCarousel user={USER} T={T} dark={false} {...props} />
  );
}

function renderAccount(props = {}) {
  const ctx = {
    savedEventIds: [],
    setSelectedEvent: fn(),
    T, dark: false, navigate: fn(), setShowPlans: fn(),
    setShowAddBiz: fn(), setShowAuth: fn(), user: USER,
  };
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppContext.Provider value={ctx}>
        <AccountView
          user={USER}
          profile={null}
          isAdmin={false}
          T={T}
          dark={false}
          favIds={[]}
          reviews={[]}
          wallet={[]}
          coupons={[]}
          claimedCoupons={{}}
          biz={[]}
          myBizList={[CARRITO]}
          setShowAuth={fn()}
          setAuthMode={fn()}
          setEditBizId={fn()}
          setAddBizForm={fn()}
          setShowAddBiz={fn()}
          setOwnerView={fn()}
          setSelected={fn()}
          navigate={fn()}
          doSignOut={fn()}
          toast$={fn()}
          viewStyle={{}}
          setUser={fn()}
          authChecked
          setShowAdmin={fn()}
          setStoreAdminBiz={fn()}
          {...props}
        />
      </AppContext.Provider>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  // AccountView lee navigator.userAgent y window.MSStream al renderizar
  // (detección de iOS): en Node no existen, se simulan.
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
  vi.stubGlobal('window', { MSStream: undefined });
  // El diccionario en inglés se carga en diferido: sin esto TRANSLATIONS.en
  // es undefined (mismo patrón que experiencias_destacadas_carrusel.test.jsx).
  await ensureEnglishTranslations();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('loadLoyaltyEntries: la misma fuente que «Recompensas»', () => {
  const MEMBERS = [
    { id: 'm1', user_id: 'user-jonathan', biz_id: 'biz-carrito', card_id: 'card-carrito', stamps: 2 },
    // Segunda membresía del mismo negocio: se descarta (una por negocio).
    { id: 'm2', user_id: 'user-jonathan', biz_id: 'biz-carrito', card_id: 'card-carrito', stamps: 3 },
    { id: 'm3', user_id: 'user-jonathan', biz_id: 'biz-cafe', card_id: 'card-cafe', stamps: 0 },
    // Tarjeta que ya no existe: la entrada se descarta.
    { id: 'm4', user_id: 'user-jonathan', biz_id: 'biz-sin-tarjeta', card_id: 'card-missing', stamps: 1 },
    // Negocio que ya no existe: la entrada se descarta.
    { id: 'm5', user_id: 'user-jonathan', biz_id: 'biz-sin-negocio', card_id: 'card-x', stamps: 1 },
  ];
  const CARDS = {
    'card-carrito': CARRITO_CARD,
    'card-cafe': { ...CARRITO_CARD, id: 'card-cafe', biz_id: 'biz-cafe', reward_text: 'Un café gratis' },
    'card-x': { ...CARRITO_CARD, id: 'card-x', biz_id: 'biz-sin-negocio' },
  };
  const BIZ = {
    'biz-carrito': CARRITO_BIZ,
    'biz-cafe': { id: 'biz-cafe', name: 'Café de Prueba' },
    'biz-sin-tarjeta': { id: 'biz-sin-tarjeta', name: 'Negocio Sin Tarjeta' },
  };

  function mockSb() {
    sb.get.mockImplementation(async (table, params = '') => {
      if (table === 'loyalty_members') return MEMBERS;
      const id = (params.match(/id=eq\.([^&]+)/) || [])[1];
      if (table === 'loyalty_cards') return id && CARDS[id] ? [CARDS[id]] : [];
      if (table === 'businesses') return id && BIZ[id] ? [BIZ[id]] : [];
      return [];
    });
  }

  it('une membresías con su tarjeta y su negocio, una por negocio', async () => {
    mockSb();
    const entries = await loadLoyaltyEntries(USER);
    expect(entries).toHaveLength(2);
    expect(entries[0].member.id).toBe('m1');
    expect(entries[0].card.reward_text).toBe('2 Tostadas gratis');
    expect(entries[0].biz.name).toBe('Carrito La Paz Tostadas de Atún');
    expect(entries[1].member.id).toBe('m3');
    expect(entries[1].biz.name).toBe('Café de Prueba');
  });

  it('sin usuario devuelve [] y no consulta la base', async () => {
    mockSb();
    expect(await loadLoyaltyEntries(null)).toEqual([]);
    expect(sb.get).not.toHaveBeenCalled();
  });
});

describe('Perfil: carrusel de tarjetas de lealtad (propuesta B)', () => {
  const THREE = [
    makeEntry('carrito', 'Carrito La Paz Tostadas de Atún', 0),
    makeEntry('cafe', 'Café de Prueba', 3),
    makeEntry('taqueria', 'Taquería de Prueba', 5),
  ];

  it('con 3 tarjetas: título, las 3 tarjetas y puntos de posición', () => {
    const html = renderCarousel({ entries: THREE });
    expect(html).toContain('Mis tarjetas de lealtad');
    for (const name of ['Carrito La Paz Tostadas de Atún', 'Café de Prueba', 'Taquería de Prueba']) {
      expect(html).toContain(name);
    }
    // Carrusel deslizable con el dedo (scroll-snap), no lista vertical:
    // la pista se alinea a la izquierda para que asome la siguiente.
    expect(html).toContain('scroll-snap-type:x mandatory');
    expect(html).toContain('justify-content:flex-start');
    // Un punto por tarjeta, con su etiqueta.
    expect(html).toContain('Ver tarjeta 1 de 3');
    expect(html).toContain('Ver tarjeta 2 de 3');
    expect(html).toContain('Ver tarjeta 3 de 3');
  });

  it('con UNA sola tarjeta: aparece CENTRADA, sin puntos ni asomo de otra', () => {
    const html = renderCarousel({ entries: [makeEntry('carrito', 'Carrito La Paz Tostadas de Atún', 0)] });
    expect(html).toContain('Mis tarjetas de lealtad');
    expect(html).toContain('Carrito La Paz Tostadas de Atún');
    // La condición de Jonathan: centrada, no a la izquierda.
    expect(html).toContain('justify-content:center');
    // Sin carrusel: sin scroll-snap activo ni puntos de posición.
    expect(html).not.toContain('scroll-snap-type:x mandatory');
    expect(html).not.toContain('Ver tarjeta');
    expect(html).not.toContain('<button');
  });

  it('sin tarjetas activas no renderiza nada', () => {
    expect(renderCarousel({ entries: [] })).toBe('');
  });

  it('sin entradas ni usuario no renderiza nada (la carga no corre en SSR)', () => {
    expect(renderCarousel({ user: null })).toBe('');
  });

  it('el título va al mismo tamaño que «Mi actividad» y «Mi Negocio» (20 px)', () => {
    const html = renderCarousel({ entries: [makeEntry('carrito', 'Carrito La Paz Tostadas de Atún', 0)] });
    const titlePos = html.indexOf('Mis tarjetas de lealtad');
    expect(titlePos).toBeGreaterThan(0);
    const titleSpan = html.lastIndexOf('<span', titlePos);
    const titleStyle = html.slice(titleSpan, titlePos);
    expect(titleStyle).toContain('font-size:20px');
    expect(titleStyle).toContain('font-weight:800');
    expect(titleStyle).toContain('letter-spacing:-0.5px');
  });

  it('al tocar una tarjeta se abre el mismo detalle con QR que en «Recompensas»', () => {
    const carouselSrc = read('../components/loyalty/ProfileLoyaltyCarousel.jsx');
    expect(carouselSrc).toContain('LoyaltyCardModal');
    expect(carouselSrc).toContain('onCardClick={setSelectedCard}');
    expect(carouselSrc).toContain('open={!!selectedCard}');
    // Y la tarjeta dispara el tap con los mismos datos que en WalletView.
    const cardSrc = read('../components/loyalty/LoyaltyCard.jsx');
    expect(cardSrc).toContain('onClick={() => onCardClick({ member, card, biz })}');
  });

  it('las claves de texto existen en ES y EN', () => {
    expect(TRANSLATIONS.es['cuenta_mis_tarjetas_lealtad']).toBe('Mis tarjetas de lealtad');
    expect(TRANSLATIONS.en['cuenta_mis_tarjetas_lealtad']).toBe('My loyalty cards');
    expect(TRANSLATIONS.es['cuenta_ver_tarjeta']).toBe('Ver tarjeta');
    expect(TRANSLATIONS.en['cuenta_ver_tarjeta']).toBe('View card');
    // El grupo «Cuenta» pasó a llamarse «Mi actividad».
    expect(TRANSLATIONS.es['cuenta_mi_actividad']).toBe('Mi actividad');
    expect(TRANSLATIONS.en['cuenta_mi_actividad']).toBe('My activity');
  });
});

describe('Precarga al abrir la app: las tarjetas ya están al entrar en el perfil', () => {
  const MEMBERS = [
    { id: 'm1', user_id: 'user-jonathan', biz_id: 'biz-carrito', card_id: 'card-carrito', stamps: 2 },
  ];

  function mockSb() {
    sb.get.mockImplementation(async (table, params = '') => {
      if (table === 'loyalty_members') return MEMBERS;
      const id = (params.match(/id=eq\.([^&]+)/) || [])[1];
      if (table === 'loyalty_cards') return id === 'card-carrito' ? [CARRITO_CARD] : [];
      if (table === 'businesses') return id === 'biz-carrito' ? [CARRITO_BIZ] : [];
      return [];
    });
  }

  it('prefetchLoyaltyEntries carga una sola vez por usuario y reusa la promesa', async () => {
    mockSb();
    clearPrefetchedLoyaltyEntries();
    prefetchLoyaltyEntries(USER);
    prefetchLoyaltyEntries(USER);
    const entries = await getPrefetchedLoyaltyEntries(USER);
    expect(entries).toHaveLength(1);
    expect(entries[0].biz.name).toBe('Carrito La Paz Tostadas de Atún');
    // Aunque se precargue dos veces, la base solo se consulta una vez.
    expect(sb.get.mock.calls.filter(([t]) => t === 'loyalty_members')).toHaveLength(1);
  });

  it('sin usuario no precarga nada', () => {
    clearPrefetchedLoyaltyEntries();
    prefetchLoyaltyEntries(null);
    expect(getPrefetchedLoyaltyEntries(null)).toBeNull();
    expect(sb.get).not.toHaveBeenCalled();
  });

  it('para otro usuario no devuelve la precarga', async () => {
    mockSb();
    clearPrefetchedLoyaltyEntries();
    prefetchLoyaltyEntries(USER);
    expect(getPrefetchedLoyaltyEntries({ id: 'otro-usuario' })).toBeNull();
  });

  it('si la precarga falla, se descarta y el carrusel puede cargar al entrar', async () => {
    clearPrefetchedLoyaltyEntries();
    sb.get.mockRejectedValue(new Error('sin red'));
    prefetchLoyaltyEntries(USER);
    await expect(getPrefetchedLoyaltyEntries(USER)).resolves.toEqual([]);
    // Tras el fallo la caché se limpia: la siguiente lectura es null y el
    // carrusel vuelve a cargar con loadLoyaltyEntries.
    expect(getPrefetchedLoyaltyEntries(USER)).toBeNull();
  });

  it('clearPrefetchedLoyaltyEntries descarta la precarga (cierre de sesión)', async () => {
    mockSb();
    clearPrefetchedLoyaltyEntries();
    prefetchLoyaltyEntries(USER);
    await getPrefetchedLoyaltyEntries(USER);
    clearPrefetchedLoyaltyEntries();
    expect(getPrefetchedLoyaltyEntries(USER)).toBeNull();
  });

  it('el carrusel pinta la precarga al instante y refresca en segundo plano (sin recargar)', () => {
    const src = read('../components/loyalty/ProfileLoyaltyCarousel.jsx');
    expect(src).toContain('getPrefetchedLoyaltyEntries(user)');
    expect(src).toContain('refreshLoyaltyEntries(user)');
    // Ya no es «precarga o carga»: siempre refresca al entrar, para que la
    // tarjeta recién unida aparezca sin recargar la página.
    expect(src).not.toContain('getPrefetchedLoyaltyEntries(user) ?? loadLoyaltyEntries(user)');
  });

  it('App.jsx dispara la precarga al conocer la sesión y la limpia al cerrar sesión', () => {
    const src = read('../App.jsx');
    expect(src).toContain("import { prefetchLoyaltyEntries, clearPrefetchedLoyaltyEntries } from './lib/loyaltyMemberships.js'");
    expect(src).toContain('prefetchLoyaltyEntries(user)');
    expect(src).toContain('clearPrefetchedLoyaltyEntries()');
    // Sin await: la precarga no frena el arranque ni la primera pintura.
    expect(src).not.toContain('await prefetchLoyaltyEntries');
  });
});

describe('Tarjeta recién unida aparece sin recargar (stale-while-revalidate)', () => {
  let members;
  const CAFE_CARD = { ...CARRITO_CARD, id: 'card-cafe', biz_id: 'biz-cafe', reward_text: 'Un café gratis' };
  const CAFE_BIZ = { id: 'biz-cafe', name: 'Café de Prueba' };

  function mockSb() {
    sb.get.mockImplementation(async (table, params = '') => {
      if (table === 'loyalty_members') return members;
      const id = (params.match(/id=eq\.([^&]+)/) || [])[1];
      if (table === 'loyalty_cards') return id === 'card-carrito' ? [CARRITO_CARD] : id === 'card-cafe' ? [CAFE_CARD] : [];
      if (table === 'businesses') return id === 'biz-carrito' ? [CARRITO_BIZ] : id === 'biz-cafe' ? [CAFE_BIZ] : [];
      return [];
    });
  }

  const M1 = { id: 'm1', user_id: 'user-jonathan', biz_id: 'biz-carrito', card_id: 'card-carrito', stamps: 0 };
  const M2 = { id: 'm2', user_id: 'user-jonathan', biz_id: 'biz-cafe', card_id: 'card-cafe', stamps: 0 };

  it('refreshLoyaltyEntries trae la lista fresca y la deja como la nueva precarga', async () => {
    mockSb();
    clearPrefetchedLoyaltyEntries();
    members = [M1];
    prefetchLoyaltyEntries(USER);
    expect(await getPrefetchedLoyaltyEntries(USER)).toHaveLength(1);
    // El usuario se une a otro programa DESPUÉS de la precarga.
    members = [M1, M2];
    const fresh = await refreshLoyaltyEntries(USER);
    expect(fresh).toHaveLength(2);
    expect(fresh[1].biz.name).toBe('Café de Prueba');
    // La caché ya es la lista fresca: la próxima lectura no usa la vieja.
    expect(await getPrefetchedLoyaltyEntries(USER)).toHaveLength(2);
  });

  it('si el refresco falla, rechaza y descarta la caché (no borra lo mostrado)', async () => {
    mockSb();
    clearPrefetchedLoyaltyEntries();
    members = [M1];
    prefetchLoyaltyEntries(USER);
    await getPrefetchedLoyaltyEntries(USER);
    sb.get.mockRejectedValue(new Error('sin red'));
    await expect(refreshLoyaltyEntries(USER)).rejects.toThrow('sin red');
    expect(getPrefetchedLoyaltyEntries(USER)).toBeNull();
  });

  it('sin usuario el refresco resuelve [] sin consultar la base', async () => {
    mockSb();
    expect(await refreshLoyaltyEntries(null)).toEqual([]);
    expect(sb.get).not.toHaveBeenCalled();
  });

  it('el join invalida la precarga al crear la membresía', () => {
    const src = read('../views/LoyaltyCardView.jsx');
    expect(src).toContain("import { clearPrefetchedLoyaltyEntries } from '../lib/loyaltyMemberships.js'");
    // Se invalida DESPUÉS de crear la membresía, no antes de inscribir.
    const setMemberPos = src.indexOf('setMember(res[0])');
    const clearPos = src.indexOf('clearPrefetchedLoyaltyEntries()', setMemberPos);
    expect(setMemberPos).toBeGreaterThan(0);
    expect(clearPos).toBeGreaterThan(setMemberPos);
  });

  it('el carrusel pinta la precarga primero y el refresco no la borra si falla', () => {
    const src = read('../components/loyalty/ProfileLoyaltyCarousel.jsx');
    // La precarga se muestra al instante…
    expect(src).toContain('if (prefetched) {');
    expect(src).toContain('if (alive && !freshArrived) setEntries(list)');
    // …y el refresco actualiza después; si falla, no se limpia la lista.
    expect(src).toContain('freshArrived = true');
    expect(src).toContain('if (alive && !prefetched) setEntries([])');
    // La precarga vieja no puede sobreescribir al refresco si resuelve después.
    expect(src).toContain('let freshArrived = false');
  });
});

describe('Perfil: la sección queda debajo del encabezado y encima de «Mi Billetera»', () => {
  it('en el código, el carrusel va entre el encabezado y la sección WALLET', () => {
    const src = read('../components/AccountView.jsx');
    const headerPos = src.indexOf('HEADER USER INFO');
    const carouselPos = src.indexOf('<ProfileLoyaltyCarousel user={user}');
    const walletPos = src.indexOf('── WALLET ──');
    expect(headerPos).toBeGreaterThan(0);
    expect(carouselPos).toBeGreaterThan(0);
    expect(walletPos).toBeGreaterThan(0);
    expect(headerPos).toBeLessThan(carouselPos);
    expect(carouselPos).toBeLessThan(walletPos);
  });

  it('sin tarjetas cargadas (SSR) la página queda como antes: sin sección, con el resto intacto', () => {
    const html = renderAccount();
    expect(html).not.toContain('Mis tarjetas de lealtad');
    expect(html).toContain('Jonathan Arana');
    expect(html).toContain('Mi Negocio (Carrito La Paz Tostadas de Atún)');
    expect(html).toContain('>Mi actividad<');
  });
});

describe('«Recompensas» sigue usando la misma fuente y el mismo renderizado', () => {
  it('WalletView carga sus entradas con loadLoyaltyEntries (sin una segunda consulta)', () => {
    const src = read('../views/WalletView.jsx');
    expect(src).toContain("import { loadLoyaltyEntries } from '../lib/loyaltyMemberships.js'");
    expect(src).toContain('loadLoyaltyEntries(user)');
    expect(src).not.toContain("sb.get('loyalty_members'");
  });

  it('la tarjeta se renderiza desde el componente compartido, no desde una copia', () => {
    const walletSrc = read('../views/WalletView.jsx');
    expect(walletSrc).toContain("import LoyaltyCard from '../components/loyalty/LoyaltyCard.jsx'");
    expect(walletSrc).not.toContain('function LoyaltyCard');
    const cardSrc = read('../components/loyalty/LoyaltyCard.jsx');
    expect(cardSrc).toContain('Programa de Lealtad');
    expect(cardSrc).toContain('Premio Desbloqueado');
  });
});
