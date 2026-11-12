// Marca en este dispositivo de que ya se inició sesión alguna vez en CityMap.
// Se pone al primer inicio de sesión exitoso (email, Google o restauración
// de sesión tras OAuth o deep link) y SOBREVIVE al cierre de sesión: un
// usuario que vuelve debe seguir viendo «¡Hola de nuevo!» y el modal en modo
// login. Es una señal por dispositivo, no por cuenta: alguien con cuenta que
// abre CityMap en un teléfono nuevo verá «¡Bienvenido a CityMap!» una vez
// en ese dispositivo, y el cambio manual de modo del modal lo deja pasar a
// login de inmediato.
export const HAS_ACCOUNT_KEY = "cg_has_account";

export function markDeviceHasAccount() {
  try {
    localStorage.setItem(HAS_ACCOUNT_KEY, "1");
  } catch {
    // Sin almacenamiento (navegación privada estricta, SSR): el saludo
    // simplemente vuelve a ser de primera vez; nunca bloquea el login.
  }
}

export function deviceHasAccount() {
  try {
    return localStorage.getItem(HAS_ACCOUNT_KEY) === "1";
  } catch {
    return false;
  }
}
