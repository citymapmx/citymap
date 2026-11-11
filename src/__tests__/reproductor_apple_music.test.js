import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const modalSrc = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
const logoSrc = fs.readFileSync(new URL('../../public/apple-music-logo.svg', import.meta.url), 'utf8');

// PR #146: la tarjeta «Música del artista» lleva el color oficial de
// Apple Music (#FA2D48) y su logotipo oficial, sin tocar la lógica del
// reproductor (adelantos de 30 s de iTunes, un solo audio a la vez).
// PR #195: colores invertidos — la tarjeta es un bloque rosa (#FA2D48)
// con botones y distintivo en negro y textos en blanco, igual en modo
// claro y en modo oscuro, para que resalte y no se vea igual a todo lo
// demás. La lógica no cambia.

// La tarjeta completa, del comentario MÚSICA al de ASOCIADO CON: ahí
// dentro no debe quedar ningún color del tema (T.white/T.text/T.sub/
// T.border), porque el rosa es fijo en los dos modos.
const musicSection = modalSrc.slice(
  modalSrc.indexOf('MÚSICA DEL ARTISTA'),
  modalSrc.indexOf('ASOCIADO CON')
);

describe('reproductor «Música del artista» con marca Apple Music', () => {
  it('define el rojo oficial de Apple Music y el negro de los botones', () => {
    expect(modalSrc).toContain("const APPLE_MUSIC_RED = '#FA2D48'");
    expect(modalSrc).toContain("const APPLE_MUSIC_BLACK = '#000000'");
  });

  it('la tarjeta tiene fondo rosa (el rojo oficial) en modo claro y oscuro', () => {
    expect(musicSection).toContain('background: APPLE_MUSIC_RED');
    expect(musicSection).not.toContain('T.white');
    expect(musicSection).not.toContain('T.text');
    expect(musicSection).not.toContain('T.sub');
    expect(musicSection).not.toContain('T.border');
  });

  it('los textos de la tarjeta son blancos sobre el rosa', () => {
    expect(musicSection).toContain("color: '#FFFFFF'");
    // Textos secundarios en blanco al 85% (descripción y artista).
    expect(musicSection).toContain("color: 'rgba(255,255,255,0.85)'");
  });

  it('el encabezado lleva el distintivo con el logo oficial sobre negro', () => {
    expect(modalSrc).toContain('src="/apple-music-logo.svg"');
    expect(modalSrc).toContain('alt="Apple Music"');
    // El distintivo es un rectángulo negro con el logo blanco dentro.
    expect(modalSrc).toMatch(/background: APPLE_MUSIC_BLACK[\s\S]{0,200}\/apple-music-logo\.svg/);
  });

  it('los botones de reproducir son negros con el icono en blanco (claro y oscuro)', () => {
    expect(modalSrc).toMatch(/background: APPLE_MUSIC_BLACK, color: '#FFFFFF'[\s\S]{0,200}\{playing \? '❚❚' : '▶'\}/);
  });

  it('el enlace «Ver más en Apple Music» es blanco y sigue apuntando a Apple Music', () => {
    expect(modalSrc).toContain('https://music.apple.com/mx/search?term=');
    expect(modalSrc).toMatch(/fontWeight: 700, color: '#FFFFFF'[\s\S]{0,300}eventos_ver_mas_apple_music/);
  });

  it('la lógica de reproducir/pausar sigue intacta (un solo audio, pausa al repetir)', () => {
    expect(modalSrc).toContain('const toggleMusicTrack = (track) => {');
    expect(modalSrc).toContain('if (playingTrackId === track.id) {');
    expect(modalSrc).toContain('musicAudioRef.current?.pause();');
    expect(modalSrc).toContain('const audio = new Audio(track.preview);');
    expect(modalSrc).toContain('audio.onended = () => setPlayingTrackId(null);');
    expect(modalSrc).toContain('fetch(buildItunesSearchUrl(musicQuery, 5))');
  });
});

describe('asset del logotipo de Apple Music', () => {
  it('existe public/apple-music-logo.svg y es el logo oficial en blanco', () => {
    // Fuente: Wikimedia Commons, File:Apple_Music_logo.svg (logo oficial
    // de Apple Music, 522x126); solo cambió el relleno a blanco.
    expect(logoSrc).toContain('<svg');
    expect(logoSrc).toContain('width="522"');
    expect(logoSrc).toContain('fill:#FFFFFF');
    // La manzana (el glifo empieza en M82.3,66.8) y las letras de «Music».
    expect(logoSrc).toContain('M82.3,66.8');
    // El relleno es blanco (el original gris quedó solo mencionado en el
    // comentario de la fuente, no en la regla de estilo).
    expect(logoSrc).toMatch(/\.c0\{fill:#FFFFFF;?\}/);
  });
});
