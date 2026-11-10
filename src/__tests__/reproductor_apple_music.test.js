import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const modalSrc = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
const logoSrc = fs.readFileSync(new URL('../../public/apple-music-logo.svg', import.meta.url), 'utf8');

// PR #146: la tarjeta «Música del artista» lleva el color oficial de
// Apple Music (#FA2D48) y su logotipo oficial, sin tocar la lógica del
// reproductor (adelantos de 30 s de iTunes, un solo audio a la vez).

describe('reproductor «Música del artista» con marca Apple Music', () => {
  it('define el rojo oficial de Apple Music', () => {
    expect(modalSrc).toContain("const APPLE_MUSIC_RED = '#FA2D48'");
  });

  it('el encabezado lleva el distintivo con el logo oficial sobre el rojo', () => {
    expect(modalSrc).toContain('src="/apple-music-logo.svg"');
    expect(modalSrc).toContain('alt="Apple Music"');
    // El distintivo es un rectángulo rojo con el logo blanco dentro.
    expect(modalSrc).toMatch(/background: APPLE_MUSIC_RED[\s\S]{0,200}\/apple-music-logo\.svg/);
  });

  it('los botones de reproducir son rojos con el icono en blanco (claro y oscuro)', () => {
    expect(modalSrc).toMatch(/background: APPLE_MUSIC_RED, color: '#FFFFFF'[\s\S]{0,200}\{playing \? '❚❚' : '▶'\}/);
  });

  it('el enlace «Ver más en Apple Music» es rojo y sigue apuntando a Apple Music', () => {
    expect(modalSrc).toContain('https://music.apple.com/mx/search?term=');
    expect(modalSrc).toMatch(/color: APPLE_MUSIC_RED[\s\S]{0,300}eventos_ver_mas_apple_music/);
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
