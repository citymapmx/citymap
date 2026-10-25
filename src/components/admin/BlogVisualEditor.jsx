import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../ui/Icon.jsx';
import { cloudUpload } from '../../lib/supabase.js';
import { sanitizeHtml, parsePastedContent, isHtmlContent, markdownToHtml, looksLikeMarkdown } from './blogSanitizer.js';

export default function BlogVisualEditor({
  value = "",
  onChange,
  expTitle = "",
  authorName = "",
  coverUrl = "",
  expId = "new",
  onToast = () => {}
}) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode) &&
        editorRef.current?.contains(selection.focusNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  // States
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [selectedImgNode, setSelectedImgNode] = useState(null);
  const [imageModal, setImageModal] = useState(null); // { imgNode, alt, caption }
  const [linkModal, setLinkModal] = useState(null); // { url, text, existingRange }
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);
  const [lastSavedDraftTime, setLastSavedDraftTime] = useState(null);

  const draftKey = `citymap_blog_draft_${expId}`;
  const lastEmittedValue = useRef(null);
  const isInitialized = useRef(false);

  // Sync Content Population (convert legacy markdown to HTML if needed)
  useEffect(() => {
    if (!editorRef.current) return;
    const needsInit = !isInitialized.current;
    const isExternalChange = value !== lastEmittedValue.current && value !== editorRef.current.innerHTML;

    if (needsInit || isExternalChange) {
      isInitialized.current = true;
      lastEmittedValue.current = value;
      let initialHtml = value || "";
      if (initialHtml && !isHtmlContent(initialHtml)) {
        if (looksLikeMarkdown(initialHtml)) {
          initialHtml = markdownToHtml(initialHtml);
        } else {
          const paras = initialHtml.split(/\n\s*\n/).filter(Boolean);
          initialHtml = paras.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
      }

      const clean = sanitizeHtml(initialHtml);
      if (editorRef.current.innerHTML !== clean) {
        editorRef.current.innerHTML = clean || "<p><br></p>";
      }
    }
  }, [value]);

  // Check localStorage for auto-draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.html && parsed.html !== value && parsed.html.length > 20) {
          setHasRestorableDraft(true);
          setLastSavedDraftTime(parsed.time);
        }
      }
    } catch {
      // Ignorar error de lectura de draft
    }
  }, [draftKey, value]);

  // Emit change to parent and update localStorage auto-draft
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const clean = sanitizeHtml(html);
    lastEmittedValue.current = clean;
    if (onChange) onChange(clean);

    // Guardar borrador local
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        html: clean,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    } catch {
      // Ignorar cuota excedida de localStorage
    }
  }, [onChange, draftKey]);

  // Restore draft
  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.html && editorRef.current) {
          const clean = sanitizeHtml(parsed.html);
          editorRef.current.innerHTML = clean;
          lastEmittedValue.current = clean;
          onChange(clean);
          onToast("Borrador restaurado con éxito ✨");
        }
      }
    } catch {
      onToast("No se pudo restaurar el borrador");
    }
    setHasRestorableDraft(false);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignorar
    }
    setHasRestorableDraft(false);
    onToast("Borrador descartado");
  };

  // Helper to execute document commands keeping selection
  const execCmd = (cmd, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const range = selectionRef.current;
    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand(cmd, false, val);
    rememberSelection();
    emitChange();
  };

  // Smart Paste Handler (from ChatGPT, Word, websites, plaintext, or images)
  const handlePaste = (e) => {
    e.preventDefault();

    // 1. Revisar si hay imágenes en el portapapeles
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            uploadAndInsertImage(file);
            return;
          }
        }
      }
    }

    const html = e.clipboardData?.getData('text/html') || '';
    const text = e.clipboardData?.getData('text/plain') || '';

    const cleanHtml = parsePastedContent(html, text);

    if (cleanHtml) {
      document.execCommand('insertHTML', false, cleanHtml);
      emitChange();
    }
  };

  // Link Insertion / Editing
  const openLinkModal = () => {
    const sel = window.getSelection();
    let existingText = "";
    let existingUrl = "";
    let range = null;

    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0).cloneRange();
      existingText = sel.toString();

      let node = sel.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'A') {
          existingUrl = node.getAttribute('href') || '';
          existingText = node.textContent || '';
          break;
        }
        node = node.parentNode;
      }
    }

    setLinkModal({
      url: existingUrl,
      text: existingText,
      existingRange: range
    });
  };

  const saveLinkModal = () => {
    if (!linkModal) return;
    const { url, text, existingRange } = linkModal;
    setLinkModal(null);

    if (!url) {
      execCmd('unlink');
      return;
    }

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl) && !/^tel:/i.test(finalUrl) && !finalUrl.startsWith('/')) {
      finalUrl = 'https://' + finalUrl;
    }

    if (existingRange && editorRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(existingRange);
    }

    const displayText = text.trim() || finalUrl;
    const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color:#0F1A14;font-weight:700;text-decoration:underline;text-underline-offset:3px;">${displayText}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    emitChange();
  };

  // Image upload and insertion
  const uploadAndInsertImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast("Por favor selecciona un archivo de imagen válido");
      return;
    }

    setIsUploading(true);
    setUploadPct(0);

    try {
      const publicUrl = await cloudUpload(file, (pct) => setUploadPct(pct), "cityguide/blog");

      if (!publicUrl) throw new Error("No se obtuvo la URL pública de la imagen");

      if (!editorRef.current) return;
      editorRef.current.focus();

      const figureHtml = `
        <figure class="blog-figure" style="margin:20px 0;text-align:center;">
          <img src="${publicUrl}" alt="${file.name.replace(/\.[^/.]+$/, "")}" style="width:100%;max-width:100%;height:auto;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,0.08);display:block;margin:0 auto;" loading="lazy" decoding="async" />
          <figcaption style="font-size:13px;color:#64748B;font-weight:600;margin-top:8px;text-align:center;" contenteditable="true" placeholder="Pie de foto opcional...">Pie de foto (toca para editar)</figcaption>
        </figure>
        <p><br></p>
      `;

      document.execCommand('insertHTML', false, figureHtml);
      emitChange();
      onToast("Fotografía insertada con éxito ✓");
    } catch (e) {
      console.error(e);
      onToast("Error al subir fotografía: " + (e.message || "Revisa tu conexión"));
    } finally {
      setIsUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Image replacement
  const handleReplaceImage = async (file) => {
    if (!file || !selectedImgNode) return;
    setIsUploading(true);
    setUploadPct(0);
    try {
      const publicUrl = await cloudUpload(file, (pct) => setUploadPct(pct), "cityguide/blog");
      if (publicUrl && selectedImgNode) {
        selectedImgNode.setAttribute('src', publicUrl);
        emitChange();
        onToast("Imagen reemplazada ✓");
      }
    } catch (e) {
      onToast("Error al reemplazar imagen: " + e.message);
    } finally {
      setIsUploading(false);
      setUploadPct(0);
      setSelectedImgNode(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
    }
  };

  // Image click detection for inline toolbar
  const handleEditorClick = (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG') {
      setSelectedImgNode(target);
    } else if (!target.closest('.blog-img-actions')) {
      setSelectedImgNode(null);
    }
  };

  // Delete selected image
  const handleDeleteSelectedImage = () => {
    if (!selectedImgNode) return;
    const figure = selectedImgNode.closest('figure');
    if (figure) {
      figure.remove();
    } else {
      selectedImgNode.remove();
    }
    setSelectedImgNode(null);
    emitChange();
    onToast("Imagen eliminada del artículo");
  };

  // Edit Alt and Caption
  const handleOpenImageMetaModal = () => {
    if (!selectedImgNode) return;
    const figure = selectedImgNode.closest('figure');
    const figcaption = figure ? figure.querySelector('figcaption') : null;
    setImageModal({
      imgNode: selectedImgNode,
      alt: selectedImgNode.getAttribute('alt') || '',
      caption: figcaption ? figcaption.innerText : ''
    });
    setSelectedImgNode(null);
  };

  const handleSaveImageMeta = () => {
    if (!imageModal || !imageModal.imgNode) return;
    const { imgNode, alt, caption } = imageModal;
    imgNode.setAttribute('alt', alt.trim());

    const figure = imgNode.closest('figure');
    if (figure) {
      let figcaption = figure.querySelector('figcaption');
      if (caption.trim()) {
        if (!figcaption) {
          figcaption = document.createElement('figcaption');
          figcaption.style.fontSize = "13px";
          figcaption.style.color = "#64748B";
          figcaption.style.fontWeight = "600";
          figcaption.style.marginTop = "8px";
          figcaption.style.textAlign = "center";
          figcaption.contentEditable = "true";
          figure.appendChild(figcaption);
        }
        figcaption.innerText = caption.trim();
      } else if (figcaption) {
        figcaption.remove();
      }
    }
    setImageModal(null);
    emitChange();
    onToast("Información de la imagen actualizada");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {/* Aviso de borrador recuperable */}
      {hasRestorableDraft && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#1E40AF", fontWeight: 600 }}>
            📝 Hay un borrador no guardado ({lastSavedDraftTime || "reciente"}).
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleRestoreDraft} style={{ background: "#2563EB", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Restaurar
            </button>
            <button type="button" onClick={handleDiscardDraft} style={{ background: "transparent", color: "#64748B", border: "1px solid #CBD5E1", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Editor Container Card */}
      <div style={{
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        position: "relative",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Progress Bar when uploading */}
        {isUploading && (
          <div style={{ width: "100%", background: "#E2E8F0", height: 4, position: "relative", overflow: "hidden" }}>
            <div style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg, #10B981, #3B82F6)", height: "100%", transition: "width 0.2s ease" }} />
          </div>
        )}

        {/* Toolbar Header (Sticky & Scrollable for mobile touch) */}
        <div 
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "#F8FAFC",
            borderBottom: "1.5px solid #E2E8F0",
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            userSelect: "none"
          }}
        >
          {/* Action Group: History */}
          <button
            type="button"
            title="Deshacer"
            onMouseDown={(e) => { e.preventDefault(); execCmd('undo'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('undo'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Icon name="arrow_left" size={16} color="#334155" />
          </button>
          <button
            type="button"
            title="Rehacer"
            onMouseDown={(e) => { e.preventDefault(); execCmd('redo'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('redo'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Icon name="arrow_right" size={16} color="#334155" />
          </button>

          <div style={{ width: 1, height: 24, background: "#CBD5E1", margin: "0 2px", flexShrink: 0 }} />

          {/* Alignment keeps the iPhone text selection when the toolbar is touched. */}
          {[
            ['justifyLeft', 'Alinear a la izquierda', 'left'],
            ['justifyCenter', 'Centrar texto', 'center'],
            ['justifyRight', 'Alinear a la derecha', 'right'],
            ['justifyFull', 'Justificar texto', 'justify'],
          ].map(([command, label, alignment]) => (
            <button
              key={command}
              type="button"
              title={label}
              aria-label={label}
              onPointerDown={e => { e.preventDefault(); rememberSelection(); }}
              onClick={() => execCmd(command)}
              style={{ width: 38, height: 38, background: '#fff', border: '1px solid #CBD5E1', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: 9, cursor: 'pointer', flexShrink: 0 }}
            >
              {[0, 1, 2, 3].map(line => (
                <span key={line} aria-hidden="true" style={{ display: 'block', height: 2, background: '#334155', width: alignment === 'justify' || line % 2 === 0 ? '100%' : '65%', alignSelf: alignment === 'right' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start' }} />
              ))}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: '#CBD5E1', margin: '0 2px', flexShrink: 0 }} />

          {/* Styles: Bold, Italic */}
          <button
            type="button"
            title="Negrita"
            onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('bold'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#0F1A14", cursor: "pointer", flexShrink: 0 }}
          >
            B
          </button>
          <button
            type="button"
            title="Cursiva"
            onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('italic'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontStyle: "italic", fontWeight: 700, color: "#0F1A14", cursor: "pointer", flexShrink: 0 }}
          >
            I
          </button>

          <div style={{ width: 1, height: 24, background: "#CBD5E1", margin: "0 2px", flexShrink: 0 }} />

          {/* Lists: Bullets & Numbers */}
          <button
            type="button"
            title="Lista con viñetas"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Icon name="list" size={16} color="#334155" />
          </button>
          <button
            type="button"
            title="Lista numerada"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#334155", cursor: "pointer", flexShrink: 0 }}
          >
            1.
          </button>

          <div style={{ width: 1, height: 24, background: "#CBD5E1", margin: "0 2px", flexShrink: 0 }} />

          {/* Link */}
          <button
            type="button"
            title="Insertar o editar enlace"
            onMouseDown={(e) => { e.preventDefault(); openLinkModal(); }}
            onTouchStart={(e) => { e.preventDefault(); openLinkModal(); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <Icon name="share" size={16} color="#334155" />
          </button>

          {/* Divider */}
          <button
            type="button"
            title="Línea separadora"
            onMouseDown={(e) => { e.preventDefault(); execCmd('insertHorizontalRule'); }}
            onTouchStart={(e) => { e.preventDefault(); execCmd('insertHorizontalRule'); }}
            style={{ width: 38, height: 38, background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#334155", cursor: "pointer", flexShrink: 0 }}
          >
            ―
          </button>

          {/* Image Upload */}
          <button
            type="button"
            title="Insertar imagen desde galería"
            disabled={isUploading}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              padding: "0 12px",
              height: 38,
              background: "#1A7A5E",
              border: "none",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: isUploading ? "wait" : "pointer",
              flexShrink: 0,
              opacity: isUploading ? 0.6 : 1
            }}
          >
            <Icon name="image" size={16} color="#fff" />
            <span>{isUploading ? `Subiendo ${uploadPct}%...` : "Foto"}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                uploadAndInsertImage(e.target.files[0]);
              }
            }}
          />

          {/* Replace file input */}
          <input
            type="file"
            ref={replaceFileInputRef}
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleReplaceImage(e.target.files[0]);
              }
            }}
          />

          {/* Live Preview Button */}
          <button
            type="button"
            title="Vista previa del artículo"
            onClick={() => setShowPreview(true)}
            style={{
              padding: "0 12px",
              height: 38,
              background: "#0F1A14",
              border: "none",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              flexShrink: 0,
              marginLeft: "auto"
            }}
          >
            <Icon name="eye" size={15} color="#fff" />
            <span>Vista Previa</span>
          </button>
        </div>

        {/* Contenteditable Visual Editor Area */}
        <div style={{ position: "relative", minHeight: 380, display: "flex", flexDirection: "column" }}>
          <div
            ref={editorRef}
            className="blog-public-content blog-editor-content"
            role="textbox"
            aria-label="Contenido del artículo"
            aria-multiline="true"
            onKeyUp={rememberSelection}
            onMouseUp={rememberSelection}
            onTouchEnd={rememberSelection}
            onBlur={rememberSelection}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            onPaste={handlePaste}
            onClick={handleEditorClick}
            style={{
              flex: 1,
              minHeight: 380,
              padding: "20px 18px",
              fontSize: 16,
              lineHeight: 1.8,
              textAlign: 'left',
              color: "#0F1A14",
              outline: "none",
              wordBreak: "break-word",
              fontFamily: "var(--sans, system-ui, sans-serif)"
            }}
          />

          {/* Floating Actions when an image is selected */}
          {selectedImgNode && (
            <div
              className="blog-img-actions"
              style={{
                position: "sticky",
                bottom: 12,
                margin: "0 auto",
                zIndex: 40,
                background: "rgba(15, 26, 20, 0.95)",
                backdropFilter: "blur(10px)",
                padding: "8px 12px",
                borderRadius: 24,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#fff"
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, paddingRight: 4, borderRight: "1px solid rgba(255,255,255,0.2)" }}>
                📸 Foto seleccionada
              </span>
              <button
                type="button"
                onClick={handleOpenImageMetaModal}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 14, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Editar texto / pie
              </button>
              <button
                type="button"
                onClick={() => replaceFileInputRef.current && replaceFileInputRef.current.click()}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 14, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Reemplazar
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedImage}
                style={{ background: "#EF4444", border: "none", borderRadius: 14, padding: "5px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#64748B", padding: "0 4px" }}>
        <span>💡 Puedes pegar artículos desde ChatGPT con formato, subtítulos e imágenes.</span>
        <span>Guardado local activo</span>
      </div>

      {/* Modal: Insert / Edit Link */}
      {linkModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 14 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F1A14" }}>Insertar / Editar Enlace</h4>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Texto visible</label>
              <input
                type="text"
                value={linkModal.text}
                onChange={e => setLinkModal(m => ({ ...m, text: e.target.value }))}
                placeholder="Ej. Conoce más aquí"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>URL destino</label>
              <input
                type="url"
                value={linkModal.url}
                onChange={e => setLinkModal(m => ({ ...m, url: e.target.value }))}
                placeholder="https://ejemplo.com"
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setLinkModal(null)} style={{ flex: 1, padding: 10, background: "#F1F5F9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={saveLinkModal} style={{ flex: 1, padding: 10, background: "#1A7A5E", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                Aplicar enlace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Image Metadata (Alt text & Caption) */}
      {imageModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 20, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 14 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0F1A14" }}>Propiedades de la Imagen</h4>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Pie de foto (Visible debajo)</label>
              <input
                type="text"
                value={imageModal.caption}
                onChange={e => setImageModal(m => ({ ...m, caption: e.target.value }))}
                placeholder="Ej. Vista panorámica desde la cima..."
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Texto alternativo (Alt / Accesibilidad)</label>
              <input
                type="text"
                value={imageModal.alt}
                onChange={e => setImageModal(m => ({ ...m, alt: e.target.value }))}
                placeholder="Descripción de la fotografía..."
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => setImageModal(null)} style={{ flex: 1, padding: 10, background: "#F1F5F9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSaveImageMeta} style={{ flex: 1, padding: 10, background: "#1A7A5E", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Live Article Preview */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{
            background: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: "92vh",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}>
            {/* Header of Preview */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>👁️</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#0F1A14" }}>Vista Previa del Artículo</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{ background: "#E2E8F0", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Icon name="x" size={16} color="#0F1A14" />
              </button>
            </div>

            {/* Preview Body (Simulates real ExperienceViewer) */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 60px", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              {/* Cover Preview */}
              {coverUrl && (
                <div style={{ width: "100%", maxHeight: 320, borderRadius: 18, overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                  <img src={coverUrl} alt="Portada" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}

              {/* Title */}
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F1A14", lineHeight: 1.2, margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
                {expTitle || "Título del artículo"}
              </h1>

              {/* Author */}
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
                <span>Por {authorName || "CityMap"}</span>
                <span>·</span>
                <span>Guía / Artículo</span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "0 0 24px 0" }} />

              {/* Article Content Rendered */}
              <div
                className="blog-public-content"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editorRef.current ? editorRef.current.innerHTML : value) }}
                style={{ fontFamily: 'var(--sans, system-ui, sans-serif)', textAlign: 'left', fontSize: 16, color: "#1E293B", lineHeight: 1.8 }}
              />
            </div>

            {/* Bottom bar of Preview */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", background: "#fff", display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                style={{ width: "100%", maxWidth: 360, padding: 12, background: "#1A7A5E", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
              >
                Volver a la edición
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Scoped CSS for elements */}
      <style>{`
        .blog-public-content, .blog-public-content * {
          font-family: var(--sans, system-ui, sans-serif) !important;
        }
        .blog-figure {
          margin: 20px 0;
          text-align: center;
        }
        .blog-figure img {
          width: 100%;
          max-width: 100%;
          height: auto;
          border-radius: 14px;
          display: block;
          margin: 0 auto;
        }
        .blog-figure figcaption {
          font-size: 13px;
          color: #64748B;
          font-weight: 600;
          margin-top: 8px;
          text-align: center;
        }
        .blog-public-content h2 {
          font-size: 22px;
          font-weight: 900;
          color: #0F1A14;
          margin: 28px 0 12px 0;
          line-height: 1.25;
          letter-spacing: -0.4px;
        }
        .blog-public-content h3 {
          font-size: 18px;
          font-weight: 800;
          color: #0F1A14;
          margin: 22px 0 10px 0;
          line-height: 1.3;
        }
        .blog-public-content p {
          margin: 0 0 16px 0;
          line-height: 1.8;
          font-size: 16px;
        }
        .blog-public-content ul, .blog-public-content ol {
          padding-left: 24px;
          margin: 0 0 18px 0;
        }
        .blog-public-content li {
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .blog-public-content hr {
          border: none;
          border-top: 1.5px dashed #E2E8F0;
          margin: 28px 0;
        }
        .blog-public-content a {
          color: #0F1A14;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
