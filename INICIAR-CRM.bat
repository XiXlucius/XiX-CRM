@echo off
title XIXTECH CRM - Servidor Local
cd /d "%~dp0"

echo ============================================
echo    XIXTECH CRM - Arranque local
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado.
  echo Descargalo desde: https://nodejs.org  ^(version LTS^)
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js detectado: %%v
echo.

if not exist "node_modules" (
  echo Primera vez: instalando dependencias...
  echo Esto puede tardar 2-5 minutos.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
  )
  echo.
  echo Dependencias instaladas.
  echo.
)

if not exist "node_modules\leaflet" (
  echo Se agregaron dependencias nuevas ^(mapas^): instalando...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la instalacion de dependencias nuevas.
    pause
    exit /b 1
  )
  echo.
)

echo ============================================
echo  Recordatorio: hay migraciones SQL pendientes
echo  de aplicar en Supabase ^(SQL Editor del dashboard^):
echo    - supabase\migrations\20260814120000_003_ruta_cobro_origin.sql
echo    - supabase\migrations\20260814130000_004_multi_tenant.sql
echo      ^(esta ultima es grande: reescribe permisos. Pruebala en
echo       un proyecto de prueba antes de aplicarla a produccion.^)
echo  Este script NO las aplica automaticamente.
echo ============================================
echo.

echo Liberando puerto 5173 si quedo ocupado por una sesion anterior...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>&1
)
echo.

echo Levantando servidor...
echo El navegador se abrira solo en unos segundos.
echo Para detener el servidor: cierra esta ventana o presiona Ctrl+C.
echo.

start "" /b cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:5173"

call npm run dev

echo.
echo Servidor detenido.
pause
