// ============================================================
// Relleno de plantillas de mensaje.
//
// Estaba escrito a mano dentro de CrmTab, así que el calendario no
// podía reutilizarlo y las variables disponibles no estaban
// documentadas en ningún sitio. Aquí queda una sola definición.
// ============================================================

export interface TemplateContext {
  /** Nombre completo del cliente. Se usa solo el primero al rellenar. */
  nombre?: string;
  producto?: string;
  /** Monto de la cuota concreta, ya formateado. */
  cuota?: string;
  /** Saldo o monto financiado, ya formateado. */
  monto?: string;
  /** Fecha de vencimiento, ya formateada. */
  fecha?: string;
  /** "Cuota 2 de 6" o "Inicial". */
  detalle?: string;
  /** Días de atraso, si aplica. */
  dias?: string;
}

/** Variables que se pueden usar dentro del cuerpo de una plantilla. */
export const TEMPLATE_VARS: { clave: string; descripcion: string }[] = [
  { clave: '{nombre}',   descripcion: 'Primer nombre del cliente' },
  { clave: '{producto}', descripcion: 'Producto financiado' },
  { clave: '{cuota}',    descripcion: 'Monto de la cuota' },
  { clave: '{monto}',    descripcion: 'Saldo pendiente' },
  { clave: '{fecha}',    descripcion: 'Fecha de vencimiento' },
  { clave: '{detalle}',  descripcion: 'Ej: "Cuota 2 de 6"' },
  { clave: '{dias}',     descripcion: 'Días de atraso' },
];

/**
 * Sustituye las variables de una plantilla.
 * Lo que no se conoce se deja vacío en vez de dejar el `{marcador}` a la
 * vista: es preferible una frase incompleta a mandarle al cliente algo
 * que parece un error del sistema.
 */
export function fillTemplate(body: string, ctx: TemplateContext): string {
  const primerNombre = (ctx.nombre ?? '').trim().split(/\s+/)[0] ?? '';
  const mapa: Record<string, string> = {
    nombre: primerNombre,
    producto: ctx.producto ?? '',
    cuota: ctx.cuota ?? '',
    monto: ctx.monto ?? '',
    fecha: ctx.fecha ?? '',
    detalle: ctx.detalle ?? '',
    dias: ctx.dias ?? '',
  };
  return body
    .replace(/\{(\w+)\}/g, (coincidencia, clave: string) =>
      clave in mapa ? mapa[clave] : coincidencia,
    )
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
