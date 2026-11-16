// Letras grandes (en Android el tamaño de fuente ampliado escala el texto
// de la app): el inicio global no debe solapar el título con el enlace
// («ExploraVer todas las ciud…») ni cortar las píldoras de viaje
// («Autos / Hoteles / Vu…»). El saludo y el subtítulo SÍ crecen y se
// parten en varias líneas: eso es lo que pide el ajuste, no se toca.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TravelAffiliateRow from '../components/home/TravelAffiliateRow.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const T = { border: '#e5e7eb', text: '#111111' };

describe('inicio global con letras grandes', () => {
  it('los 4 encabezados con enlace se envuelven en vez de solaparse', () => {
    const src = read('../views/GlobalHomeView.jsx');
    // Esqueleto + Explora por ciudad + Tours por ciudad + Guías y artículos.
    expect(src.match(/justifyContent: 'space-between'/g)).toHaveLength(4);
    expect(src.match(/flexWrap: 'wrap', rowGap: 2, columnGap: 12/g)).toHaveLength(4);
    // Los enlaces ya no son nowrap: si no caben en la fila, bajan de línea
    // o se parten en dos, en vez de montarse sobre el título. (La píldora
    // de ciudad de Tours sí sigue siendo nowrap: vive en una fila que
    // desplaza y con ancho fijo, así que no puede solaparse con nada.)
    expect(src).not.toContain("color: T.sub, whiteSpace: 'nowrap'");
    expect(src).not.toContain("color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'");
  });

  it('la fila de viaje desplaza en horizontal en vez de cortar píldoras', () => {
    const html = renderToStaticMarkup(<TravelAffiliateRow T={T} dark={false} />);
    expect(html).toContain('overflow-x:auto');
    expect(html).toContain('scrollbar-width:none');
    // Las 4 píldoras crecen para llenar la fila pero nunca se encogen
    // por debajo de su contenido: si no caben, la fila desplaza.
    expect(html.match(/flex:1 0 auto/g)).toHaveLength(4);
    for (const label of ['Autos', 'Hoteles', 'Vuelos', 'Tours']) {
      expect(html).toContain(label);
    }
  });
});
