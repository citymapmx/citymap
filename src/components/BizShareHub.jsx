// Centro «Compartir mi negocio» (PR #240): un solo lugar con todo lo
// que el dueño puede compartir de su negocio, organizado por TIPO DE
// MATERIAL con 3 pestañas (propuesta A, Jonathan, 12 nov 2026):
// - «Redes»: las tarjetas para compartir que ya existen (ShareCardSheet
//   con sus estilos; la del menú abre la hoja en modo menú: «Para
//   pedir» y «QR del menú», como en la página del menú).
// - «Para imprimir»: tarjetas QR diseñadas (tarjeta de mesa, estilo
//   'qr' de ShareCardTemplate + exportShareCardPng): logo de CityMap,
//   nombre del negocio, QR y «Escanea…», listas para imprimir.
// - «QR suelto»: los QR pelados de siempre (api.qrserver.com,
//   1024×1024, sin diseño), Perfil y Menú.
// Lo usan los DOS sitios que antes tenían su propio QR: el modal de
// Mi Perfil (AccountView) y la sección del panel del negocio
// (StoreAdminPanel). Los materiales de menú solo salen si el negocio
// tiene platillos con precio (loadMenuItems, la misma consulta que
// BusinessStore); sin menú, cada pestaña ofrece solo el perfil. Sin
// foto o sin logo la tarjeta sale sin esa parte, nunca rota (la
// plantilla y el canvas ya lo hacen así).
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Icon from './ui/Icon.jsx';
import { useTranslation } from '../hooks/useTranslation.js';
import { useUIStore } from '../store/useUIStore.js';
import { useDataStore } from '../store/useDataStore.js';
import { displayRating } from '../lib/googleRatings.js';
import ShareCardTemplate from './ShareCardTemplate.jsx';
import {
  SHARE_CARD_FORMATS,
  buildMenuShareUrl,
  exportShareCardPng,
  loadMenuItems,
  shareOrDownloadPng,
} from '../lib/shareCard.js';
import {
  COMPARTIR_TABS,
  buildBareQrUrl,
  buildBizProfileUrl,
  buildQrCardData,
  compartirMaterials,
  qrCardFileName,
} from '../lib/compartirNegocio.js';

const ShareCardSheet = lazy(() => import('./ShareCardSheet.jsx'));

// Ancho de la vista previa de la tarjeta QR (la plantilla dibuja a
// 1080 px y se escala, como la vista previa de ShareCardSheet).
const QR_PREVIEW_W = 200;

