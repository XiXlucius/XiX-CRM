// ============================================================
// Convierte el currículo exportado de Notion (carpeta "XiX Tech")
// en el archivo src/educationContent.ts que consume el CRM.
//
// Se corre a mano cuando cambie el material:
//   node scripts/importar-curriculo.mjs "<ruta a la carpeta XiX Tech>"
//
// Por qué un script y no copiar a mano: son ~130 lecciones. Copiarlas
// una vez sería lento; copiarlas cada vez que Lucius edite Notion,
// insostenible.
// ============================================================

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const RAIZ = process.argv[2];
const SALIDA = process.argv[3] ?? 'src/educationContent.ts';

if (!RAIZ) {
  console.error('Uso: node scripts/importar-curriculo.mjs "<carpeta XiX Tech>" [salida]');
  process.exit(1);
}

/** Notion pone un id largo al final de cada nombre. Se quita. */
function limpiarNombre(n) {
  return n
    .replace(/\.html$/i, '')
    .replace(/\s+[0-9a-f]{20,}$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Quita el prefijo "Lección 3;" / "Clase 2;" / "Lección 4 —" del título. */
function limpiarTituloLeccion(n) {
  return n
    .replace(/^(lecci[oó]n|clase|bonus)\s*\d*\s*[;:—-]?\s*/i, '')
    .trim() || n;
}

/** Orden natural: Lección 2 antes que Lección 10. */
function numeroDe(n) {
  const m = /^(?:lecci[oó]n|clase)\s*(\d+)/i.exec(n);
  return m ? Number(m[1]) : 999;
}

// ── Extracción de texto con estructura ──────────────────────
// No se usa un parser de HTML completo a propósito: el export de
// Notion es plano y predecible, y así el script no depende de nada
// que haya que instalar.

const BLOQUE = /<\/?(p|div|h[1-6]|li|tr|br|table|ul|ol|blockquote)\b[^>]*>/gi;

function extraerTexto(rutaHtml) {
  let s = readFileSync(rutaHtml, 'utf8');
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  // El encabezado de Notion repite el título y mete migas de pan.
  s = s.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  s = s.replace(BLOQUE, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = desescapar(s);

  const lineas = s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Notion parte el texto en trozos por cada negrita o cursiva. Se
  // vuelven a unir: un trozo que no termina en signo de puntuación y
  // el siguiente que empieza en minúscula son la misma frase.
  const unidas = [];
  for (const l of lineas) {
    const prev = unidas[unidas.length - 1];
    if (
      prev &&
      !/[.:;!?»)]$/.test(prev) &&
      !/^[-•–]/.test(l) &&
      !/^\d+[).]/.test(l) &&
      prev.length < 400 &&
      (/^[a-záéíóúñ,;)]/.test(l) || prev.length < 40)
    ) {
      unidas[unidas.length - 1] = `${prev} ${l}`;
    } else {
      unidas.push(l);
    }
  }
  return unidas;
}

function desescapar(s) {
  const m = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&nbsp;': ' ', '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í',
    '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ', '&hellip;': '…',
    '&mdash;': '—', '&ndash;': '–', '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”',
  };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&[a-z]+;/gi, (e) => m[e.toLowerCase()] ?? e);
}

/** El primer párrafo largo sirve de resumen; la línea de "Objetivo" es mejor si existe. */
function resumirLeccion(lineas) {
  const obj = lineas.findIndex((l) => /^objetivo/i.test(l));
  if (obj >= 0 && lineas[obj + 1]) return recortar(lineas[obj + 1], 300);
  const largo = lineas.find((l) => l.length > 80);
  return recortar(largo ?? lineas[1] ?? lineas[0] ?? '', 300);
}

/** La frase clave: se busca una "regla de oro" o similar; si no, la primera afirmación fuerte. */
function claveDe(lineas) {
  const patrones = [
    /^regla de oro[:\s]*/i, /^clave[:\s]*/i, /^recuerda[:\s]*/i, /^en resumen[:\s]*/i,
  ];
  for (let i = 0; i < lineas.length; i++) {
    for (const p of patrones) {
      if (p.test(lineas[i])) {
        const resto = lineas[i].replace(p, '').trim();
        return recortar(resto || lineas[i + 1] || lineas[i], 180);
      }
    }
  }
  // Si no hay "regla de oro", se busca una frase con carga de consejo
  // (imperativo o afirmación corta), no el primer párrafo cualquiera.
  const consejo = lineas.find(
    (l) => l.length > 40 && l.length < 200 && /[.!]$/.test(l) &&
      /(nunca|siempre|no |evita|recuerda|primero|antes de|clave|importante|regla)/i.test(l),
  );
  const cand = consejo ?? lineas.find((l) => l.length > 40 && l.length < 200 && /[.!]$/.test(l));
  return recortar(cand ?? lineas[0] ?? '', 180);
}

