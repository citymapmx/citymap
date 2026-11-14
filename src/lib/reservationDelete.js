// Borrado (soft-delete) de una reservación desde el panel del dueño
// (nov 2026, reporte de Jonathan: tocar la papelera «no hacía nada»).
//
// Dos trampas en el camino viejo (`ReservationsAgenda.deleteRes`):
// 1. Dependía de `window.confirm`: si el diálogo no aparece en el
//    WebView de la app, el tap vuelve en silencio sin ningún aviso y
//    el dueño cree que la papelera no funciona. Por eso el borrado
//    ahora pide confirmación dentro de la propia fila (sin diálogos
//    nativos), igual en navegador y en app.
// 2. El PATCH de PostgREST devuelve 200 con `[]` cuando RLS no aplica
//    la actualización, sin error: el borrado parecía hecho y la fila
//    volvía al recargar. Aquí se verifica por relectura que el estado
//    quedó en "deleted" antes de darlo por hecho (regla del repo:
//    verificar writes por relectura, nunca por el reporte del PATCH).
export async function softDeleteReservation(sbClient, id) {
  try {
    await sbClient.patch("reservations", id, { status: "deleted" });
    const rows = await sbClient.get("reservations", `?id=eq.${id}&select=status`);
    const status = Array.isArray(rows) ? rows[0]?.status : rows?.status;
    if (status !== "deleted") return { ok: false, reason: "sin-cambios" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: "error", error: err };
  }
}
