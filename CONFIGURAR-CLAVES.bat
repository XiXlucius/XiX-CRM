@echo off
setlocal enabledelayedexpansion
title Configurar las claves de Supabase
cd /d "%~dp0"

echo ================================================================
echo   Conectar un proyecto con su base de datos de Supabase
echo ================================================================
echo.
echo   Crea el archivo .env con las claves.
echo.
echo   Se hace con este script y no a mano porque Windows guarda
echo   ".env" como ".env.txt" sin avisar, y entonces no funciona
echo   y no se ve por que.
echo.

set "DESTINO="
set /p DESTINO=Nombre de la carpeta del proyecto (ej: estetica):

if "!DESTINO!"=="" (
  echo. & echo No escribiste nada. Cancelado.
  pause & exit /b 1
)

set "RUTA=%~dp0..\!DESTINO!"

if not exist "!RUTA!\package.json" (
  echo.
  echo [ERROR] No encuentro un proyecto en:
  echo   !RUTA!
  echo.
  echo Revisa el nombre. Debe ser una carpeta creada con
  echo CREAR-PROYECTO-NUEVO.bat
  pause & exit /b 1
)

echo.
echo ----------------------------------------------------------------
echo   Donde estan las claves en Supabase:
echo.
echo   Icono de engranaje (abajo a la izquierda)
echo      - Project Settings  ^>  API Keys
echo.
echo   Necesitas DOS cosas:
echo      1. Project URL  (empieza por https://)
echo      2. La clave publica:
echo           - "Publishable key"  (sb_publishable_...)  ^<-- usa esta
echo           - o la "anon" de la pestana Legacy API Keys (eyJ...)
echo.
echo   Para un proyecto nuevo usa la Publishable. Las legacy
echo   las retiran a finales de 2026.
echo.
echo   NO uses la "service_role" ni la "secret": dan acceso
echo   total saltandose los permisos.
echo ----------------------------------------------------------------
echo.

set "SBURL="
set /p SBURL=Pega el Project URL:

if "!SBURL!"=="" (
  echo. & echo No pegaste el URL. Cancelado.
  pause & exit /b 1
)

echo.
set "SBKEY="
set /p SBKEY=Pega la anon public key:

if "!SBKEY!"=="" (
  echo. & echo No pegaste la clave. Cancelado.
  pause & exit /b 1
)

REM --- Avisos si algo se ve raro, antes de escribir nada ---
echo.
echo !SBURL! | findstr /i /c:"supabase.co" >nul
if errorlevel 1 (
  echo [AVISO] Ese URL no parece de Supabase. Deberia terminar
  echo         en .supabase.co
  echo.
  set /p SEGUIR=Escribir de todas formas? (s/n):
  if /i not "!SEGUIR!"=="s" (echo Cancelado. & pause & exit /b 1)
)

echo !SBKEY! | findstr /i /c:"service_role" >nul
if not errorlevel 1 (
  echo.
  echo [PELIGRO] Esa es la clave service_role, no la anon public.
  echo           Da acceso total a la base de datos saltandose
  echo           todos los permisos. NO puede ir en la aplicacion.
  echo.
  echo Vuelve a Supabase y copia la que dice "anon" o "publishable".
  pause & exit /b 1
)

REM --- Escribir el .env ---
> "!RUTA!\.env" echo VITE_SUPABASE_URL=!SBURL!
>> "!RUTA!\.env" echo VITE_SUPABASE_ANON_KEY=!SBKEY!

REM Que git nunca se lleve las claves.
findstr /x /c:".env" "!RUTA!\.gitignore" >nul 2>&1
if errorlevel 1 (
  >> "!RUTA!\.gitignore" echo.
  >> "!RUTA!\.gitignore" echo # Claves locales - nunca se suben
  >> "!RUTA!\.gitignore" echo .env
)

echo.
echo ================================================================
echo   LISTO
echo ================================================================
echo.
echo   Archivo creado:  !DESTINO!\.env
echo.
echo   Contenido:
echo.
type "!RUTA!\.env"
echo.
echo ----------------------------------------------------------------
echo   Lo que sigue:
echo.
echo     1. Aplicar MIGRACION-CUENTA-NUEVA.sql en el SQL Editor
echo     2. Configurar Auth (3 interruptores)
echo     3. npm install
echo.
pause
