# Recorrido del CRM — qué probar y qué esperar

Ve marcando. Cuando algo falle, anota **en qué pantalla** y **qué decía el error**.
Con eso lo arreglamos rápido; sin eso hay que adivinar.

**Ten abierta la consola todo el tiempo:** `F12` → pestaña **Console**. Muchos
fallos no se ven en pantalla pero sí ahí.

---

## Antes de empezar

- [ ] `INICIAR-CRM.bat` arranca sin errores
- [ ] Entras con tu cuenta
- [ ] El menú lateral muestra **11 secciones** (Dashboard, CRM, Curso, Playbook,
      Equipo, Facturación, Ruta de cobro, Inventario, Configuración, Reportes, Auditoría)

> Si faltan secciones, tu rol no se está leyendo bien del servidor. Páralo ahí.

---

## 1. Dashboard

- [ ] Las tarjetas KPI muestran cifras, no ceros ni "NaN"
- [ ] Las gráficas se dibujan
- [ ] **El mapa de calor de Caracas carga** con los municipios sobre un mapa real
- [ ] **El calendario de cobros** muestra días con color y pulso
- [ ] El filtro por agente cambia los datos

> **Riesgo alto:** el mapa es Leaflet, dependencia nueva que nunca se ha usado en
> producción. Si sale un hueco gris o un error de `leaflet/dist/leaflet.css`, es eso.

---

## 2. CRM

- [ ] La lista de clientes carga
- [ ] Cambiar entre vista de tarjetas y de tabla funciona
- [ ] Buscar y filtrar por estado funciona
- [ ] Abrir un cliente muestra su ficha completa
- [ ] **Crear un cliente nuevo** — el formulario completo, con evaluación de riesgo
      en vivo y la calculadora de amortización
- [ ] Editar y guardar un cliente existente
- [ ] Añadir una nota a la bitácora
- [ ] **El mapa de clientes** carga con marcadores reales
- [ ] **Subir un documento a un cliente** ← corregido, hay que probarlo
- [ ] Abrir y borrar ese documento
- [ ] **Enviar un WhatsApp** ← corregido con solución alterna, hay que probarlo
- [ ] **Imprimir una factura individual** (botón nuevo, ícono impresora junto a cada cuota)

> **Documentos:** la ruta de subida usaba el `user_id` cuando los permisos ya
> exigían el `org_id`. Toda subida rebotaba con "no tienes permiso". Corregido,
> pero sin probar.
>
> **WhatsApp:** la función vive en el proyecto viejo de Bolt y no existe en el
> nuevo, así que ahora el botón abre WhatsApp directo (wa.me) con el mensaje ya
> escrito — funciona sin necesidad de desplegar nada en Supabase. Si más
> adelante configuras la API oficial de Meta y despliegas la función, la usará
> automáticamente en su lugar.

---

## 3. Ruta de cobro

**La pantalla más nueva y la que menos se ha probado.**

- [ ] La pestaña abre sin error
- [ ] Pide permiso de ubicación al navegador
- [ ] Lista las visitas del día (mora + vencimientos de hoy)
- [ ] El mapa dibuja las paradas numeradas
- [ ] Los botones de Waze y Google Maps abren la app correcta
- [ ] "Marcar visitada" funciona
- [ ] "Registrar visita" guarda en la bitácora del cliente
- [ ] Aparece la sección de clientes sin coordenadas

> Si no hay facturas vencidas hoy, la lista sale vacía y es correcto. Para
> probarlo de verdad, pon a mano una fecha de vencimiento pasada en alguna factura.

---

## 4. Facturación

- [ ] La lista de facturas carga
- [ ] Filtros por estado funcionan
- [ ] Registrar un pago
- [ ] Registrar un pago parcial
- [ ] Una renegociación
- [ ] Mora y recargos se calculan solos
- [ ] Abrir un cliente desde una factura

---

## 5. Inventario

- [ ] El catálogo carga
- [ ] Los filtros rápidos funcionan
- [ ] Crear, editar y borrar un producto
- [ ] El stock se actualiza

---

## 6. Equipo

- [ ] La lista del equipo carga
- [ ] **"Usuarios del sistema" aparece arriba** (solo lo ves tú, como admin)
- [ ] La cuenta que registraste sale como pendiente
- [ ] **Asignarle un rol funciona** y aparece el aviso de confirmación
- [ ] Crear y editar un miembro del equipo
- [ ] **Los campos de latitud/longitud de origen** y el botón "Usar mi ubicación actual"
- [ ] Metas y comisiones se calculan

> **Cierra aquí el círculo:** después de asignar el rol, entra desde la ventana
> de incógnito y comprueba que esa cuenta ve solo lo que le corresponde.

---

## 7. Reportes

- [ ] Las gráficas cargan
- [ ] **Exportar a CSV** descarga un archivo que se abre bien
- [ ] **Exportar a PDF** (tarjeta "Resumen de cartera") abre la ventana de impresión con el estado de cuenta
- [ ] Los filtros de fecha cambian los datos

> **PDF:** no es un archivo generado en el servidor — abre una ventana con el
> documento y dispara el diálogo de "Imprimir" del navegador, donde eliges
> "Guardar como PDF". Si el navegador bloquea la ventana emergente, autoriza
> los pop-ups para este sitio. Ahora también puedes imprimir el estado de
> cuenta y facturas individuales directamente desde la ficha de cada cliente
> (pestaña "Pagos").

---

## 8. Configuración

- [ ] Los parámetros del negocio se ven y son editables
- [ ] Guardar un cambio y comprobar que persiste al recargar
- [ ] "Respaldo manual" descarga algo
- [ ] Tu rol aparece correcto y **NO se puede cambiar** (ya es de solo lectura)

---

## 9. Curso y Playbook

- [ ] El reproductor del curso avanza
- [ ] El quiz da puntaje y lo guarda
- [ ] El simulador de roleplay del Playbook llega a un resultado

---

## 10. Auditoría

- [ ] El registro carga
- [ ] Aparecen las acciones que acabas de hacer en este recorrido
- [ ] El filtro por entidad funciona

---

## 11. Transversal

- [ ] **Cmd/Ctrl + K** abre la paleta de comandos y navega
- [ ] La campana de notificaciones abre y navega al elemento
- [ ] El tour guiado arranca desde el Header
- [ ] **Achica la ventana a tamaño móvil**: el menú se vuelve cajón lateral y
      las tablas se vuelven tarjetas
- [ ] Cerrar sesión y volver a entrar
- [ ] **Console (F12): ¿queda algo en rojo?**

---

## Qué esperar

Revisé el código de los cinco puntos de riesgo y corregí lo que encontré:

- **WhatsApp:** ya no depende de la edge function del proyecto viejo. Ahora abre
  WhatsApp directo con el mensaje redactado. Debería funcionar ya.
- **Documentos:** ruta de subida corregida (usaba `user_id`, ahora usa `org_id`).
- **PDF:** revisado — es impresión del navegador, no una librería externa. Añadí
  botones de impresión de factura individual y estado de cuenta en la ficha del
  cliente, que antes no existían en ningún lado del menú.
- **Mapas Leaflet y Ruta de cobro:** revisé el código a fondo, no encontré bugs.
  El riesgo real aquí es de datos: si un cliente no tiene latitud/longitud
  guardada, no aparece en el mapa (esto es esperado, no un error).

Nada de esto lo pude probar en vivo — no tengo forma de correr tu app localmente
desde aquí — así que sigue siendo importante que lo abras y lo recorras. Si algo
falla, la pantalla de error trae botón de copiar; pásame ese texto tal cual.
