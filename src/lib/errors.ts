// ============================================================
// Traducción de errores a mensajes legibles en español.
// Nunca expone detalles internos de la base de datos al usuario.
// ============================================================

const SUPA_AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials':                 'Credenciales inválidas. Verifica email y contraseña.',
  'User already registered':                   'Ese correo ya está registrado.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Password should be at least 8 characters.': 'La contraseña debe tener al menos 8 caracteres.',
  'Email rate limit exceeded':                 'Demasiados intentos. Espera unos minutos.',
  'Email not confirmed':                       'Tu cuenta no está confirmada. Contacta al administrador.',
};

// Códigos de error de Postgres/PostgREST (Supabase) más comunes.
const POSTGRES_CODES: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos (duplicado).',
  '23503': 'No se puede completar: el registro está relacionado con otros datos.',
  '23502': 'Falta un dato obligatorio.',
  '42501': 'No tienes permiso para realizar esta acción.',
  'PGRST116': 'No se encontró el registro solicitado.',
};

function hasCode(err: unknown): err is { code: string; message?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function hasMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string';
}

/**
 * Traduce cualquier error (Supabase auth, Postgres/PostgREST, red, o un
 * Error genérico de JS) a un mensaje corto y claro en español. Es la única
 * función que debe decidir qué texto de error ve el usuario — nunca se
 * expone el mensaje crudo de la base de datos.
 */
export function friendlyError(err: unknown): string {
  // Sin conexión / fetch fallido
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return 'No hay conexión a internet. Verifica tu red e intenta de nuevo.';
  }

  if (hasCode(err) && POSTGRES_CODES[err.code]) {
    return POSTGRES_CODES[err.code];
  }

  if (hasMessage(err)) {
    if (SUPA_AUTH_ERRORS[err.message]) return SUPA_AUTH_ERRORS[err.message];
    // Mensajes de Supabase ya en español o suficientemente cortos y sin
    // detalles técnicos (nombres de tabla, columnas, SQL) se muestran tal
    // cual; el resto cae al fallback genérico.
    const looksTechnical = /relation|column|syntax|constraint|violates|null value|duplicate key/i.test(err.message);
    if (!looksTechnical && err.message.length < 120) return err.message;
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
