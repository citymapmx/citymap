/**
 * blogSanitizer.js
 * Sanitizador y parser seguro para el contenido del blog en CityMap.mx.
 * Whitelist estricta, libre de dependencias externas pesadas, compatible con React 19 y navegadores móviles.
 */

const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'br', 'hr', 'blockquote',
  'a', 'img', 'figure', 'figcaption', 'span', 'div'
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'title', 'style']),
  img: new Set(['src', 'alt', 'title', 'loading', 'decoding', 'style', 'width', 'height']),
  figure: new Set(['style', 'class']),
  figcaption: new Set(['style', 'class']),
  p: new Set(['style', 'class']),
  h2: new Set(['style', 'class']),
  h3: new Set(['style', 'class']),
  span: new Set(['style', 'class']),
  div: new Set(['style', 'class']),
  blockquote: new Set(['style', 'class']),
  ul: new Set(['style', 'class']),
  ol: new Set(['style', 'class']),
  li: new Set(['style', 'class']),
  hr: new Set(['style'])
};

/**
 * Valida que una URL sea segura (HTTP, HTTPS, mailto, tel o relativa).
 * Bloquea javascript:, data: (excepto si fuera estrictamente seguro, pero prohibimos scripts), vbscript:.
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('data:text/html') || trimmed.startsWith('data:application/')) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

const REMOVE_COMPLETELY_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'applet'
]);

const ELEMENT_NODE = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
const TEXT_NODE = typeof Node !== 'undefined' ? Node.TEXT_NODE : 3;

/**
 * Sanitiza un string HTML permitiendo únicamente etiquetas y atributos seguros.
 */
export function sanitizeHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  if (typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  const parser = new DOMParser();
  const wrapped = rawHtml.includes('<body') ? rawHtml : `<body>${rawHtml}</body>`;
  const doc = parser.parseFromString(wrapped, 'text/html');
  const body = doc.body || doc.getElementsByTagName?.('body')?.[0] || doc.documentElement;
  if (!body) return '';

  const removeNode = (target) => {
    if (typeof target.remove === 'function') {
      target.remove();
    } else if (target.parentNode) {
      target.parentNode.removeChild(target);
    }
  };

  const cleanNode = (node) => {
    // Si es nodo de texto, está limpio por definición en el DOM
    if (node.nodeType === TEXT_NODE) return;

    // Si no es un elemento, remover
    if (node.nodeType !== ELEMENT_NODE) {
      removeNode(node);
      return;
    }

    const tagName = (node.tagName || node.nodeName || '').toLowerCase();

    // Eliminar etiquetas maliciosas por completo (incluyendo scripts y su contenido)
    if (REMOVE_COMPLETELY_TAGS.has(tagName)) {
      removeNode(node);
      return;
    }

    // Si es h1, convertir a h2 según los requerimientos
    if (tagName === 'h1') {
      const h2 = doc.createElement('h2');
      while (node.firstChild) h2.appendChild(node.firstChild);
      if (node.parentNode) {
        node.parentNode.replaceChild(h2, node);
      }
      cleanNode(h2);
      return;
    }

    // Eliminar etiquetas no permitidas desenrollando sus hijos
    if (!ALLOWED_TAGS.has(tagName)) {
      if (node.parentNode) {
        while (node.firstChild) {
          node.parentNode.insertBefore(node.firstChild, node);
        }
      }
      removeNode(node);
      return;
    }

    // Filtrar atributos
    const allowedForTag = ALLOWED_ATTRS[tagName] || new Set();
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();

      // Bloquear atributos de eventos (onclick, onerror, onload, etc.)
      if (attrName.startsWith('on')) {
        node.removeAttribute(attr.name);
        continue;
      }

      // Validar si el atributo está permitido
      if (!allowedForTag.has(attrName)) {
        node.removeAttribute(attr.name);
        continue;
      }

      // Validar URLs en href y src
      if (attrName === 'href' || attrName === 'src') {
        if (!isSafeUrl(attr.value)) {
          node.removeAttribute(attr.name);
        }
      }

      // Validar estilos en línea (remover javascript: en url())
      if (attrName === 'style') {
        const styleVal = attr.value.toLowerCase();
        if (styleVal.includes('javascript:') || styleVal.includes('expression(') || styleVal.includes('behavior:')) {
          node.removeAttribute(attr.name);
        }
      }
    }

    // Si es enlace, forzar rel="noopener noreferrer" si tiene target="_blank"
    if (tagName === 'a' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }

    // Limpiar recursivamente los hijos
    const children = Array.from(node.childNodes);
    for (const child of children) {
      cleanNode(child);
    }
  };

  Array.from(body.childNodes).forEach(cleanNode);
  if (body.innerHTML !== undefined) {
    return body.innerHTML;
  }
  if (typeof XMLSerializer !== 'undefined') {
    const serializer = new XMLSerializer();
    const xml = Array.from(body.childNodes).map(c => serializer.serializeToString(c)).join('');
    return xml
      .replace(/\s*xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '')
      .replace(/<hr\s*\/>/g, '<hr>')
      .replace(/<br\s*\/>/g, '<br>');
  }
  return '';
}

