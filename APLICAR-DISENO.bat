@echo off
setlocal
title Instalar dependencias nuevas
cd /d "%~dp0"

echo ================================================================
echo   El codigo nuevo YA ESTA APLICADO.
echo ================================================================
echo.
echo   Ya copie todo el codigo de Claude Design a esta carpeta.
echo   Tu respaldo quedo en:  %CD%\_respaldo
echo.
echo   Este script solo hace lo que falta:
echo     - limpiar cache de compilacion
echo     - instalar las librerias de mapas (leaflet)
echo.
echo   NOTA: si ya ejecutaste INICIAR-CRM.bat, esto ya se hizo solo
echo         y puedes cerrar esta ventana.
echo.
pause
echo.

echo Limpiando cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "tsconfig.tsbuildinfo" del /q "tsconfig.tsbuildinfo" 2>nul
if exist "dist" rmdir /s /q "dist" 2>nul
echo    Listo.
echo.

echo Instalando dependencias (1-3 minutos)...
echo.
call npm install
if errorlevel 1 goto :fallo

echo.
echo ================================================================
echo   LISTO.
echo ================================================================
echo.
echo   Si todavia NO corriste MIGRACION-SUPABASE.sql en Supabase,
echo   hazlo antes de abrir la app. Ver LEEME-PASOS.md
echo.
echo   Despues: doble clic en INICIAR-CRM.bat
echo.
pause
exit /b 0

:fallo
echo.
echo [ERROR] Fallo npm install.
echo.
echo Opcion nuclear (borra e instala todo de cero):
echo     rmdir /s /q node_modules
echo     del package-lock.json
echo     npm install
echo.
pause
exit /b 1
