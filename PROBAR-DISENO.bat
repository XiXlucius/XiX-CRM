@echo off
setlocal enabledelayedexpansion
title Probar cambios de diseno
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta instalado.
  pause
  exit /b 1
)

if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>&1
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"  >nul 2>&1

for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set RAMA=%%b

echo ================================================================
echo   Probar cambios de diseno sin arriesgar la version que funciona
echo ================================================================
echo.
echo   Estas en la rama: !RAMA!
echo.
echo   1. Empezar una prueba de diseno
echo   2. Conservar los cambios de la prueba
echo   3. Descartar la prueba y volver atras
echo   4. Salir
echo.
set "OP="
set /p OP=Elige una opcion (1-4):
echo.

if "!OP!"=="1" goto :empezar
if "!OP!"=="2" goto :conservar
if "!OP!"=="3" goto :descartar
goto :fin

REM ---------------------------------------------------------------
:empezar
if "!RAMA!"=="prueba-diseno" (
  echo Ya estas en una prueba de diseno. Sigue editando, o usa
  echo la opcion 2 para conservarla o la 3 para descartarla.
  echo.
  goto :fin
)

echo Guardando lo que tengas pendiente antes de empezar...
git add -A >nul 2>&1
git commit -m "Estado previo a la prueba de diseno" >nul 2>&1

git checkout -B prueba-diseno
if errorlevel 1 goto :fallo
echo.
echo ----------------------------------------------------------------
echo   Listo. Estas en la rama de prueba.
echo.
echo   Edita con tranquilidad:
echo     src\index.css
echo     tailwind.config.js
echo     src\components\ParticleField.tsx
echo.
echo   La version que funciona sigue intacta en la rama !RAMA!.
echo   Cuando termines, vuelve a abrir este archivo.
echo ----------------------------------------------------------------
echo.
goto :fin

REM ---------------------------------------------------------------
:conservar
if not "!RAMA!"=="prueba-diseno" (
  echo No estas en una prueba de diseno. Nada que conservar.
  echo.
  goto :fin
)

echo Guardando los cambios de la prueba...
git add -A
set "MSG="
set /p MSG=Describe en pocas palabras que cambiaste:
if "!MSG!"=="" set "MSG=Cambios de diseno"
git commit -m "!MSG!" >nul 2>&1

echo Pasandolos a la version buena...
git checkout master
if errorlevel 1 goto :fallo
git merge prueba-diseno -m "Diseno: !MSG!"
if errorlevel 1 (
  echo.
  echo [ATENCION] Hubo un conflicto al unir. No toques nada y pideme ayuda.
  echo.
  pause
  exit /b 1
)
git branch -D prueba-diseno >nul 2>&1
echo.
echo Listo. Los cambios quedaron en la version buena.
echo.
goto :fin

REM ---------------------------------------------------------------
:descartar
if not "!RAMA!"=="prueba-diseno" (
  echo No estas en una prueba de diseno. Nada que descartar.
  echo.
  goto :fin
)

echo.
echo [ATENCION] Esto BORRA todo lo que hiciste en la prueba.
set "OK="
set /p OK=Escribe SI para confirmar:
if /i not "!OK!"=="SI" (
  echo Cancelado. No se toco nada.
  echo.
  goto :fin
)

git checkout -- . >nul 2>&1
git clean -fd >nul 2>&1
git checkout master
if errorlevel 1 goto :fallo
git branch -D prueba-diseno >nul 2>&1
echo.
echo Listo. Volviste a la version que funcionaba.
echo Reinicia INICIAR-CRM.bat para ver el cambio.
echo.
goto :fin

REM ---------------------------------------------------------------
:fallo
echo.
echo [ERROR] Git fallo. Copiame el mensaje de arriba.
echo.
pause
exit /b 1

:fin
echo Ramas actuales:
git branch
echo.
pause
