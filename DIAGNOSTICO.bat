@echo off
setlocal
title Capturar el error
cd /d "%~dp0"

set "OUT=%CD%\diagnostico.txt"

echo ================================================================
echo   Capturando el error a un archivo
echo ================================================================
echo.
echo   Esto NO cambia nada. Solo intenta compilar y guarda lo que salga
echo   en:  diagnostico.txt
echo.
echo   Tarda entre 30 segundos y 2 minutos.
echo.

> "%OUT%" echo ===== DIAGNOSTICO XiX Tech CRM =====
>> "%OUT%" echo Fecha: %DATE% %TIME%
>> "%OUT%" echo.

>> "%OUT%" echo ===== VERSIONES =====
node -v  >> "%OUT%" 2>&1
npm -v   >> "%OUT%" 2>&1
>> "%OUT%" echo.

>> "%OUT%" echo ===== RAMA DE GIT =====
git rev-parse --abbrev-ref HEAD >> "%OUT%" 2>&1
git log --oneline -5 >> "%OUT%" 2>&1
>> "%OUT%" echo.

>> "%OUT%" echo ===== ARCHIVOS CLAVE =====
if exist ".env"                            (>> "%OUT%" echo OK    .env)                     else (>> "%OUT%" echo FALTA .env)
if exist "node_modules\leaflet"            (>> "%OUT%" echo OK    node_modules\leaflet)     else (>> "%OUT%" echo FALTA node_modules\leaflet)
if exist "node_modules\vite"               (>> "%OUT%" echo OK    node_modules\vite)        else (>> "%OUT%" echo FALTA node_modules\vite)
if exist "src\lib\neonSweep.ts"            (>> "%OUT%" echo OK    src\lib\neonSweep.ts)     else (>> "%OUT%" echo FALTA src\lib\neonSweep.ts)
if exist "src\components\ErrorBoundary.tsx" (>> "%OUT%" echo OK    src\components\ErrorBoundary.tsx) else (>> "%OUT%" echo FALTA ErrorBoundary.tsx)
>> "%OUT%" echo.

echo [1/2] Revisando tipos de TypeScript...
>> "%OUT%" echo ===== TYPESCRIPT =====
call npx tsc -b --force >> "%OUT%" 2>&1
>> "%OUT%" echo (fin typescript)
>> "%OUT%" echo.

echo [2/2] Intentando compilar...
>> "%OUT%" echo ===== BUILD DE VITE =====
call npm run build >> "%OUT%" 2>&1
>> "%OUT%" echo (fin build)

echo.
echo ================================================================
echo   LISTO
echo ================================================================
echo.
echo   Se creo el archivo:  diagnostico.txt
echo   Esta en esta misma carpeta.
echo.
echo   Avisame y yo lo leo directamente. No hace falta que copies nada.
echo.
pause
