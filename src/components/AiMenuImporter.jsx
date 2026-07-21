import React, { useState, useRef } from 'react';
import Icon from './ui/Icon.jsx';
import imageCompression from 'browser-image-compression';

const CORS = {
  'Access-Control-Allow-Origin': '*',
};

export default function AiMenuImporter({ onImport, bizType, adminSecret }) {
  const [step, setStep] = useState('idle'); // idle | uploading | analyzing | preview | done
  const [preview, setPreview] = useState(null); // { categories: [...] }
  const [error, setError] = useState('');
  const [editedResult, setEditedResult] = useState(null);
  const [progress, setProgress] = useState('');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Solo se aceptan imágenes (JPG, PNG, WEBP).');
      return;
    }

    // Max 10MB before compression
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es muy grande. Máximo 10MB.');
      return;
    }

    setError('');
    setStep('uploading');
    setProgress('Optimizando imagen...');

    try {
      // Comprimir la imagen antes de enviarla a Groq para evitar errores de tamaño 400
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      const base64 = await fileToBase64(compressedFile);
      
      setStep('analyzing');
      setProgress('🤖 Analizando con IA... (puede tardar 10-20 segundos)');

      const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor')
        ? 'https://citymap.mx/api/ai-menu'
        : '/api/ai-menu';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          businessType: bizType || 'restaurante'
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error desconocido');
      }

      setPreview(data.result);
      setEditedResult(data.result);
      setStep('preview');
    } catch (err) {
      setError('Error: ' + err.message);
      setStep('idle');
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Remove "data:image/jpeg;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const updateItemName = (catIdx, itemIdx, val) => {
    const r = JSON.parse(JSON.stringify(editedResult));
    r.categories[catIdx].items[itemIdx].name = val;
    setEditedResult(r);
  };

  const updateItemPrice = (catIdx, itemIdx, val) => {
    const r = JSON.parse(JSON.stringify(editedResult));
    r.categories[catIdx].items[itemIdx].price = val === '' ? null : parseFloat(val);
    setEditedResult(r);
  };

  const updateItemDesc = (catIdx, itemIdx, val) => {
    const r = JSON.parse(JSON.stringify(editedResult));
    r.categories[catIdx].items[itemIdx].description = val;
    setEditedResult(r);
  };

  const removeItem = (catIdx, itemIdx) => {
    const r = JSON.parse(JSON.stringify(editedResult));
    r.categories[catIdx].items.splice(itemIdx, 1);
    if (r.categories[catIdx].items.length === 0) {
      r.categories.splice(catIdx, 1);
    }
    setEditedResult(r);
  };

  const handleConfirm = () => {
    onImport(editedResult);
    setStep('done');
    setTimeout(() => setStep('idle'), 2000);
  };

  const handleReset = () => {
    setStep('idle');
    setPreview(null);
    setEditedResult(null);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalItems = editedResult?.categories?.reduce((acc, c) => acc + c.items.length, 0) || 0;

  if (step === 'done') {
    return (
      <div style={{ background: '#DCFCE7', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #86EFAC' }}>
        <div style={{ fontSize: 24 }}>✅</div>
        <div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: 14 }}>¡Catálogo importado con éxito!</div>
          <div style={{ fontSize: 12, color: '#15803D' }}>Se agregaron {totalItems} productos al catálogo.</div>
        </div>
      </div>
    );
  }

  if (step === 'uploading' || step === 'analyzing') {
    return (
      <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px dashed #86EFAC', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8, animation: 'spin 2s linear infinite' }}>🤖</div>
        <div style={{ fontWeight: 700, color: '#166534', fontSize: 14, marginBottom: 4 }}>
          {step === 'uploading' ? 'Leyendo archivo...' : 'Analizando con IA...'}
        </div>
        <div style={{ fontSize: 12, color: '#15803D' }}>{progress}</div>
        <div style={{ marginTop: 12, height: 4, background: '#BBF7D0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#16A34A', borderRadius: 2, width: step === 'analyzing' ? '80%' : '30%', transition: 'width 1s ease', animation: 'pulse 2s ease infinite' }} />
        </div>
      </div>
    );
  }

  if (step === 'preview' && editedResult) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #E4E8E4', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>✨ IA detectó {totalItems} items</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Revisa y edita antes de guardar</div>
          </div>
          <button onClick={handleReset} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            ✕ Cancelar
          </button>
        </div>

        {/* Category list */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {editedResult.categories.map((cat, catIdx) => (
            <div key={catIdx}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, borderBottom: '1px solid #F3F4F6', paddingBottom: 6 }}>
                📂 {cat.name} ({cat.items.length} items)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cat.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', border: '1px solid #E4E8E4' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        value={item.name}
                        onChange={e => updateItemName(catIdx, itemIdx, e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 700, fontSize: 12, color: '#0F1A14', outline: 'none', padding: 0 }}
                        placeholder="Nombre del producto"
                      />
                      <input
                        value={item.description || ''}
                        onChange={e => updateItemDesc(catIdx, itemIdx, e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 11, color: '#5A6872', outline: 'none', padding: 0, marginTop: 2 }}
                        placeholder="Descripción (opcional)"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#5A6872' }}>$</span>
                      <input
                        type="number"
                        value={item.price ?? ''}
                        onChange={e => updateItemPrice(catIdx, itemIdx, e.target.value)}
                        style={{ width: 60, border: '1px solid #E4E8E4', borderRadius: 6, padding: '4px 6px', fontSize: 12, fontWeight: 700, color: '#0F1A14', background: '#fff', textAlign: 'right', outline: 'none' }}
                        placeholder="Precio"
                      />
                    </div>
                    <button onClick={() => removeItem(catIdx, itemIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#D94F3D', flexShrink: 0 }}>
                      <Icon name="trash" size={13} color="#D94F3D" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Confirm */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #E4E8E4', background: '#F9FAFB', display: 'flex', gap: 8 }}>
          <button onClick={handleReset} style={{ flex: 1, background: 'transparent', border: '1px solid #E4E8E4', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, color: '#5A6872', cursor: 'pointer' }}>
            Descartar
          </button>
          <button onClick={handleConfirm} style={{ flex: 2, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            ✅ Guardar {totalItems} productos
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#DC2626' }}>
          ⚠️ {error}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} onChange={handleFile} />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.08))',
          border: '1.5px dashed #7C3AED',
          borderRadius: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 28, flexShrink: 0 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#7C3AED' }}>Importar con IA</div>
          <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2, lineHeight: 1.3 }}>
            Sube una foto o PDF de tu menú/catálogo y la IA lo digitalizará automáticamente.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <Icon name="image" size={18} color="#7C3AED" />
        </div>
      </button>

      <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>
        Acepta JPG, PNG o WEBP • Máx. 10MB
      </div>
    </div>
  );
}
