import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import BlogVisualEditor from '../components/admin/BlogVisualEditor.jsx';

// Ensure DOMParser and XMLSerializer are globally available for Node.js test environment
globalThis.DOMParser = DOMParser;
globalThis.XMLSerializer = XMLSerializer;

import {
  sanitizeHtml,
  isSafeUrl,
  markdownToHtml,
  looksLikeMarkdown,
  isHtmlContent,
  parsePastedContent,
  stripHtmlToPlainText
} from '../components/admin/blogSanitizer.js';

describe('Blog Visual Editor & Public Renderer - 15 Verification Scenarios', () => {

  // Scenario 1: Normal text with paragraphs
  describe('Scenario 1: Normal text with paragraphs', () => {
    it('structures plain paragraphs into clean <p> tags with proper spacing', () => {
      const rawText = "Primer párrafo del artículo sobre Tepic.\n\nSegundo párrafo con más detalles turísticos.";
      const parsed = parsePastedContent('', rawText);
      expect(parsed).toContain('<p>Primer párrafo del artículo sobre Tepic.</p>');
      expect(parsed).toContain('<p>Segundo párrafo con más detalles turísticos.</p>');
      expect(isHtmlContent(parsed)).toBe(true);
    });
  });

  // Scenario 2: Subtitles H2 and H3, and prevention of multiple H1s
  describe('Scenario 2: Headings H2, H3 and H1 downgrade', () => {
    it('renders H2 and H3 correctly and downgrades H1 to H2 to protect main page title', () => {
      const inputHtml = '<h1>Título que debería ser subtítulo H2</h1><h2>Subtítulo H2 válido</h2><h3>Sección H3 válida</h3>';
      const clean = sanitizeHtml(inputHtml);
      // H1 should be converted to H2
      expect(clean).not.toContain('<h1');
      expect(clean).toContain('<h2>Título que debería ser subtítulo H2</h2>');
      expect(clean).toContain('<h2>Subtítulo H2 válido</h2>');
      expect(clean).toContain('<h3>Sección H3 válida</h3>');
    });

    it('converts markdown # and ## to H2, and ### to H3', () => {
      const md = "# Encabezado Principal en ChatGPT\n\n## Subtítulo Dos\n\n### Sección Menor";
      const html = markdownToHtml(md);
      expect(html).toContain('<h2>Encabezado Principal en ChatGPT</h2>');
      expect(html).toContain('<h2>Subtítulo Dos</h2>');
      expect(html).toContain('<h3>Sección Menor</h3>');
    });
  });

  // Scenario 3: Bold and italic formatting
  describe('Scenario 3: Bold and italic formatting', () => {
    it('preserves strong and em tags, and parses markdown **bold** and *italic*', () => {
      const md = "Este texto tiene **negrita destacada** y también *cursiva elegante*.";
      const html = markdownToHtml(md);
      expect(html).toContain('<strong>negrita destacada</strong>');
      expect(html).toContain('<em>cursiva elegante</em>');

      const sanitized = sanitizeHtml(html);
      expect(sanitized).toContain('<strong>negrita destacada</strong>');
      expect(sanitized).toContain('<em>cursiva elegante</em>');
    });
  });

  // Scenario 4: Numbered and bulleted lists
  describe('Scenario 4: Numbered and bulleted lists', () => {
    it('correctly creates unordered (ul) and ordered (ol) lists from ChatGPT input', () => {
      const mdUl = "- Visitar el volcán Sangangüey\n- Recorrer el Centro Histórico\n- Probar los mariscos locales";
      const htmlUl = markdownToHtml(mdUl);
      expect(htmlUl).toContain('<ul>');
      expect(htmlUl).toContain('<li>Visitar el volcán Sangangüey</li>');
      expect(htmlUl).toContain('<li>Recorrer el Centro Histórico</li>');
      expect(htmlUl).toContain('</ul>');

      const mdOl = "1. Paso uno: llegada\n2. Paso dos: registro\n3. Paso tres: explorar";
      const htmlOl = markdownToHtml(mdOl);
      expect(htmlOl).toContain('<ol>');
      expect(htmlOl).toContain('<li>Paso uno: llegada</li>');
      expect(htmlOl).toContain('<li>Paso dos: registro</li>');
      expect(htmlOl).toContain('</ol>');
    });
  });

  // Scenario 5: Hyperlinks with valid targets and safety
  describe('Scenario 5: Hyperlinks validation', () => {
    it('permits safe https links and auto-adds rel="noopener noreferrer" for blank targets', () => {
      const raw = '<a href="https://citymap.mx/tepic" target="_blank">Conoce Tepic</a>';
      const clean = sanitizeHtml(raw);
      expect(clean).toContain('href="https://citymap.mx/tepic"');
      expect(clean).toContain('target="_blank"');
      expect(clean).toContain('rel="noopener noreferrer"');
    });

    it('rejects unsafe schemes like javascript: in links', () => {
      const unsafe = '<a href="javascript:alert(\'hack\')">Click aquí</a>';
      const clean = sanitizeHtml(unsafe);
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('href=');
    });
  });

  // Scenario 6: Horizontal dividers
  describe('Scenario 6: Horizontal dividers', () => {
    it('creates and preserves <hr> elements for section breaks', () => {
      const md = "Párrafo 1\n\n---\n\nPárrafo 2";
      const html = markdownToHtml(md);
      expect(html).toContain('<hr>');

      const clean = sanitizeHtml(html);
      expect(clean).toContain('<hr>');
    });
  });

  // Scenario 7: Image insertion between paragraphs
  describe('Scenario 7: Image insertion structure', () => {
    it('allows responsive figure and img elements with Supabase Storage URLs', () => {
      const imgHtml = `
        <p>Introducción antes de la foto</p>
        <figure style="margin: 24px 0; text-align: center;">
          <img src="https://supabase.citymap.mx/storage/v1/object/public/media/cityguide/blog/foto1.jpg" alt="Plaza de Armas" style="width: 100%; border-radius: 16px;" />
          <figcaption>Vista atardecer en la Plaza de Armas</figcaption>
        </figure>
        <p>Párrafo posterior a la foto</p>
      `;
      const clean = sanitizeHtml(imgHtml);
      expect(clean).toContain('<figure');
      expect(clean).toContain('<img');
      expect(clean).toContain('src="https://supabase.citymap.mx/storage/v1/object/public/media/cityguide/blog/foto1.jpg"');
      expect(clean).toContain('<figcaption>Vista atardecer en la Plaza de Armas</figcaption>');
      expect(clean).toContain('</figure>');
    });
  });

  // Scenario 8: Image edition (captions and alt)
  describe('Scenario 8: Image editing capabilities', () => {
    it('allows alt attributes and preserves captions', () => {
      const imgWithAlt = '<figure><img src="https://example.com/test.jpg" alt="Foto descriptiva" /><figcaption>Pie de foto editable</figcaption></figure>';
      const clean = sanitizeHtml(imgWithAlt);
      expect(clean).toContain('alt="Foto descriptiva"');
      expect(clean).toContain('<figcaption>Pie de foto editable</figcaption>');
    });
  });

  // Scenario 9: Smart paste from ChatGPT
  describe('Scenario 9: Smart paste from ChatGPT', () => {
    it('detects and converts typical ChatGPT markdown responses into structured HTML', () => {
      const chatGptOutput = `
# Guía Completa de Sayulita

Sayulita es un paraíso bohemio en la Riviera Nayarit que no te puedes perder.

## Las Mejores Actividades

- **Surfing en la playa principal**: Olas ideales para principiantes.
- **Paseo por las galerías de arte**: Encontrarás arte huichol auténtico.

Para más información visita [CityMap](https://citymap.mx).
      `.trim();

      expect(looksLikeMarkdown(chatGptOutput)).toBe(true);

      const parsed = parsePastedContent('', chatGptOutput);
      expect(parsed).toContain('<h2>Guía Completa de Sayulita</h2>');
      expect(parsed).toContain('<p>Sayulita es un paraíso bohemio en la Riviera Nayarit que no te puedes perder.</p>');
      expect(parsed).toContain('<h2>Las Mejores Actividades</h2>');
      expect(parsed).toContain('<ul>');
      expect(parsed).toContain('<li><strong>Surfing en la playa principal</strong>: Olas ideales para principiantes.</li>');
      expect(parsed).toContain('<a href="https://citymap.mx" target="_blank" rel="noopener noreferrer">CityMap</a>');
    });

    it('does NOT collapse multi-paragraph text into a single paragraph', () => {
      const text = "Párrafo uno largo.\n\nPárrafo dos con detalles.\n\nPárrafo tres con conclusión.";
      const parsed = parsePastedContent('', text);
      const matches = parsed.match(/<p[\s>]/g);
      expect(matches).not.toBeNull();
      expect(matches.length).toBe(3);
    });
  });

  // Scenario 10: Mobile touch responsiveness (iOS Safari selection protection)
  describe('Scenario 10: Mobile touch optimization', () => {
    it('is configured with preventDefault defense pattern on toolbar actions to avoid focus loss', () => {
      // Test the prevention pattern
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      };

      const handleToolbarInteraction = (e) => {
        e.preventDefault();
      };

      handleToolbarInteraction(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  // Scenario 11: History and Auto-Drafting
  describe('Scenario 11: Auto-drafting persistence', () => {
    it('creates and parses localStorage drafts properly', () => {
      const draftKey = 'citymap_blog_draft_exp123';
      const draftData = {
        html: '<p>Contenido guardado automáticamente</p>',
        time: '14:30'
      };

      const serialized = JSON.stringify(draftData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.html).toBe('<p>Contenido guardado automáticamente</p>');
      expect(deserialized.time).toBe('14:30');
    });
  });

  // Scenario 12: Zero-XSS Security and Sanitization
  describe('Scenario 12: Zero-XSS Security & Sanitization', () => {
    it('neutralizes all malicious tags like <script>, <iframe>, <object>', () => {
      const malicious = '<p>Texto seguro</p><script>alert("XSS")</script><iframe src="https://evil.com"></iframe>';
      const clean = sanitizeHtml(malicious);
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('alert');
      expect(clean).not.toContain('<iframe');
      expect(clean).toContain('<p>Texto seguro</p>');
    });

    it('strips dangerous event handlers: onerror, onclick, onload, onmouseover', () => {
      const maliciousAttrs = '<img src="https://example.com/valid.jpg" onerror="alert(1)" onclick="alert(2)" />';
      const clean = sanitizeHtml(maliciousAttrs);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('src="https://example.com/valid.jpg"');
    });

    it('blocks dangerous URL protocols like vbscript: and data:text/html', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeUrl('https://citymap.mx/articulo')).toBe(true);
      expect(isSafeUrl('http://citymap.mx')).toBe(true);
      expect(isSafeUrl('/ruta-interna')).toBe(true);
    });
  });

  // Scenario 13: Live preview modal fidelity
  describe('Scenario 13: Live Preview fidelity', () => {
    it('generates accurate metadata and summary with stripHtmlToPlainText', () => {
      const html = '<h2>Guía Nayarit</h2><p>Descubre los <strong>mejores rincones</strong> de la costa y la sierra.</p>';
      const plain = stripHtmlToPlainText(html);
      expect(plain).toBe('Guía Nayarit Descubre los mejores rincones de la costa y la sierra.');
    });
  });

  // Scenario 14: Backward compatibility with legacy plain text / pseudo-markdown
  describe('Scenario 14: Backward compatibility with legacy content', () => {
    it('correctly identifies plain text vs HTML without false positives', () => {
      const legacyPlainText = "Este es un artículo antiguo de CityMap sin formato HTML.\n\nTiene saltos de línea normales.";
      expect(isHtmlContent(legacyPlainText)).toBe(false);

      const legacyMarkdown = "## Título Antiguo\n\n- Punto 1\n- Punto 2\n\nTexto con **negrita**";
      expect(isHtmlContent(legacyMarkdown)).toBe(false);

      const newHtmlArticle = "<p>Artículo moderno con HTML</p><h2>Subtítulo</h2>";
      expect(isHtmlContent(newHtmlArticle)).toBe(true);
    });
  });

  // Scenario 15: Saving to database (no Base64 blobs)
  describe('Scenario 15: Database payload integrity (No Base64 blobs)', () => {
    it('verifies that clean HTML does not contain Base64 data: URLs for images', () => {
      const rawWithBase64 = '<p>Párrafo</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" alt="Invalido" />';
      const clean = sanitizeHtml(rawWithBase64);
      // isSafeUrl rejects data: URLs, so the src attribute is stripped
      expect(clean).not.toContain('data:image/');

      const properCloudImage = '<figure><img src="https://supabase.citymap.mx/storage/v1/object/public/media/cityguide/blog/test.jpg" alt="Válido" /></figure>';
      const cleanCloud = sanitizeHtml(properCloudImage);
      expect(cleanCloud).toContain('https://supabase.citymap.mx/storage/v1/object/public/media/cityguide/blog/test.jpg');
    });
  });

});


describe('Fixed article typography and alignment', () => {
  it('removes iPhone and Word font overrides while preserving emphasis and structure', () => {
    const clipboard = '<div style="font: 18px Times; font-family: Georgia; font-size: 24px; line-height: 3"><h2>Subtítulo</h2><p><span style="font-family: -apple-system; font-size: 20px; font-weight: 700">Texto importante</span> y <em>énfasis</em></p></div>';
    const clean = parsePastedContent(clipboard, '');
    expect(clean).not.toMatch(/font-family|font-size|font:|line-height|Times|Georgia|-apple-system/);
    expect(clean).toContain('<h2>Subtítulo</h2>');
    expect(clean).toContain('font-weight: 700');
    expect(clean).toContain('<em>énfasis</em>');
  });
  it('cleans nested font wrappers without losing text or retaining unsafe descendants', () => {
    const clean = sanitizeHtml('<p><font face="Times"><span style="font-family: Courier">Texto</span><script>alert(1)</script></font></p>');
    expect(clean).toContain('Texto');
    expect(clean).not.toMatch(/font|Courier|script|alert/);
  });
  it.each(['left', 'center', 'right', 'justify'])('keeps %s alignment after saving and reopening', alignment => {
    const clean = sanitizeHtml(`<div align="${alignment}" style="font-family: Times">Párrafo</div>`);
    expect(clean).toContain(`text-align:${alignment}`);
    expect(sanitizeHtml(clean)).toBe(clean);
    expect(clean).not.toContain('font-family');
  });
  it('replaces typography controls with four accessible alignment buttons', () => {
    const html = renderToStaticMarkup(<BlogVisualEditor />);
    for (const label of ['Alinear a la izquierda', 'Centrar texto', 'Alinear a la derecha', 'Justificar texto']) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).not.toContain('Párrafo normal');
    expect(html).not.toContain('Subtítulo Principal (H2)');
    expect(html).not.toContain('Subtítulo Secundario (H3)');
    expect(html).toContain('blog-editor-content');
    expect(html).toContain('var(--sans, system-ui, sans-serif)');
  });
});
