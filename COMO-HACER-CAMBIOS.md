# Cómo aplicar cambios a tu CRM sin romperlo

Guía general. Sirve para esta implementación y para las que vengan.

---

## La regla que te habría ahorrado esta semana

**Un cambio a la vez. Probar. Después el siguiente.**

Lo que pasó ahora: la carpeta de Claude Design traía **tres cosas distintas mezcladas** —
diseño, mapas, y multi-empresa. Las aplicaste juntas, se rompió, y no había forma de saber
cuál de las tres fue. Eso no es falta de habilidad tuya: es que tres cambios simultáneos
producen un solo síntoma.

Si las hubieras aplicado por separado, en 10 minutos sabías cuál fue.

---

## Los 3 tipos de cambio, de menos a más peligroso

Antes de tocar nada, clasifica lo que te dieron. Todo cambio cae en uno de estos:

### Tipo 1 — Solo código de pantalla (bajo riesgo)

Colores, estilos, textos, cómo se ve un componente.
Archivos: `src\components\*.tsx`, `src\index.css`, `tailwind.config.js`

- **Se deshace fácil.** Copias el archivo viejo de vuelta y ya.
- No necesita nada más.

### Tipo 2 — Librerías nuevas (riesgo medio)

Cuando el `package.json` cambió. Ejemplo: los mapas trajeron `leaflet`.

- **Señal:** aparecen líneas nuevas en `package.json`.
- **Requiere:** correr `npm install` antes de que el código funcione.
- Si no lo corres: error tipo *"Failed to resolve import 'leaflet'"*.

### Tipo 3 — Cambios de base de datos (alto riesgo, IRREVERSIBLE)

Cuando aparecen archivos `.sql` nuevos en `supabase\migrations\`.

- **Se deshace difícil o no se deshace.** Necesitas un respaldo previo, sí o sí.
- **Requiere:** correrlo a mano en el SQL Editor de Supabase.
- Si no lo corres: el código pide tablas que no existen y todo falla.

---

## El orden correcto

```
1. RESPALDO        (código + base de datos)
2. BASE DE DATOS   (los .sql, si hay)
3. LIBRERÍAS       (npm install, si package.json cambió)
4. CÓDIGO          (copiar los archivos)
5. PROBAR
```

**Por qué ese orden y no otro:** el código nuevo da por sentado que la base de datos y las
librerías ya existen. Si copias el código primero, todo revienta al mismo tiempo y no puedes
distinguir qué falló. Preparas el terreno, y el código llega de último a algo que ya está listo.

**La excepción:** si el cambio es puro Tipo 1 (solo diseño), sáltate los pasos 2 y 3. Copiar,
mirar, listo.

---

## Las 3 preguntas antes de aplicar nada

Hazlas siempre. A mí, o a quien te pase el código:

1. **¿Esto toca la base de datos?** Si sí → respaldo obligatorio, y quiero el SQL aparte.
2. **¿Necesita librerías nuevas?** Si sí → ¿cuáles, y ya están en el `package.json`?
3. **¿Qué se rompe si lo aplico a medias?** La respuesta te dice si puedes hacerlo por partes
   o si es todo-o-nada.

Si quien te da el código no puede responder las tres, todavía no está listo para aplicarse.

---

## Cómo probar que quedó bien

Después de cualquier cambio, en este orden. Si uno falla, párate ahí.

**1. ¿Compila?** Ventana negra en la carpeta del proyecto:

```
npm run build
```

Si sale error, es de código. El mensaje te dice el archivo y la línea.

**2. ¿Arranca?** Doble clic en `INICIAR-CRM.bat`. Debe abrir el navegador y verse el login.

**3. ¿Funciona lo de siempre?** Recorrido corto, 2 minutos:

- [ ] Entro con mi usuario
- [ ] El Dashboard carga con datos (no en cero)
- [ ] Abro CRM y veo mis clientes
- [ ] Abro un cliente y sus datos están completos
- [ ] Creo algo de prueba y lo borro
- [ ] Facturación e Inventario cargan
- [ ] **F12 → Console: no hay nada en rojo**

Ese último punto es el que más gente se salta y el que más problemas atrapa.

**4. ¿Funciona lo nuevo?** Recién ahora prueba la función que agregaste.

---

## Cómo pedir los cambios para que sean fáciles de aplicar

Esto es lo que más te va a ayudar a futuro. Cuando pidas trabajo sobre el CRM, pide esto:

> "Sepáralo por riesgo: primero lo que es solo diseño, aparte lo que necesita librerías nuevas,
> y aparte lo que toca la base de datos. Dime explícitamente qué necesita cada parte además del
> código, y en qué orden aplicarlas."

Y cuando te entreguen una carpeta completa, pregunta:

> "¿Qué cambió respecto a lo que ya tengo, y qué de eso puedo aplicar sin tocar la base de datos?"

Con eso conviertes un bulto imposible de auditar en 3 pasos que puedes probar uno por uno.

---

## Errores comunes y qué significan

| Lo que ves | Qué es | Qué hacer |
|---|---|---|
| Pantalla en blanco total | Un componente se cayó | F12 → Console. (Ya no debería pasar: pusimos el ErrorBoundary) |
| "Failed to resolve import 'X'" | Falta una librería | `npm install` |
| "column X does not exist" | Falta correr una migración | Corre el `.sql` en Supabase |
| "No se pudieron cargar los datos" | Supabase respondió con error | Revisa permisos (RLS) o conexión |
| "Falta la configuración de Supabase" | El `.env` no se está leyendo | Verifica que se llame `.env` y no `.env.txt` |
| Todo se ve sin estilos | Tailwind no compiló | Reinicia el servidor |

---

## Reglas de oro

1. **Respaldo antes de tocar la base de datos.** Siempre. Sin excepción.
2. **Un cambio a la vez.** Si algo se rompe, sabes exactamente qué fue.
3. **F12 → Console** es tu mejor herramienta. Ahí está el error de verdad, no en la pantalla.
4. **Si no entiendes qué hace un cambio, no lo apliques todavía.** Pregunta primero.
   No es lentitud, es lo correcto.
5. **Guarda el error completo, no lo resumas.** El texto exacto es lo que permite diagnosticar.
