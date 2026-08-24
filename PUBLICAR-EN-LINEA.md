# Publicar el CRM en línea

Se hace **una sola vez**. Después de esto, cada vez que corras
`GUARDAR-PROGRESO.bat`, la página en línea se actualiza sola en uno o dos
minutos — no hay que repetir estos pasos.

Son tres partes: subir el código a GitHub, conectarlo a Vercel (quien lo
publica), y avisarle a Supabase cuál es la dirección nueva.

---

## Parte 1 — Subir el código a GitHub

GitHub es donde vive el código en línea. Vercel lo lee de ahí para publicarlo.

1. Si no tienes cuenta, créala gratis en **github.com** (botón "Sign up").
2. Descarga e instala **GitHub Desktop**: [desktop.github.com](https://desktop.github.com)
   — es un programa con botones, no hay que escribir comandos.
3. Ábrelo e inicia sesión con tu cuenta de GitHub (abre el navegador, un clic).
4. **File → Add local repository**. Selecciona la carpeta de este proyecto
   (`Desktop\Lucius\project`).
5. Va a aparecer un botón azul que dice **Publish repository**. Púlsalo.
   - Marca la casilla **"Keep this code private"** — es tu sistema de
     negocio, no hace falta que sea público.
6. Espera a que termine. Ya tu código está en GitHub.

> A partir de aquí, `GUARDAR-PROGRESO.bat` sube los cambios solo. No necesitas
> volver a abrir GitHub Desktop salvo que algo falle.

---

## Parte 2 — Conectar Vercel (quien publica la página)

1. Entra a **vercel.com** → **"Continue with GitHub"** (usa la misma cuenta,
   no crea una contraseña nueva).
2. **Add New... → Project**.
3. Busca este repositorio en la lista y dale **Import**.
4. Vercel va a detectar solo que es un proyecto Vite — no cambies nada de
   esa sección.
5. **Antes de darle a Deploy**, busca la sección **Environment Variables** y
   agrega las mismas dos líneas que tienes en tu archivo `.env` de esta
   carpeta (ábrelo con el Bloc de notas para copiarlas):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | (la de tu `.env`) |
   | `VITE_SUPABASE_ANON_KEY` | (la de tu `.env`) |

   Sin este paso, la página publicada no va a poder hablar con tu base de
   datos.

6. Botón **Deploy**. Tarda uno o dos minutos.
7. Al terminar te da una dirección tipo `algo.vercel.app` — esa es tu CRM en
   línea. Ábrela y confirma que carga.

---

## Parte 3 — Avisarle a Supabase la dirección nueva

Un paso chiquito que si se salta, cosas como "olvidé mi contraseña" fallarían
más adelante (aunque hoy no las estés usando).

1. En Supabase: **Authentication → URL Configuration**.
2. **Site URL**: pega tu dirección de Vercel (`https://algo.vercel.app`).
3. **Redirect URLs**: agrega esa misma dirección.
4. Guarda.

---

## Una aclaración importante

Esto **no es un ambiente de prueba separado**. La página en línea y lo que
corres en tu computadora con `INICIAR-CRM.bat` usan la **misma base de
datos** — los mismos clientes, las mismas facturas. No es que uno sea
"real" y el otro "de práctica": son la misma información vista desde dos
puertas distintas.

## Opcional: dominio propio

Por defecto queda en `algo.vercel.app`. Si más adelante quieres algo como
`crm.xixtech.com`, se compra el dominio aparte y se conecta en Vercel →
Settings → Domains. No es necesario para arrancar.
