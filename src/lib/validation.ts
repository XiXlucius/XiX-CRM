// ============================================================
// Validación de contraseña — fuente única de verdad.
// Usada por PasswordRequirements.tsx (feedback visual en vivo) y por el
// submit de AuthScreen.tsx / ResetPasswordScreen.tsx (bloqueo real).
// ============================================================

export interface PasswordRule {
  id: string;
  label: string;
  test: (v: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'upper',  label: 'Una letra mayúscula',  test: (v) => /[A-Z]/.test(v) },
  { id: 'lower',  label: 'Una letra minúscula',  test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'Un número',            test: (v) => /\d/.test(v) },
];

/**
 * Devuelve la lista de reglas incumplidas por `v`. Array vacío = contraseña
 * válida. Se usa para bloquear el submit en registro y cambio de
 * contraseña — NUNCA en el login (las cuentas existentes tienen
 * contraseñas de 6 caracteres y deben seguir pudiendo entrar).
 */
export function validatePassword(v: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(v)).map((rule) => rule.label);
}
