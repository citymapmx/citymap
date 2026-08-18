import { useState } from 'react';
import { sb } from '../../lib/supabase.js';
import Icon from '../ui/Icon.jsx';

export default function StoreMonetizationTab({ business, T, inpH, profile }) {
  const [loading, setLoading] = useState(false);
  const [mlForm, setMlForm] = useState({ 
    url: business.mercado_libre_url || "", 
    products: Array.isArray(business.affiliate_products) ? business.affiliate_products : [] 
  });

  const saveMlConfig = async () => {
    setLoading(true);
    await sb.patch("businesses", business.id, {
      mercado_libre_url: mlForm.url,
      affiliate_products: mlForm.products
    });
    business.mercado_libre_url = mlForm.url;
    business.affiliate_products = mlForm.products;
    setLoading(false);
    alert("¡Configuración de monetización guardada con éxito!");
  };

  if (!profile?.is_admin) return null;

  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg, display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 13, color: T.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          💰 MONETIZACIÓN (AFILIADOS)
        </div>
        
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 8, display: 'block' }}>Enlace de la Tienda Oficial (Mercado Libre)</label>
            <input 
              value={mlForm.url} 
              onChange={e => setMlForm({ ...mlForm, url: e.target.value })} 
              placeholder="Ej: https://tienda.mercadolibre.com.mx/..." 
              style={{ ...inpH, padding: "12px 14px", width: "100%" }} 
            />
            <p style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>Este enlace se usará en el botón "Ver catálogo" del banner amarillo en el perfil del negocio.</p>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>
              🛍️ PRODUCTOS RECOMENDADOS
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
              {mlForm.products.map((ap, idx) => (
                <div key={idx} style={{ background: T.bg, padding: 16, borderRadius: 12, border: `1px solid ${T.border}`, position: "relative" }}>
                  <button onClick={() => {
                    const n = [...mlForm.products];
                    n.splice(idx, 1);
                    setMlForm({ ...mlForm, products: n });
                  }} style={{ position: "absolute", top: 12, right: 12, background: "#FEF2F2", border: "none", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.red }}>
                    <Icon name="x" size={16} />
                  </button>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingRight: 36 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4, display: 'block' }}>Título del producto</label>
                      <input value={ap.title || ""} onChange={e => {
                        const n = [...mlForm.products];
                        n[idx] = { ...n[idx], title: e.target.value };
                        setMlForm({ ...mlForm, products: n });
                      }} style={{ ...inpH, padding: "10px 12px", width: "100%" }} />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4, display: 'block' }}>Enlace de compra (Afiliado)</label>
                      <input value={ap.url || ""} onChange={e => {
                        const n = [...mlForm.products];
                        n[idx] = { ...n[idx], url: e.target.value };
                        setMlForm({ ...mlForm, products: n });
                      }} style={{ ...inpH, padding: "10px 12px", width: "100%" }} />
                    </div>

                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4, display: 'block' }}>URL de la imagen</label>
                        <input value={ap.image || ""} onChange={e => {
                          const n = [...mlForm.products];
                          n[idx] = { ...n[idx], image: e.target.value };
                          setMlForm({ ...mlForm, products: n });
                        }} style={{ ...inpH, padding: "10px 12px", width: "100%" }} />
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", marginBottom: 4, display: 'block' }}>Precio</label>
                        <input value={ap.price || ""} onChange={e => {
                          const n = [...mlForm.products];
                          n[idx] = { ...n[idx], price: e.target.value };
                          setMlForm({ ...mlForm, products: n });
                        }} placeholder="Ej. $499" style={{ ...inpH, padding: "10px 12px", width: "100%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={() => {
                const n = [...mlForm.products];
                n.push({ title: "", url: "", image: "", price: "" });
                setMlForm({ ...mlForm, products: n });
              }} style={{ width: "100%", padding: "12px", background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer" }}>
                + Añadir producto afiliado
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button onClick={saveMlConfig} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
