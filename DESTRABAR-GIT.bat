@echo off
setlocal
title Destrabar git y guardar tu progreso
cd /d "%~dp0"

echo ================================================================
echo   Destrabar el repositorio y guardar todo tu trabajo
echo ================================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta instalado o no esta en el PATH.
  echo.
  echo Descargalo de: https://git-scm.com/download/win
  echo Instalalo con las opciones por defecto y vuelve a correr esto.
  echo.
  pause
  exit /b 1
)

echo [1/4] Quitando los archivos .lock huerfanos...

set BORRADOS=0
if exist ".git\index.lock" (
  del /f /q ".git\index.lock"
  if not exist ".git\index.lock" ( echo       Quitado: index.lock & set BORRADOS=1 ) else ( echo       [!] No se pudo quitar index.lock )
) else (
  echo       index.lock no existe ^(ya estaba limpio^)
)

if exist ".git\HEAD.lock" (
  del /f /q ".git\HEAD.lock"
  if not exist ".git\HEAD.lock" ( echo       Quitado: HEAD.lock & set BORRADOS=1 ) else ( echo       [!] No se pudo quitar HEAD.lock )
) else (
  echo       HEAD.lock no existe ^(ya estaba limpio^)
)
echo.

echo [2/4] Verificando identidad de git...
git config user.email >nul 2>&1
if errorlevel 1 (
  echo       No estaba configurada. Poniendola solo para este proyecto.
  git config user.email "lucius@local"
  git config user.name  "Lucius"
) else (
  for /f "tokens=*" %%e in ('git config user.email') do echo       Ya configurada: %%e
)
echo.

echo [3/4] Guardando TODO tu trabajo actual...
git add -A
if errorlevel 1 goto :fallo

git commit -m "Diseno Nocturne + multi-empresa + neon restaurado + ErrorBoundary" 2>&1 | findstr /v "^$"
echo.

echo [4/4] Estado del repositorio:
echo.
echo    --- Ultimos commits ---
git log --oneline -5
echo.
echo    --- Archivos sin guardar (deberia estar vacio) ---
git status --short
echo.

echo ================================================================
echo   LISTO
echo ================================================================
echo.
echo   Si arriba ves DOS o mas commits, quedo destrabado y tu
echo   trabajo esta guardado.
echo.
echo   Si solo ves uno ("Baseline pre-Nocturne"), algo fallo:
echo   copiame todo el texto de esta ventana.
echo.
echo   De ahora en adelante: corre GUARDAR-PROGRESO.bat cada vez
echo   que termines algo que funcione. Es tu red de seguridad.
echo.
pause
exit /b 0

:fallo
echo.
echo [ERROR] Git fallo. Copiame el mensaje de arriba.
echo.
pause
exit /b 1
