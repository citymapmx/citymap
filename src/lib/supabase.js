import { Capacitor } from '@capacitor/core';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Base project URL — NO trailing slash, NO /rest/v1
const SUPABASE_URL = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
// Publishable (anon) key
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";
const CLOUDINARY_CLOUD = "da6g5pt5x";
const CLOUDINARY_PRESET = "cityguide_unsigned";
const GMAPS_KEY = "AIzaSyD_fPxRqRJe6r9BiBsTZBj2K_KZnrhIf4M";

const _SB_BASE = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const _REST = `${_SB_BASE}/rest/v1`;
const _AUTH = `${_SB_BASE}/auth/v1`;

// ── Detect key type ──────────────────────────────────────────────────────────
// sb_publishable_ keys are NOT JWTs. PostgREST requires a JWT in Authorization.
// For anon/public reads we omit the Bearer or send the key only as apikey.
// Once a user logs in, their JWT is used as Bearer.
const _KEY_IS_JWT = SUPABASE_ANON.startsWith("eyJ");

const sb = {
  _token: null,   // set after signIn — always a real JWT

  restHeaders() {
    const base = {
      "apikey": SUPABASE_ANON,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    };
    // Use logged-in JWT when available; fall back to anon key only if it is a JWT
    const bearer = this._token || (_KEY_IS_JWT ? SUPABASE_ANON : null);
    if (bearer) base["Authorization"] = `Bearer ${bearer}`;
    return base;
  },
  authHeaders() {
    return { "apikey": SUPABASE_ANON, "Content-Type": "application/json" };
  },

  // ── Safe response parser ──
  async _json(r) {
    const text = await r.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { message: text }; }
  },

  async get(table, params = "") {
    const r = await fetch(`${_REST}/${table}${params}`, { headers: sb.restHeaders() });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.hint || d?.error || `HTTP ${r.status}`);
    return d ?? [];
  },
  // Public get — sends only apikey without user JWT (for reading shared/private plans via link)
  async getPublic(table, params = "") {
    const headers = {
      "apikey": SUPABASE_ANON,
      "Content-Type": "application/json",
    };
    if (_KEY_IS_JWT) headers["Authorization"] = `Bearer ${SUPABASE_ANON}`;
    const r = await fetch(`${_REST}/${table}${params}`, { headers });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.hint || d?.error || `HTTP ${r.status}`);
    return d ?? [];
  },
  async count(table, params = "") {
    const headers = sb.restHeaders();
    headers["Prefer"] = "count=exact";
    const r = await fetch(`${_REST}/${table}${params}&limit=1`, { method: "HEAD", headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const range = r.headers.get("Content-Range");
    if (!range) return 0;
    return parseInt(range.split("/")[1], 10) || 0;
  },
  async post(table, body) {
    const r = await fetch(`${_REST}/${table}`, {
      method: "POST", headers: sb.restHeaders(), body: JSON.stringify(body),
    });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.hint || d?.error || `HTTP ${r.status}`);
    return d ?? [];
  },
  async rpc(func, body = {}, params = "") {
    const r = await fetch(`${_REST}/rpc/${func}${params}`, {
      method: "POST", headers: sb.restHeaders(), body: JSON.stringify(body),
    });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.hint || d?.error || `HTTP ${r.status}`);
    return d ?? [];
  },
  async patch(table, id, body) {
    const r = await fetch(`${_REST}/${table}?id=eq.${id}`, {
      method: "PATCH", headers: sb.restHeaders(), body: JSON.stringify(body),
    });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.hint || `HTTP ${r.status}`);
    return d ?? [];
  },
  async del(table, id) {
    const r = await fetch(`${_REST}/${table}?id=eq.${id}`, {
      method: "DELETE", headers: sb.restHeaders(),
    });
    if (!r.ok) { const d = await sb._json(r); throw new Error(d?.message || `HTTP ${r.status}`); }
    return true;
  },
  async delWhere(table, col, val) {
    const r = await fetch(`${_REST}/${table}?${col}=eq.${val}`, {
      method: "DELETE", headers: sb.restHeaders(),
    });
    return r.ok;
  },
  async delWhere2(table, col1, val1, col2, val2) {
    const r = await fetch(`${_REST}/${table}?${col1}=eq.${val1}&${col2}=eq.${val2}`, {
      method: "DELETE", headers: sb.restHeaders(),
    });
    return r.ok;
  },
  async notify(user_id, title, body, type = 'system') {
    if (!user_id) return;
    try {
      // Send request to Vercel API. The API will securely fetch tokens and insert the DB notification.
      await fetch('https://citymap.mx/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          type,
          user_id,
          secret: import.meta.env.VITE_ADMIN_SECRET
        })
      });
    } catch (err) {
      console.warn("Error enviando push notification:", err);
    }
  },


  // ── Auth ──
  async signUp(email, password, name) {
    const r = await fetch(`${_AUTH}/signup`, {
      method: "POST", headers: sb.authHeaders(),
      body: JSON.stringify({ email, password, data: { name } }),
    });
    const d = await sb._json(r);
    if (d?.error) throw new Error(d.error?.message || d.error || "Error al registrarse");
    const token = d?.access_token || d?.session?.access_token;
    const rt = d?.refresh_token || d?.session?.refresh_token;
    if (token) {
      sb._token = token;
      localStorage.setItem("cg_t", token);
      if (rt) localStorage.setItem("cg_r", rt);
    } else if (d?.user && !token) {
      throw new Error("Revisa tu email para confirmar la cuenta antes de entrar");
    }
    return d;
  },
  async signIn(email, password) {
    const r = await fetch(`${_AUTH}/token?grant_type=password`, {
      method: "POST", headers: sb.authHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const d = await sb._json(r);
    if (d?.error || d?.error_description) {
      const msg = (d.error_description || d.error || "").toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) throw new Error("Confirma tu email antes de iniciar sesión");
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) throw new Error("Email o contraseña incorrectos");
      throw new Error(d.error_description || d.error || "Error al iniciar sesión");
    }
    if (!d?.access_token) throw new Error("No se pudo iniciar sesión, intenta de nuevo");
    sb._token = d.access_token;
    localStorage.setItem("cg_t", d.access_token);
    if (d.refresh_token) localStorage.setItem("cg_r", d.refresh_token);
    return d;
  },
  async signOut() {
    try { await fetch(`${_AUTH}/logout`, { method: "POST", headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${sb._token}` } }); } catch { }
    sb._token = null;
    localStorage.removeItem("cg_t");
    localStorage.removeItem("cg_r");
  },
  async signInWithOAuth(provider) {
    if (!navigator.onLine) {
      alert("Necesitas conexión a internet para iniciar sesión.");
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Usar App Link nativo con esquema personalizado para evitar errores de intercepción en Android
      const redirectTo = encodeURIComponent('mx.citymap.app://login');
      const url = `${_AUTH}/authorize?provider=${provider}&redirect_to=${redirectTo}`;
      const { Browser } = await import('@capacitor/browser');
      // Listen for browser close as a fallback
      const closeListener = await Browser.addListener('browserFinished', async () => {
        closeListener.remove();
        setTimeout(async () => {
          const tok = localStorage.getItem("cg_t");
          if (tok) window.location.reload();
        }, 500);
      });
      await Browser.open({ url });
    } else {
      const redirectTo = encodeURIComponent(window.location.origin);
      const url = `${_AUTH}/authorize?provider=${provider}&redirect_to=${redirectTo}`;
      
      // Use popup for PWA/Web to avoid iOS Safari kicking out of standalone mode
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(url, 'oauth', `width=${width},height=${height},left=${left},top=${top}`);
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback if popups are blocked
        window.location.href = url;
        return;
      }

      // Poll to see if the popup completed login and saved the token
      const checkInterval = setInterval(() => {
        if (localStorage.getItem("cg_t")) {
          clearInterval(checkInterval);
          if (!popup.closed) popup.close();
          window.location.reload();
        }
        if (popup.closed) {
          clearInterval(checkInterval);
        }
      }, 500);
    }
  },
  async setSessionFromUrl(url) {
    if (!url || !url.includes("access_token=")) return false;
    const hash = url.split('#')[1];
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const rt = params.get("refresh_token");
    if (token) {
      sb._token = token;
      localStorage.setItem("cg_t", token);
      if (rt) localStorage.setItem("cg_r", rt);
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      } catch (e) {}
      return true;
    }
    return false;
  },
  parseOAuthHash() {
    if (!window.location.hash || !window.location.hash.includes("access_token=")) return false;
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("access_token");
    const rt = params.get("refresh_token");
    if (token) {
      sb._token = token;
      localStorage.setItem("cg_t", token);
      if (rt) localStorage.setItem("cg_r", rt);
      // Limpiar hash de la URL
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      
      // If we are in a popup (from PWA OAuth), close it
      if (window.opener && window.opener !== window) {
        window.close();
      }
      return true;
    }
    return false;
  },
  async refresh() {
    const rt = localStorage.getItem("cg_r");
    if (!rt) return null;
    try {
      const r = await fetch(`${_AUTH}/token?grant_type=refresh_token`, {
        method: "POST", headers: sb.authHeaders(), body: JSON.stringify({ refresh_token: rt }),
      });
      const d = await sb._json(r);
      if (!d?.access_token) { localStorage.removeItem("cg_t"); localStorage.removeItem("cg_r"); return null; }
      sb._token = d.access_token;
      localStorage.setItem("cg_t", d.access_token);
      if (d.refresh_token) localStorage.setItem("cg_r", d.refresh_token);
      return d;
    } catch (e) {
      console.warn("Refresh failed (offline?):", e);
      throw e;
    }
  },
  async updateUser(data) {
    const tok = sb._token || localStorage.getItem("cg_t");
    if (!tok) throw new Error("No hay sesión activa");
    const r = await fetch(`${_AUTH}/user`, {
      method: "PUT", headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await sb._json(r);
    if (!r.ok) throw new Error(d?.message || d?.error_description || d?.error || "Error actualizando perfil");
    return d;
  },
  async getUser() {
    const tok = sb._token || localStorage.getItem("cg_t");
    if (!tok) return null;

    try {
      const p = JSON.parse(atob(tok.split('.')[1]));
      
      if (p.exp * 1000 < Date.now()) {
        const d = await sb.refresh();
        return d?.user || null;
      }

      sb._token = tok;
      
      // Token is valid! Return the user instantly without a network request.
      // This prevents the user from being "logged out" due to slow/no network on app start.
      return {
        id: p.sub,
        email: p.email,
        user_metadata: p.user_metadata || {},
        app_metadata: p.app_metadata || {}
      };
    } catch (e) {
      console.warn("JWT parse error, falling back to server", e);
    }

    sb._token = tok;
    try {
      const r = await fetch(`${_AUTH}/user`, { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${tok}` } });
      if (r.status === 401) return await sb.refresh().then(d => d?.user || null);
      if (!r.ok) return null;
      return sb._json(r);
    } catch { return null; }
  },
};

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
async function cloudUpload(file, onPct, folder = "cityguide") {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY_PRESET); fd.append("folder", folder);
  return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`); x.upload.onprogress = e => e.lengthComputable && onPct(Math.round(e.loaded / e.total * 100)); x.onload = () => { const d = JSON.parse(x.responseText); d.secure_url ? res(d.secure_url) : rej(new Error(d.error?.message)); }; x.onerror = () => rej(new Error("Error de red")); x.send(fd); });
}
async function cloudUploadPDF(file, onPct) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  fd.append("folder", "cityguide/menus");
  fd.append("resource_type", "raw");
  fd.append("public_id", file.name.replace(/\.pdf$/i, ""));
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`);
    x.upload.onprogress = e => e.lengthComputable && onPct(Math.round(e.loaded / e.total * 100));
    x.onload = () => {
      const d = JSON.parse(x.responseText);
      if (d.secure_url) {
        const url = d.secure_url.endsWith(".pdf") ? d.secure_url : d.secure_url + ".pdf";
        res(url);
      } else {
        rej(new Error(d.error?.message));
      }
    };
    x.onerror = () => rej(new Error("Error de red"));
    x.send(fd);
  });
}

export { sb, cloudUpload, cloudUploadPDF, SUPABASE_URL, SUPABASE_ANON, CLOUDINARY_CLOUD, CLOUDINARY_PRESET, GMAPS_KEY };