/** Notion crea una página índice por módulo que solo enumera sus lecciones.
 *  No es contenido: si se importa, aparece como una "lección" que solo dice
 *  "Lección 1 — …, Lección 2 — …". Se detecta y se descarta. */
function esIndice(body) {
  const enumeradas = (body.match(/^lecci[oó]n\s*\d|^clase\s*\d/gim) ?? []).length;
  return enumeradas >= 3;
}

function recortar(s, n) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

function cuerpoDe(lineas) {
  // Se salta el título repetido de las dos primeras líneas.
  const utiles = lineas.slice(lineas[0] === lineas[1] ? 2 : 1);
  return utiles.join('\n');
}

// ── Recorrido de carpetas ───────────────────────────────────

function esDirectorio(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

/** Un curso = una carpeta con archivos .html dentro (cada uno una lección). */
function recolectarCursos(dir, ruta = []) {
  const cursos = [];
  for (const nombre of readdirSync(dir).sort()) {
    const p = join(dir, nombre);
    if (!esDirectorio(p)) continue;

    const htmls = readdirSync(p).filter((f) => f.toLowerCase().endsWith('.html'));
    const subdirs = readdirSync(p).filter((f) => esDirectorio(join(p, f)));

    if (htmls.length > 0) {
      const lecciones = htmls
        .map((f) => ({ archivo: f, limpio: limpiarNombre(f) }))
        .sort((a, b) => numeroDe(a.limpio) - numeroDe(b.limpio) || a.limpio.localeCompare(b.limpio))
        .map(({ archivo, limpio }, i) => {
          const lineas = extraerTexto(join(p, archivo));
          return {
            id: `l${i + 1}`,
            title: limpiarTituloLeccion(limpio),
            body: cuerpoDe(lineas),
            keyTakeaway: claveDe(lineas),
            _resumen: resumirLeccion(lineas),
          };
        })
        .filter((l) => l.body.length > 400 && !esIndice(l.body));

      if (lecciones.length > 0) {
        cursos.push({
          titulo: limpiarNombre(nombre),
          area: ruta[0] ?? 'General',
          ruta: [...ruta, limpiarNombre(nombre)],
          lecciones,
        });
      }
    }
    if (subdirs.length > 0) {
      cursos.push(...recolectarCursos(p, [...ruta, limpiarNombre(nombre)]));
    }
  }
  return cursos;
}

// ── Generación del archivo TypeScript ───────────────────────

function cat(area, titulo) {
  const t = `${area} ${titulo}`.toLowerCase();
  if (/cobran|mora|deuda/.test(t)) return 'cobranza';
  if (/objeci|negocia/.test(t)) return 'objeciones';
  if (/pedagog|didác|didact|educa|aprendiz|evaluaci|neuroeduca|tecnolog/.test(t)) return 'formacion';
  if (/marketing|contenido|campañ|canva|capcut|community/.test(t)) return 'marketing';
  return 'ventas';
}

function nivel(area) {
  return /directivo/i.test(area) ? 'avanzado' : 'intermedio';
}

const esc = (s) => JSON.stringify(s);

const cursos = recolectarCursos(RAIZ);

const salida = `// ============================================================
// GENERADO AUTOMÁTICAMENTE — no editar a mano.
// Fuente: currículo de XiX Tech exportado de Notion.
// Para regenerar:
//   node scripts/importar-curriculo.mjs "<carpeta XiX Tech>"
// ============================================================

import type { Course } from './types';

export const CURRICULO: Course[] = [
${cursos.map((c, i) => `  {
    id: ${esc('xix' + (i + 1))},
    title: ${esc(c.titulo)},
    area: ${esc(c.area)},
    category: ${esc(cat(c.area, c.titulo))},
    level: ${esc(nivel(c.area))},
    durationMin: ${Math.max(15, c.lecciones.length * 12)},
    description: ${esc(recortar(c.lecciones[0]._resumen, 240))},
    lessons: [
${c.lecciones.map((l) => `      {
        id: ${esc(l.id)},
        title: ${esc(l.title)},
        body: ${esc(l.body)},
        keyTakeaway: ${esc(l.keyTakeaway)},
      },`).join('\n')}
    ],
  },`).join('\n')}
];
`;

writeFileSync(SALIDA, salida, 'utf8');

console.log(`${cursos.length} cursos, ${cursos.reduce((a, c) => a + c.lecciones.length, 0)} lecciones`);
for (const c of cursos) {
  console.log(`  [${c.area}] ${c.titulo} — ${c.lecciones.length} lecciones`);
}
