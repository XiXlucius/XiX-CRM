@echo off
setlocal enabledelayedexpansion
title Guardar progreso
cd /d "%~dp0"

echo ================================================================
echo   Guardar tu progreso actual
echo ================================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git no esta instalado.
  pause
  exit /b 1
)

if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>&1
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"  >nul 2>&1

echo Esto es lo que cambio desde el ultimo guardado:
echo.
git status --short
echo.

git diff --quiet HEAD 2>nul
if not errorlevel 1 (
  git diff --cached --quiet 2>nul
  if not errorlevel 1 (
    echo No hay nada nuevo que guardar. Todo esta al dia.
    echo.
    pause
    exit /b 0
  )
)

echo ----------------------------------------------------------------
set "MENSAJE="
set /p MENSAJE=Describe en pocas palabras que hiciste:

if "!MENSAJE!"=="" set "MENSAJE=Progreso guardado"

echo.
git add -A
git commit -m "!MENSAJE!"
echo.

echo ----------------------------------------------------------------
echo Ultimos guardados:
echo.
git log --oneline -5
echo.
echo Listo. Tu trabajo esta a salvo en esta computadora.
echo.

REM Si ya se conecto un repositorio en GitHub (ver PUBLICAR-EN-LINEA.md),
REM esto sube el guardado y Vercel/Netlify publican la version nueva solos.
REM Si todavia no hay nada conectado, no pasa nada malo: solo se avisa.
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo No esta conectado a GitHub todavia, asi que solo quedo
  echo guardado aqui. Si quieres que se vea en linea, hay que
  echo conectarlo primero - ver PUBLICAR-EN-LINEA.md
) else (
  echo Subiendo a GitHub...
  git push 2>&1
  if errorlevel 1 (
    echo.
    echo [AVISO] No se pudo subir a GitHub. El guardado local si
    echo         quedo bien. Copia el mensaje de arriba y pidele
    echo         ayuda a Claude con eso.
  ) else (
    echo Subido. En uno o dos minutos deberia verse actualizado
    echo en tu pagina en linea.
  )
)

echo.
echo Para volver a un punto anterior, pideme ayuda y dame el codigo
echo de 7 letras que aparece a la izquierda del guardado que quieras.
echo.
pause