/**
 * Convierte texto Markdown a HTML limpio.
 * Útil para cuando el usuario pega artículos en Markdown desde ChatGPT.
 */
export function markdownToHtml(mdText) {
  if (!mdText || typeof mdText !== 'string') return '';

  const normalized = mdText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const htmlChunks = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) { htmlChunks.push('</ul>'); inUl = false; }
    if (inOl) { htmlChunks.push('</ol>'); inOl = false; }
  };

  const processInline = (text) => {
    let out = text;
    // Negritas: **texto** o __texto__
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Cursivas: *texto* o _texto_
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    out = out.replace(/_(.*?)_/g, '<em>$1</em>');
    // Enlaces: [texto](url)
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, (match, txt, url) => {
      if (isSafeUrl(url)) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
      }
      return txt;
    });
    return out;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      closeLists();
      continue;
    }

    // H3: ### Título
    if (trimmed.startsWith('### ')) {
      closeLists();
      htmlChunks.push(`<h3>${processInline(trimmed.slice(4))}</h3>`);
      continue;
    }

    // H2: ## Título o # Título (convertido a H2)
    if (trimmed.startsWith('## ')) {
      closeLists();
      htmlChunks.push(`<h2>${processInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      closeLists();
      htmlChunks.push(`<h2>${processInline(trimmed.slice(2))}</h2>`);
      continue;
    }

    // Separador horizontal: --- o ***
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      closeLists();
      htmlChunks.push('<hr>');
      continue;
    }

    // Lista desordenada: - item o * item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inOl) { htmlChunks.push('</ol>'); inOl = false; }
      if (!inUl) { htmlChunks.push('<ul>'); inUl = true; }
      htmlChunks.push(`<li>${processInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Lista ordenada: 1. item, 2. item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (inUl) { htmlChunks.push('</ul>'); inUl = false; }
      if (!inOl) { htmlChunks.push('<ol>'); inOl = true; }
      htmlChunks.push(`<li>${processInline(olMatch[2])}</li>`);
      continue;
    }

    // Párrafo normal
    closeLists();
    htmlChunks.push(`<p>${processInline(trimmed)}</p>`);
  }

  closeLists();
  return htmlChunks.join('');
}

/**
 * Detecta inteligentemente si un texto pegado o existente contiene Markdown.
 */
export function looksLikeMarkdown(text) {
  if (!text || typeof text !== 'string') return false;
  return (
    /(^|\n)#{1,3}\s+\S/.test(text) || // Encabezados #, ##, ###
    /(^|\n)([-*]|\d+\.)\s+\S/.test(text) || // Listas - o 1.
    /\[.*?\]\(https?:\/\/.*?\)/.test(text) || // Enlaces [texto](url)
    /\*\*.*?\*\*/.test(text) // Negritas
  );
}

/**
 * Detecta si el texto es HTML.
 */
export function isHtmlContent(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return /<(p|h2|h3|h1|ul|ol|li|div|figure|img|blockquote|hr)[^>]*>/i.test(trimmed);
}

/**
 * Convierte cualquier texto plano o pegado a HTML estructurado.
 */
export function parsePastedContent(htmlFromClipboard, textFromClipboard) {
  // 1. Si el portapapeles incluye HTML con contenido estructurado
  if (htmlFromClipboard && isHtmlContent(htmlFromClipboard)) {
    return sanitizeHtml(htmlFromClipboard);
  }

  // 2. Si el texto plano parece Markdown (muy habitual al copiar desde ChatGPT)
  if (textFromClipboard && looksLikeMarkdown(textFromClipboard)) {
    const converted = markdownToHtml(textFromClipboard);
    return sanitizeHtml(converted);
  }

  // 3. Texto plano convencional: separar por dobles saltos en párrafos
  if (textFromClipboard) {
    const normalized = textFromClipboard.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const paras = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const html = paras.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    return sanitizeHtml(html);
  }

  return '';
}

/**
 * Extrae texto plano para resúmenes o metadatos, eliminando todas las etiquetas HTML.
 */
export function stripHtmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  const spaced = html
    .replace(/<\/(p|h[1-6]|li|div|figure|blockquote)>/gi, (m, tag) => ` </${tag}>`)
    .replace(/<br\s*\/?>/gi, ' ');
  if (typeof DOMParser === 'undefined') {
    return spaced.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const parser = new DOMParser();
  const wrapped = spaced.includes('<body') ? spaced : `<body>${spaced}</body>`;
  const doc = parser.parseFromString(wrapped, 'text/html');
  const body = doc.body || doc.getElementsByTagName?.('body')?.[0] || doc.documentElement;
  return ((body && body.textContent) || '').replace(/\s+/g, ' ').trim();
}
