import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  WHEEL_FACE_W,
  WHEEL_FACE_W_MOBILE,
  WHEEL_PERSPECTIVE,
  WHEEL_PROJECTED_W_MOBILE_FEW,
  wheelDrumHalfSpan,
  wheelProjectedFace,
} from '../lib/wheelMotion.js';
import { SRCSET_WHEEL_FRONT } from '../lib/utils.js';
import { WHEEL_IMG_W } from '../lib/wheelPreload.js';

const jsx = fs.readFileSync(new URL('../components/home/EventWheel3D.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../components/home/EventWheel3D.css', import.meta.url), 'utf8');

// Opción B (Jonathan, 26 Nov 2026): más efecto 3D para que el evento
// central se vea más grande. La perspectiva pasa de 1000 px a 650 px,
// SIN cambiar el tamaño nominal de las tarjetas (162 px escritorio,
// 140 px teléfono): el centro crece por la magnificación y las laterales
// se ven más chicas y más de lado, como un abanico. Vale para el inicio
// global y para cada ciudad, porque es el mismo componente.
describe('rueda 3D opción B: perspectiva de 650 px', () => {
  it('la perspectiva es 650 px, en el código y en el viewport', () => {
    expect(WHEEL_PERSPECTIVE).toBe(650);
    // El viewport usa la constante, no un literal suelto: que no se
    // vuelvan a desincronizar (antes el JSX decía 1000 px a mano).
    expect(jsx).toContain('perspective: `${WHEEL_PERSPECTIVE}px`');
    expect(jsx).not.toContain("perspective: '1000px'");
    expect(jsx).not.toContain('perspective: "1000px"');
  });

  it('las tarjetas siguen midiendo lo mismo (nominal sin tocar)', () => {
    expect(WHEEL_FACE_W).toBe(162);
    expect(WHEEL_FACE_W_MOBILE).toBe(140);
  });

  it('el centro se ve más grande: ~263x344 en escritorio, ~209x275 en teléfono', () => {
    expect(wheelProjectedFace(162, 212, 10)).toEqual({ w: 263, h: 344 });
    expect(wheelProjectedFace(140, 184, 10)).toEqual({ w: 209, h: 275 });
    // Antes de la opción B era 216x282 y 178x234: el centro creció
    // ~22% sin tocar el nominal.
    expect(263).toBeGreaterThan(216);
    expect(209).toBeGreaterThan(178);
  });

  it('la escena crece para que la cara del frente quepa sin tapar el título', () => {
    // El alto del viewport es el máximo entre la base del CSS y la cara
    // proyectada + 16 px, en escritorio y en teléfono.
    expect(jsx).toContain('Math.max(');
    expect(jsx).toContain('isMobile ? 262 : 306');
    expect(jsx).toContain('wheelProjectedFace(drum.faceW, drum.faceH, n).h + 16');
    // Escritorio con 10 eventos: 344 + 16 = 360 px (la escena del CSS
    // es 306 px); teléfono: 275 + 16 = 291 px (el CSS es 262 px).
    expect(wheelProjectedFace(162, 212, 10).h + 16).toBe(360);
    expect(wheelProjectedFace(140, 184, 10).h + 16).toBe(291);
    expect(css).toContain('height:306px');
  });

  it('en teléfono con pocos eventos la rueda sigue llegando a sangre', () => {
    // Con la perspectiva de 650 px el tambor se achicó y la referencia
    // ancha tuvo que subir de 215 px a 230 px para recuperar el
    // «a sangre»: con 7 eventos el medio ancho era 189 px, por debajo
    // de la mitad de la pantalla (195 px).
    expect(WHEEL_PROJECTED_W_MOBILE_FEW).toBe(230);
    for (const n of [7, 8, 9]) {
      expect(wheelDrumHalfSpan(140, 184, n, undefined, WHEEL_PROJECTED_W_MOBILE_FEW))
        .toBeGreaterThanOrEqual(195);
    }
  });

  it('la imagen nítida del frente vuelve a 800 px (la cara creció)', () => {
    // A 263 px CSS y 3x en teléfono son ~790 px de dispositivo: a 600 px
    // el póster se vería blando. El srcset del frente incluye el 800.
    expect(WHEEL_IMG_W).toBe(800);
    expect(SRCSET_WHEEL_FRONT).toContain(800);
  });
});
