@echo off
setlocal enabledelayedexpansion
title Instalar dependencias
cd /d "%~dp0"

echo ================================================================
echo   Instalar dependencias de un proyecto
echo ================================================================
echo.
echo   Descarga todo lo que el proyecto necesita para funcionar
echo   (React, Supabase, etc). Se hace UNA vez por proyecto.
echo.
echo   Tarda entre 1 y 3 minutos. Necesita internet.
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
  echo Revisa el nombre de la carpeta.
  pause & exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js no esta instalado en esta computadora.
  echo Descargalo de https://nodejs.org (version LTS) e intenta de nuevo.
  pause & exit /b 1
)

echo.
echo Instalando en: !RUTA!
echo.

pushd "!RUTA!"
call npm install
set "RESULTADO=%errorlevel%"
popd

echo.
echo ================================================================
if "!RESULTADO!"=="0" (
  echo   LISTO
  echo ================================================================
  echo.
  echo   Ya puedes arrancar el proyecto. Dentro de la carpeta
  echo   !DESTINO! deberia haber un INICIAR-CRM.bat - usalo para
  echo   abrirlo.
) else (
  echo   ALGO FALLO
  echo ================================================================
  echo.
  echo   Revisa el mensaje de error de arriba y comparteme lo que
  echo   diga. Lo mas comun es falta de conexion a internet.
)
echo.
pause
