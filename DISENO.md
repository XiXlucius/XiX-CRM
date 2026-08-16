# Guía de diseño — qué puedes tocar sin romper nada

Documento vivo. Este describe **cómo está el sistema hoy**. Los `HANDOFF-*.md` son
historia: los escribieron sesiones anteriores y algunos ya no coinciden con la realidad.

---

## La superficie de diseño son 4 archivos

Todo lo visual del CRM vive aquí. Si solo tocas estos, **es imposible romper la lógica
de negocio, la base de datos o los permisos**:

| Archivo | Qué controla |
|---|---|
| `src/index.css` | Colores, tarjetas, botones, inputs, glows, keyframes de animación |
| `tailwind.config.js` | Paleta, sombras, espaciado, tipografía |
| `src/components/ParticleField.tsx` | La constelación de fondo |
| `src/lib/neonSweep.ts` | Desincronización del barrido neón |

## Lo que NO se toca por un cambio visual

Si un cambio de diseño te pide editar alguno de estos, algo va mal en el enfoque:

- `src/store.tsx` — todas las consultas a la base de datos
- `src/context/OrgContext.tsx`, `AuthContext.tsx` — sesión y permisos
- `src/lib/supabase.ts` — conexión
- `supabase/migrations/*.sql` — estructura de la base de datos
- `.env` — credenciales

**Regla:** si el archivo tiene la palabra `supabase`, `store`, `context` o `migration`,
no es diseño.

---

## Las perillas — cambios sin tocar código de verdad

### Intensidad global del neón

En `src/index.css`, cerca del inicio:

```css
--neon: 1;        /* 0 = apagado · 1 = normal · 1.5 = más brillo */
```

Un solo número. Afecta halos, resplandores de fondo, glow de títulos y cifras.

### Apagar el barrido neón de los títulos

En `src/lib/neonSweep.ts`, comenta esta línea:

```ts
document.documentElement.classList.add('neon-titles');
```

Sin esa clase, los títulos vuelven a color sólido con halo. El barrido sigue
funcionando en los elementos que lleven la clase `.ntNeonBg` a mano (el logo del
sidebar y el título del login).

### Colores del resplandor

```css
--glow-accent: #9184d9;   /* violeta principal */
--glow-cool:   #00d4ff;   /* cian del fondo */
--glow-violet: #7c3aed;   /* violeta del fondo */
```

### Densidad de la constelación

En `ParticleField.tsx`, arriba del todo:

```ts
const PRESETS = {
  login: { count: 70, speed: 0.16, lineDist: 130, lineAlpha: 0.22, dotAlpha: 0.75 },
  app:   { count: 34, speed: 0.09, lineDist: 110, lineAlpha: 0.10, dotAlpha: 0.40 },
};
```

- `count` — cuántas partículas
- `speed` — qué tan rápido derivan
- `lineDist` — a qué distancia se conectan entre sí
- `lineAlpha` / `dotAlpha` — opacidad de líneas y puntos

Y la gravedad del cursor (atrae las partículas hacia el mouse):

```ts
const GRAVITY_RADIUS = 230;   // radio de influencia en px
const GRAVITY = 0.05;         // fuerza del tirón — más alto, más agresivo
const DEAD_ZONE = 26;         // no colapsan sobre el puntero
const RELAX = 0.035;          // rapidez con que vuelven a su deriva normal
const MAX_SPEED = 3.2;        // tope, para que nada salga disparado
```

Login y menú principal usan el mismo preset a propósito.

### Ritmo del láser en los títulos

En `src/lib/neonSweep.ts`:

```ts
const SWEEP_MIN = 3.4;    // cuánto tarda en cruzar  →  3.4s a 6.0s
const SWEEP_RANGE = 2.6;

const GAP_MIN = 7;        // cuánto descansa entre cruces  →  7s a 23s
const GAP_RANGE = 16;
```

Sube `GAP_MIN` si aparece demasiado seguido. Sube `SWEEP_MIN` si quieres que
cruce más despacio.

---

## Cómo hacer cambios sin arriesgar nada

Usa una **rama de git**. Es una copia paralela: experimentas ahí, y si no te gusta,
vuelves al original como si nada hubiera pasado.

Te dejé `PROBAR-DISENO.bat` que lo hace por ti con un menú de tres opciones:

1. **Empezar una prueba** — crea la rama y te deja experimentar
2. **Conservar los cambios** — los pasa a la versión buena
3. **Descartar todo** — vuelve al estado anterior, como si nunca hubieras tocado nada

Mientras estés en la rama de prueba, **la versión que funciona sigue intacta**.
Y la documentación (todos los `.md`) tampoco se toca: un cambio visual nunca
debería editar un `.md`.

### Ciclo recomendado

```
1. PROBAR-DISENO.bat  →  opción 1 (empezar)
2. Editar index.css / tailwind.config.js / ParticleField.tsx
3. Mirar en el navegador (Ctrl + Shift + R)
4. ¿Gusta?  →  PROBAR-DISENO.bat  →  opción 2 (conservar)
   ¿No?     →  PROBAR-DISENO.bat  →  opción 3 (descartar)
```

---

## Verificación después de cualquier cambio visual

Dos minutos, y atrapa casi todo:

- [ ] La app abre y se ve el login
- [ ] Entro y el Dashboard carga
- [ ] El texto se lee — sin títulos invisibles ni contraste imposible
- [ ] Paso el mouse por el fondo y las partículas reaccionan
- [ ] **F12 → Console: nada en rojo**

> Sobre los títulos invisibles: pasó hoy. El barrido neón usa
> `background-clip: text` con `color: transparent`. Si el degradado no pinta, el texto
> **desaparece**. Por eso ahora va como clase opt-in (`.ntNeonBg`) con color de respaldo
> y no aplicado globalmente a todos los `h1`/`h2`. No lo vuelvas a poner global.

---

## Sobre la documentación

**Este archivo (`DISENO.md`) es el que refleja la realidad.** Manténlo tú, o pídeme
que lo actualice cuando cambiemos algo visual.

**Los `HANDOFF-*.md` son historia, no verdad.** Están escritos en pasado por sesiones
anteriores y hoy comprobamos que varios afirman cosas que no eran ciertas:

- `HANDOFF-COMPLETO-PARA-CLAUDE-CODE.md` § 6 describe efectos que **no estaban** en el
  código real, solo en el prototipo HTML. Se aplicaron hoy.
- La migración multi-empresa venía marcada como *"nunca se ejecutó contra una base de
  datos real"* — y tenía **tres bugs** que solo salieron al correrla de verdad: una
  función definida antes que su columna, un usuario que no podía crear su membresía, y
  un dueño que no podía leer su propia organización.

Si un handoff y el código se contradicen, **gana el código**. Verifícalo antes de
darlo por cierto.

---

## Historial de cambios visuales

| Fecha | Qué cambió |
|---|---|
| 14/08/2026 | Neón restaurado sobre Nocturne: glassmorphism, resplandores de fondo, halos en botones |
| 14/08/2026 | Efectos del prototipo (§ 6): constelación con repulsión al mouse, barrido láser, slide-ins, glow del calendario, logo de constelación |
| 14/08/2026 | Barrido láser pasa de global en `h1`/`h2` a clase opt-in — evitaba títulos invisibles |
