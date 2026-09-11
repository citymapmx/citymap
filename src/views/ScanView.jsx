import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sb } from '../lib/supabase.js';
import Icon from '../components/ui/Icon.jsx';

export default function ScanView({ user, T, dark, setShowAuth }) {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [card, setCard] = useState(null);
  const [biz, setBiz] = useState(null);
  const [error, setError] = useState(null);
  const [stamping, setStamping] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        // 1. Fetch Member
        const mRes = await sb.get("loyalty_members", `?id=eq.${memberId}&limit=1`);
        if (!mRes || mRes.length === 0) {
          setError("Cliente no encontrado o tarjeta inválida.");
          setLoading(false);
          return;
        }
        const m = mRes[0];

        // 2. Fetch Biz & Check Permissions
        // A business owner must be the owner of the biz the member belongs to.
        const bizRes = await sb.get("businesses", `?id=eq.${m.biz_id}&limit=1`);
        if (!bizRes || bizRes.length === 0) {
          setError("Negocio no encontrado.");
          setLoading(false);
          return;
        }
        const b = bizRes[0];

        if (b.owner_id !== user.id && (!b.team_members || !b.team_members.includes(user.id))) {
          setError("No tienes permiso para escanear tarjetas de este negocio.");
          setLoading(false);
          return;
        }

        // 3. Fetch Card Config
        const cRes = await sb.get("loyalty_cards", `?biz_id=eq.${m.biz_id}&limit=1`);
        
        setMember(m);
        setBiz(b);
        if (cRes && cRes.length > 0) setCard(cRes[0]);

      } catch (e) {
        setError("Error al cargar datos.");
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [memberId, user]);

  const handleGiveStamp = async () => {
    if (!member || !card || !biz) return;
    setStamping(true);

    const currentStamps = member.stamps || 0;
    const stampsRequired = card.stamps_required || 5;
    
    // Si ya completó la tarjeta, la acción es canjear (redeem)
    const isRedeeming = currentStamps >= stampsRequired;
    const newStamps = isRedeeming ? 0 : currentStamps + 1;
    const action = isRedeeming ? "redeem" : "stamp";

    try {
      await sb.patch("loyalty_members", member.id, {
        stamps: newStamps,
        last_stamp_at: new Date().toISOString()
      });
      await sb.post("loyalty_stamps_log", {
        member_id: member.id,
        biz_id: biz.id,
        action: action,
        amount: 1
      });
      
      // Actualizar Google Wallet
      fetch("/api/wallet-update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: member.id, stamps: newStamps, stamps_required: stampsRequired })
      }).catch(e => console.error(e));

      setMember(prev => ({ ...prev, stamps: newStamps, last_stamp_at: new Date().toISOString() }));
      
      if (isRedeeming) {
        alert("🎉 ¡Premio entregado! La tarjeta se reinició a 0 sellos.");
      } else if (newStamps >= stampsRequired) {
        alert("🎉 ¡Felicidades! El cliente ha completado todos los sellos y ya puede canjear su premio.");
      } else {
        alert("✅ Sello agregado exitosamente.");
      }
    } catch(e) {
      alert("Error: " + e.message);
    }
    setStamping(false);
  };

  const bg = dark ? '#0f172a' : '#f4f7f9';
  const text = T?.text || '#111';

  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 64, height: 64, background: "#000", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Icon name="lock" size={32} color="#fff" />
        </div>
        <h2 style={{ margin: "0 0 12px", color: text, fontSize: 24, fontWeight: 900 }}>Inicia sesión</h2>
        <p style={{ margin: "0 0 24px", color: T?.sub, textAlign: "center", lineHeight: 1.5 }}>
          Necesitas iniciar sesión con tu cuenta de negocio para poder escanear las tarjetas de lealtad.
        </p>
        <button onClick={() => setShowAuth(true)} style={{ padding: "16px 32px", background: "#000", color: "#fff", borderRadius: 16, border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Iniciar Sesión
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(0,0,0,0.1)", borderTop: `3px solid ${text}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div style={{ minHeight: "100dvh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 64, height: 64, background: "#EF4444", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          <Icon name="lock" size={32} color="#fff" />
        </div>
        <h2 style={{ margin: "0 0 12px", color: text, fontSize: 24, fontWeight: 900 }}>Acceso denegado</h2>
        <p style={{ margin: "0 0 24px", color: T?.sub, textAlign: "center", lineHeight: 1.5 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "16px 32px", background: "#000", color: "#fff", borderRadius: 16, border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          Ir al Inicio
        </button>
      </div>
    );
  }

  const stampsRequired = card?.stamps_required || 5;
  const isCompleted = member.stamps >= stampsRequired;

  return (
    <div style={{ minHeight: "100dvh", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      
      <div style={{ width: "100%", maxWidth: 400, background: T?.bg || "#fff", borderRadius: 24, padding: 32, boxShadow: "0 20px 40px rgba(0,0,0,0.08)", textAlign: "center" }}>
        
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#F4F7F9", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="user" size={32} color="#111" />
        </div>

        <h2 style={{ margin: "0 0 4px", color: text, fontSize: 22, fontWeight: 900 }}>{member.name || member.email}</h2>
        <p style={{ margin: 0, color: T?.sub, fontSize: 14 }}>Cliente frecuente de {biz.name}</p>

        <div style={{ margin: "32px 0", padding: "20px", background: isCompleted ? "#FEF3C7" : "#F8FAFC", borderRadius: 16, border: `1px solid ${isCompleted ? "#FDE68A" : "#E2E8F0"}` }}>
          <div style={{ fontSize: 12, color: isCompleted ? "#D97706" : "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
            {isCompleted ? "Premio Alcanzado" : "Progreso actual"}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: isCompleted ? "#D97706" : "#0F172A", margin: "8px 0" }}>
            {member.stamps} / {stampsRequired}
          </div>
          <div style={{ fontSize: 14, color: isCompleted ? "#D97706" : "#64748B", fontWeight: 600 }}>
            {isCompleted ? "El cliente tiene derecho a canjear su premio." : "Faltan " + (stampsRequired - member.stamps) + " sellos para el premio."}
          </div>
        </div>

        <button 
          onClick={handleGiveStamp}
          disabled={stamping}
          style={{ 
            width: "100%", padding: 20, borderRadius: 16, border: "none", 
            background: isCompleted ? "#F59E0B" : "#000", 
            color: "#fff", fontWeight: 900, fontSize: 18, cursor: "pointer", 
            opacity: stamping ? 0.7 : 1,
            boxShadow: isCompleted ? "0 8px 24px rgba(245, 158, 11, 0.3)" : "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12
          }}
        >
          {stamping ? "Procesando..." : (isCompleted ? "🏆 Canjear Premio" : "+ Dar 1 Sello")}
        </button>

      </div>
      
      <button onClick={() => navigate("/")} style={{ margin: "24px 0", background: "none", border: "none", color: T?.sub, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        Volver al Inicio
      </button>

    </div>
  );
}
