---
name: Capacitor y Arquitectura Híbrida
description: Reglas estrictas para el desarrollo de apps móviles con Capacitor (Android/iOS) y Supabase.
---

# Reglas Críticas para Capacitor

1. **Peticiones de Red (API Fetching) en Modo Local:**
   - Si una app de Capacitor no usa un `server.url` remoto (es decir, corre de manera nativa y offline desde el dispositivo), **nunca** uses rutas relativas en los `fetch` (ej. `fetch('/api/send-notification')`).
   - Las rutas relativas colapsarán buscando `capacitor://localhost/api/...`. 
   - **Solución Obligatoria:** Todas las llamadas a APIs externas o endpoints de Vercel/Node deben usar rutas **absolutas** (ej. `fetch('https://citymap.mx/api/send-notification')`).

2. **Redirecciones OAuth (App Links vs Custom Schemes):**
   - En Android, usar App Links (`https://midominio.com`) para interceptar el regreso de un inicio de sesión de Supabase/OAuth a menudo falla en entornos de desarrollo o si las firmas (Digital Asset Links) no están perfectamente configuradas.
   - **Solución Obligatoria:** Para entornos híbridos, configura y utiliza siempre un **Custom URL Scheme** (ej. `mx.citymap.app://login`) en la configuración de Supabase (`redirectTo`) y en el `AndroidManifest.xml`. Esto fuerza a Android a cerrar el navegador web y regresar a la app de inmediato.

3. **Uso de Alertas Nativas:**
   - En Capacitor/Android, el uso de funciones globales del navegador como `confirm()` puede fallar silenciosamente. 
   - **Solución Obligatoria:** Siempre debes utilizar el prefijo explícito `window.confirm()` o, preferentemente, los diálogos nativos de `@capacitor/dialog`.

4. **Análisis de Impacto Obligatorio:**
   - Antes de modificar archivos de configuración de red (como `capacitor.config.json`, CORS, o redirecciones de OAuth), debes usar `grep_search` para escanear todo el código base en busca de rutas `/api/` o endpoints que dependan de la configuración actual, para parchearlos preventivamente.
