# 🔧 Diagnóstico y Solución de Problemas — XiX Tech CRM

## Problema: La app no arranca

### Paso 1: Limpiar y Reinstalar

Si la app no compila o no arranca, ejecuta esto:

```bash
# Eliminar dependencias corruptas
rm -rf node_modules package-lock.json

# Reinstalar todo
npm install

# Limpiar cache de Vite
rm -rf dist .vite

# Intentar arrancar
npm run dev
```

---

## Paso 2: Revisar el Error Específico

Abre el navegador en `http://localhost:5173` y abre **DevTools (F12)**.

### Si ves un error en la consola:

**Error: "VITE_SUPABASE_URL is not defined"**
- ✅ Solución: Crear archivo `.env` en la raíz del proyecto
- Contenido:
```
VITE_SUPABASE_URL=https://amzrszxroxxnmsnbltme.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtenJzenhyb3h4bm1zbmJsdG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwOTIzNTcsImV4cCI6MjEwMDY2ODM1N30.dtDX2v-gj-lSGS1X6MGMsa_nqWfoQyd3GuwzhBadnTk
```

---

**Error: "Cannot find module './ui'"**
- ✅ Solución: El archivo `src/components/ui.tsx` existe pero TypeScript no lo ve
- Ejecuta:
```bash
npx tsc --noEmit  # Para ver si hay errores de tipo
```

---

**Error: "Module not found: 'react-query'" u otra librería**
- ✅ Solución: Instalarla
```bash
npm install @tanstack/react-query
npm install react-window
npm install react-error-boundary
```

---

**Error: "Cannot connect to Supabase"**
- ✅ Esto es NORMAL en las primeras pruebas. La app intenta sincronizar con la BD.
- La aplicación debería cargar de todas formas con datos locales.
- Si ves pantalla en blanco: revisa la consola del navegador.

---

## Paso 3: Verificar que TypeScript Compile

```bash
npm run build
```

Si falla:
- Lee los errores de TypeScript
- Verifica que los tipos de `types.ts` coincidan con los componentes

---

## Paso 4: Probar una Compilación Minimal

Si todo falla, crea un archivo temporal para verificar que React funciona:

```bash
# Crear un archivo de test
cat > src/test.tsx << 'EOF'
export function Test() {
  return <div>React funciona</div>;
}
EOF

# Importarlo en App.tsx temporalmente
# Luego bórralo si funciona
```

---

## Problemas Comunes & Soluciones Rápidas

### 1. **"El app tarda mucho en cargar"**
- Causa: Está sincronizando con Supabase por primera vez
- Solución: Esperar 30-60 segundos

### 2. **"Veo solo un spinner rotando"**
- Causa: El contexto de autenticación está cargando
- Solución: Abrir DevTools y revisar si hay errores en la red

### 3. **"Las rutas dan 404"**
- Causa: Está corriendo un build estático sin rutas dinámicas
- Solución: Ejecutar `npm run dev` (no `npm run build`)

### 4. **"Los estilos están feos / sin Tailwind"**
- Causa: El CSS no compiló
- Solución:
```bash
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

### 5. **"Error: CORS o connection refused"**
- Causa: Supabase no está accesible
- Solución: 
  - Verificar que el URL de Supabase es correcto
  - Verificar que tienes internet
  - Verificar que la llave anon es válida

---

## Paso 5: Nuclear Option (Reiniciar Todo)

Si nada funciona:

```bash
# Eliminar TODO
rm -rf node_modules dist .vite package-lock.json

# Reinstalar desde cero
npm install

# Actualizar dependencias a las últimas versiones
npm update

# Limpiar cache de npm
npm cache clean --force

# Intentar nuevamente
npm run dev
```

---

## Paso 6: Revisar Logs en Detalle

Si aún no funciona, dame:

1. **La salida completa de `npm run dev`**
   ```bash
   npm run dev 2>&1 | tee app-error.log
   ```

2. **Los errores en DevTools del navegador (F12 → Console)**

3. **Resultado de:**
   ```bash
   npm --version
   node --version
   npx tsc --version
   ```

---

## Checklist de Salud de la Aplicación ✅

- [ ] `npm install` funciona sin errores
- [ ] `npm run build` completa exitosamente
- [ ] `npm run dev` arranca el servidor (sin timeout)
- [ ] Puedo acceder a `http://localhost:5173` en el navegador
- [ ] No hay errores rojos en DevTools (F12)
- [ ] Puedo ver la pantalla de login
- [ ] Puedo crear una cuenta
- [ ] Puedo hacer login
- [ ] La aplicación carga el dashboard

---

## Si Todo Falla: Contactar Soporte

Proporciona:
1. Tu sistema operativo (Windows / Mac / Linux)
2. Versión de Node: `node --version`
3. La salida completa de error
4. Screenshot de DevTools

---

**Próximo paso después de que la app funcione:**

Implementar los cambios del documento `CAMBIOS_RECOMENDADOS.md` en orden de prioridad.
