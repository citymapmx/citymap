// Optimización de imágenes subidas por el usuario (p. ej. la foto del evento).
// Se aplica antes de subir a Supabase Storage: la librería browser-image-compression
// redimensiona la imagen y la convierte a WebP, para que el archivo pese poco
// sin perder calidad visible. Estas funciones puras resuelven los parámetros y
// deciden si una imagen debe optimizarse; Uploader las usa en goUpload.

// Preset para la foto del evento creado por un usuario: se optimiza SIEMPRE
// (aunque pese poco), máximo 1600 px en el lado largo y calidad 0.82,
// con un tope de 0.8 MB. Un póster de evento se ve a ~900 px como mucho,
// así que 1600 px sobra y el archivo queda en 150-400 KB.
export const EVENT_IMAGE_OPTIMIZE = {
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1600,
  initialQuality: 0.82,
  always: true,
};

// Resuelve los parámetros efectivos de optimización. Sin preset (y sin
// avatarMode) se mantiene el comportamiento histórico: solo se comprime
// si el archivo pasa de 1.5 MB, a 2000 px y calidad 0.95.
export function resolveOptimizeOptions({ avatarMode = false, optimize = null } = {}) {
  if (avatarMode) {
    return { targetMB: 0.1, maxWidthOrHeight: 300, initialQuality: 0.8, always: false };
  }
  return {
    targetMB: optimize?.maxSizeMB ?? 1.5,
    maxWidthOrHeight: optimize?.maxWidthOrHeight ?? 2000,
    initialQuality: optimize?.initialQuality ?? 0.95,
    always: optimize?.always ?? false,
  };
}

// ¿Esta imagen debe pasar por la optimización? Los PDF y SVG nunca se tocan.
// Con `always` se optimiza aunque pese poco (redimensionar + convertir a WebP);
// sin él, solo cuando el archivo supera el tope.
export function shouldOptimizeImage(file, { targetMB = 1.5, always = false } = {}) {
  if (!file || typeof file.type !== 'string') return false;
  if (file.type === 'application/pdf' || file.type === 'image/svg+xml') return false;
  if (!file.type.startsWith('image/')) return false;
  if (always) return true;
  return file.size > targetMB * 1024 * 1024;
}
