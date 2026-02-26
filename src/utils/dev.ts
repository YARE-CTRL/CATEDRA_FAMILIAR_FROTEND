// Util para modo de desarrollo: permitir desactivar validaciones localmente.
export function isBypassValidationsEnabled(): boolean {
  // Habilitar bypass para pruebas locales (desactiva validaciones como reCAPTCHA)
  return true;
}

export function enableBypassValidationsForSession(enable = true) {
  // Deshabilitado - no se permite activar bypass
  console.warn('Bypass de validaciones está deshabilitado. Solo se usan datos del backend.');
}
