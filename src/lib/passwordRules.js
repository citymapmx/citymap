// Reglas de contraseña de CityMap: las mismas al registrarse y al crear
// una contraseña nueva desde el enlace de recuperación. `key`/`fallback`
// son las etiquetas que se muestran (se traducen con t() donde se usan).
export const PW_RULES = [
  { id: 'len', key: 'modal_pw_min_8', fallback: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', key: 'modal_pw_mayuscula', fallback: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', key: 'modal_pw_minuscula', fallback: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { id: 'num', key: 'modal_pw_numero', fallback: 'Un número', test: (p) => /\d/.test(p) },
];

export function checkPassword(pw) {
  const results = PW_RULES.map((r) => ({ ...r, ok: r.test(pw || '') }));
  return { results, allValid: results.every((r) => r.ok) };
}