export default function BizShareHub({
  biz,
  T,
  toast$: toastProp,
  onClose,
  isCatalog = false,
  menuItems: menuItemsProp = null,
  initialTab = 'redes',
}) {
  const { t } = useTranslation();
  const storeToast = useUIStore((s) => s.toast$);
  const toast$ = toastProp || storeToast;
  const googleRatings = useDataStore((s) => s.googleRatings);
  const cities = useDataStore((s) => s.cities);

  const [tab, setTab] = useState(initialTab);
  const [sheet, setSheet] = useState(null); // null | 'perfil' | 'menu'
  const [downloading, setDownloading] = useState(null); // null | 'perfil' | 'menu'
  const [qrError, setQrError] = useState('');

  // El menú del negocio (null = aún no se cargó, [] = no tiene
  // platillos con precio). Si el llamador ya los trae, se usan tal
  // cual desde el primer render, sin otra consulta (como
  // ShareCardSheet con menuItemsProp); si no, se cargan al montar.
  const [menuItems, setMenuItems] = useState(() =>
    Array.isArray(menuItemsProp) ? menuItemsProp : null,
  );
  useEffect(() => {
    let alive = true;
    if (Array.isArray(menuItemsProp)) {
      setMenuItems(menuItemsProp);
      return undefined;
    }
    if (!biz?.id) {
      setMenuItems(null);
      return undefined;
    }
    setMenuItems(null);
    loadMenuItems(biz.id).then((items) => {
      if (alive) setMenuItems(items);
    });
    return () => {
      alive = false;
    };
  }, [menuItemsProp, biz?.id]);

  const hasMenuItems = Array.isArray(menuItems) && menuItems.length > 0;
  const materials = compartirMaterials(hasMenuItems);
  const cityName = cities.find((c) => c.slug === biz?.city_slug)?.name || '';
  const disp = displayRating(biz, googleRatings);

  // Datos de las tarjetas QR diseñadas (el QR se genera en el cliente
  // y se cachea por URL: la vista previa y el PNG llevan el mismo).
  const qrPerfilData = useMemo(
    () =>
      buildQrCardData(biz, 'perfil', {
        disp,
        cityName,
        qrCta: t('compartir_escanea_perfil', 'Escanea para ver el perfil'),
      }),
    [biz, disp, cityName, t],
  );
  const qrMenuData = useMemo(
    () =>
      hasMenuItems
        ? buildQrCardData(biz, 'menu', { disp, cityName })
        : null,
    [biz, disp, cityName, hasMenuItems],
  );

  const menuLabel = isCatalog
    ? t('compartir_tarjeta_catalogo', 'Tarjeta del catálogo')
    : t('compartir_tarjeta_menu', 'Tarjeta del menú');
  const menuQrLabel = isCatalog
    ? t('compartir_qr_catalogo', 'QR del catálogo')
    : t('compartir_qr_menu', 'QR del menú');

  // Comparte el enlace del perfil o del menú con el menú del sistema;
  // si no se puede, se copia al portapapeles. Es el onShareLink de la
  // hoja (DetailView hace lo mismo con doShare).
  const shareLink = async (kind) => {
    const url =
      kind === 'menu' ? buildMenuShareUrl(biz) : buildBizProfileUrl(biz);
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      throw new Error('no-share');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try {
        await navigator.clipboard?.writeText(url);
        toast$(t('compartir_enlace_copiado', 'Enlace copiado'));
      } catch {
        toast$(url);
      }
    }
  };

  // Descarga la tarjeta QR diseñada como PNG (lo mismo que la vista
  // previa, dibujado en canvas; si el navegador puede compartir
  // archivos, abre el menú del sistema en vez de descargar).
  const downloadQrCard = async (kind) => {
    if (downloading) return;
    setQrError('');
    setDownloading(kind);
    try {
      const data = kind === 'menu' ? qrMenuData : qrPerfilData;
      if (!data) throw new Error('no-data');
      const blob = await exportShareCardPng(data, SHARE_CARD_FORMATS.post, 'qr');
      const how = await shareOrDownloadPng(blob, qrCardFileName(biz, kind));
      toast$(
        how === 'shared'
          ? t('compartir_imagen_lista', 'Imagen lista para compartir')
          : t('compartir_imagen_descargada', 'Imagen descargada'),
      );
    } catch (e) {
      if (e?.name === 'AbortError') {
        setDownloading(null);
        return;
      }
      setQrError(t('compartir_error_qr', 'Error al generar QR'));
      toast$(t('compartir_error_qr', 'Error al generar QR'));
    } finally {
      setDownloading(null);
    }
  };

  // El QR pelado de siempre (AccountView/StoreAdminPanel antes del
  // #240): PNG 1024×1024 de api.qrserver.com, sin diseño.
  const downloadBareQr = async (kind) => {
    const url = buildBareQrUrl(biz, kind);
    if (!url) return;
    try {
      const res = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(url)}`,
      );
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `QR_${kind === 'menu' ? (isCatalog ? 'Catalogo' : 'Menu') : 'Perfil'}_${String(biz?.name || '').replace(/\s+/g, '_')}.png`;
      a.click();
    } catch (e) {
      toast$(t('compartir_error_qr', 'Error al generar QR'));
    }
  };

  const tabLabel = {
    redes: t('compartir_redes', 'Redes'),
    imprimir: t('compartir_para_imprimir', 'Para imprimir'),
    qr: t('compartir_qr_suelto', 'QR suelto'),
  };

  const materialRow = (key, icon, title, subtitle, onOpen, ctaLabel) => (
    <button
      key={key}
      onClick={onOpen}
      className="press"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px',
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        color: T.text,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          background: T.white,
          padding: 10,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={24} color={T.text} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{subtitle}</div>
      </div>
      <span style={{ fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
        {ctaLabel || `${t('compartir_abrir', 'Abrir')} ›`}
      </span>
    </button>
  );

  const qrCardBlock = (kind, data, title) => {
    const previewH = QR_PREVIEW_W; // el formato Post es cuadrado
    const busy = downloading === kind;
    return (
      <div key={kind} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            width: QR_PREVIEW_W,
            height: previewH,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: SHARE_CARD_FORMATS.post.width,
              height: SHARE_CARD_FORMATS.post.height,
              transform: `scale(${QR_PREVIEW_W / SHARE_CARD_FORMATS.post.width})`,
              transformOrigin: 'top left',
            }}
          >
            <ShareCardTemplate data={data} format={SHARE_CARD_FORMATS.post} styleId="qr" />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{title}</div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
            {t('compartir_qr_desc', 'Con tu nombre y el QR, lista para imprimir')}
          </div>
        </div>
        <button
          onClick={() => downloadQrCard(kind)}
          disabled={busy}
          className="press"
          style={{
            padding: '12px 16px',
            background: T.text,
            color: T.white,
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            cursor: busy ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy
            ? t('compartir_generando', 'Generando…')
            : t('compartir_descargar', 'Descargar')}
        </button>
      </div>
    );
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 800,
            fontSize: 20,
            color: T.text,
          }}
        >
          <Icon name="share" size={22} /> {t('compartir_mi_negocio', 'Compartir mi negocio')}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={t('cerrar', 'Cerrar')}
            style={{
              position: 'absolute',
              right: 0,
              background: T.bg,
              color: T.text,
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <p style={{ fontSize: 14, color: T.sub, margin: '0 0 20px 0', lineHeight: 1.5, textAlign: 'center' }}>
        {t('compartir_desc', 'Comparte')} <strong>{biz?.name}</strong>
        {t('compartir_desc_2', ' con imágenes listas para redes o para imprimir.')}
      </p>

      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {COMPARTIR_TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="press"
            style={{
              flex: 1,
              whiteSpace: 'nowrap',
              padding: '10px 12px',
              background: tab === id ? T.text : 'transparent',
              color: tab === id ? T.white : T.sub,
              border: `1px solid ${tab === id ? T.text : T.border}`,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {tabLabel[id]}
          </button>
        ))}
      </div>

      {tab === 'redes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {materialRow(
            'tarjeta-perfil',
            'image',
            t('compartir_tarjeta_perfil', 'Tarjeta del perfil'),
            t('compartir_tarjeta_perfil_desc', 'Foto, nombre y calificación para WhatsApp y redes'),
            () => setSheet('perfil'),
          )}
          {hasMenuItems &&
            materialRow(
              'tarjeta-menu',
              'list',
              menuLabel,
              t('compartir_tarjeta_menu_desc', 'Para pedir y QR del menú'),
              () => setSheet('menu'),
            )}
        </div>
      )}

      {tab === 'imprimir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {qrPerfilData && qrCardBlock('perfil', qrPerfilData, t('compartir_qr_perfil', 'QR del perfil'))}
          {hasMenuItems && qrMenuData && qrCardBlock('menu', qrMenuData, menuQrLabel)}
          {qrError && (
            <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', margin: 0 }}>{qrError}</p>
          )}
        </div>
      )}

      {tab === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {materialRow(
            'qr-suelto-perfil',
            'user',
            t('perfil', 'Perfil'),
            t('pagina_principal', 'Página principal'),
            () => downloadBareQr('perfil'),
            t('compartir_descargar', 'Descargar'),
          )}
          {hasMenuItems &&
            materialRow(
              'qr-suelto-menu',
              'list',
              t('menu', 'Menú'),
              t('abre_tu_menu', 'Abre tu menú'),
              () => downloadBareQr('menu'),
              t('compartir_descargar', 'Descargar'),
            )}
        </div>
      )}

      {sheet === 'perfil' && (
        <Suspense fallback={null}>
          <ShareCardSheet biz={biz} onClose={() => setSheet(null)} onShareLink={() => shareLink('perfil')} />
        </Suspense>
      )}
      {sheet === 'menu' && (
        <Suspense fallback={null}>
          <ShareCardSheet
            biz={biz}
            menuOnly
            menuItems={menuItems}
            onClose={() => setSheet(null)}
            onShareLink={() => shareLink('menu')}
          />
        </Suspense>
      )}
    </div>
  );
}
