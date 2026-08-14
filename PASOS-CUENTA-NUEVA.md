# Montar el CRM en una cuenta de Supabase nueva

Empiezas con una base vacía. La app siembra datos de ejemplo al primer registro,
así que vas a tener un CRM funcional de inmediato.

Tiempo estimado: 15 minutos.

---

## Paso 1 — Crea la cuenta y el proyecto

1. Ve a <https://supabase.com> → botón **Start your project**.
2. Regístrate con el correo o la cuenta que **sí** quieras usar de ahora en adelante.
3. Ya dentro, botón **New project**.
4. Rellena:
   - **Name:** `xixtech-crm`
   - **Database Password:** genera una y **guárdala** (gestor de contraseñas o papel).
     No la vas a necesitar para esto, pero perderla después es un dolor de cabeza.
   - **Region:** la más cercana a Venezuela — `East US (North Virginia)`.
   - **Plan:** Free.
5. Dale a **Create new project** y espera. Tarda 1-2 minutos en aprovisionar.

---

## Paso 2 — Corre el esquema completo

1. Menú izquierdo → **SQL Editor** → botón **New query**.
2. Abre `MIGRACION-CUENTA-NUEVA.sql` (esta carpeta) con el Bloc de notas.
3. **Ctrl + A**, **Ctrl + C**.
4. Pega en el SQL Editor (**Ctrl + V**) → botón **Run**.

Tarda unos segundos. Es un archivo grande — crea 18 tablas, los permisos y el
bucket de archivos.

### Qué debes ver

Una tabla de 18 filas, todas con estado **OK**:

| tabla | estado |
|---|---|
| audit_log | OK |
| bitacora_entries | OK |
| … | OK |

**Si alguna dice `FALTA`**, o sale un recuadro rojo: párate y pásame el texto completo.

> ⚠️ Este archivo es solo para una base **nueva y vacía**. No lo corras nunca
> sobre el proyecto viejo de Bolt.

---

## Paso 3 — Conecta la app a la base nueva

Ahora hay que decirle a la app que apunte al proyecto nuevo en vez del de Bolt.

1. En Supabase, menú izquierdo → engranaje **Settings** → **API**.
2. Ahí ves dos valores que necesitas:
   - **Project URL** — algo como `https://abcdefghijk.supabase.co`
   - **Project API keys** → la fila **`anon` `public`** (NO la `service_role`)
3. En la carpeta del proyecto, abre el archivo **`.env`** con el Bloc de notas.
   - Si no lo ves: en el Explorador, pestaña **Vista** → marca **Extensiones de
     nombre de archivo** y **Elementos ocultos**.
4. Reemplaza las dos líneas con tus valores nuevos:

```
VITE_SUPABASE_URL=https://TU-PROYECTO-NUEVO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...tu-llave-anon-completa
```

5. **Guarda** el archivo.

> La llave `anon` es pública por diseño — va en el navegador y no es un secreto.
> La que **nunca** debes pegar aquí ni compartir es la `service_role`.

---

## Paso 4 — Arranca y regístrate

1. Si el servidor está corriendo, **ciérralo** (la ventana negra). El `.env` solo
   se lee al arrancar — este paso no es opcional.
2. Doble clic en **`INICIAR-CRM.bat`**.
3. En la pantalla de login, dale a **Registrarse** y crea tu usuario con el correo
   que quieras usar en el CRM.

### Qué pasa al registrarte

La app crea sola tu organización, te pone como **admin**, y siembra los datos de
ejemplo. Deberías caer en el Dashboard con clientes, facturas y productos de muestra.

Ese primer registro es el que te vuelve administrador. Los usuarios que se registren
después no heredan ese rol.

---

## Paso 5 — Verifica

- [ ] Dashboard carga con datos
- [ ] CRM muestra la lista de clientes de ejemplo
- [ ] Abro un cliente y veo su ficha completa
- [ ] Facturación e Inventario cargan
- [ ] La pestaña **Ruta de cobro** abre (el mapa puede pedir permiso de ubicación)
- [ ] **F12 → Console: nada en rojo**

Cuando todo esté verde, corre **`GUARDAR-PROGRESO.bat`** para dejar el cambio del
`.env` guardado en git.

---

## Cosas que debes saber

**El envío de WhatsApp no va a funcionar todavía.** Vive en una *edge function*
(`supabase/functions/send-whatsapp`) que estaba desplegada en el proyecto de Bolt.
En el proyecto nuevo hay que desplegarla de nuevo y configurar sus credenciales.
Todo lo demás del CRM funciona sin eso. Avísame cuando llegues a esa parte.

**El proyecto viejo sigue ahí.** No lo estamos borrando. Si algún día quieres
rescatar algo de esa base, sigue existiendo en la cuenta de Bolt.

**Guarda la contraseña de la base de datos** del Paso 1. Supabase no te la vuelve
a mostrar.

---

## Si algo falla

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| "Falta la configuración de Supabase" | El `.env` no se leyó | ¿Se llama `.env` y no `.env.txt`? ¿Reiniciaste el servidor? |
| "Could not find the table 'public.X'" | El SQL no corrió completo | Vuelve al Paso 2 y revisa el resultado |
| "Invalid API key" | La llave está mal copiada | Cópiala de nuevo, completa, sin espacios ni saltos de línea |
| Login carga pero no entra | Falta confirmar el correo | Supabase → Authentication → Users. O desactiva la confirmación en Auth → Providers → Email |

Para cualquier otro error: **F12 → Console** y pásame el texto en rojo.
