@echo off
setlocal
title Arreglar cambios fantasma
cd /d "%~dp0"

echo ================================================================
echo   Arreglar los "cambios" que no son cambios
echo ================================================================
echo.
echo   Git estaba marcando archivos como modificados aunque nadie
echo   los hubiera tocado. Era un problema de finales de linea entre
echo   Windows y el repositorio, no cambios de verdad.
echo.
echo   Esto lo corrige de una vez. NO borra nada de tu trabajo.
echo.
echo   Solo hay que correrlo UNA vez.
echo.
pause
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta instalado.
  pause
  exit /b 1
)

if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>&1
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"  >nul 2>&1

echo Normalizando finales de linea...
git add --renormalize . >nul 2>&1
git add .gitattributes  >nul 2>&1

echo.
echo Guardando el arreglo...
git commit -m "Normalizar finales de linea (CRLF/LF)" >nul 2>&1

echo.
echo ----------------------------------------------------------------
echo Asi quedo. Si abajo no aparece nada, quiere decir que ya no hay
echo cambios pendientes y todo esta guardado:
echo.
git --no-pager status --short
echo.
echo ----------------------------------------------------------------
echo Ultimos guardados:
echo.
git --no-pager log --oneline -5
echo.
pause
