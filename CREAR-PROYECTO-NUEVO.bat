@echo off
setlocal enabledelayedexpansion
title Crear un CRM nuevo a partir de este
cd /d "%~dp0"

echo ================================================================
echo   Crear un proyecto NUEVO usando este CRM como base
echo ================================================================
echo.
echo   Copia el codigo a una carpeta aparte, con su propio historial.
echo   NO toca nada de tu CRM actual.
echo.
echo   Lo que NO se copia (a proposito):
echo     - node_modules  (se reinstala, pesa cientos de MB)
echo     - .git          (historial nuevo, para que evolucionen aparte)
echo     - .env          (las claves de Supabase: el proyecto nuevo
echo                      necesita SU PROPIA base de datos)
echo.

set "DESTINO="
set /p DESTINO=Nombre de la carpeta nueva (ej: estetica):

if "!DESTINO!"=="" (
  echo.
  echo No escribiste ningun nombre. Cancelado.
  pause
  exit /b 1
)

set "RUTA=%~dp0..\!DESTINO!"

if exist "!RUTA!\" (
  echo.
  echo [ERROR] Ya existe una carpeta llamada "!DESTINO!" al lado de esta.
  echo Elige otro nombre o borra esa carpeta primero.
  pause
  exit /b 1
)

echo.
echo Copiando a: !RUTA!
echo.

robocopy "%~dp0." "!RUTA!" /E /NFL /NDL /NJH /NJS /NP ^
  /XD node_modules .git dist .vite build coverage ^
  /XF .env diagnostico.txt >nul

if errorlevel 8 (
  echo [ERROR] Fallo la copia.
  pause
  exit /b 1
)

echo Copia terminada.
echo.

REM Historial de git propio, para que los dos proyectos no compartan pasado.
pushd "!RUTA!"
where git >nul 2>&1
if not errorlevel 1 (
  echo Creando historial de git nuevo...
  git init -q
  git add -A >nul 2>&1
  git -c user.email=local@local -c user.name=Lucius commit -q -m "Base copiada del CRM XiX Tech" >nul 2>&1
  echo Listo.
)
popd

REM Recordatorio de las claves, dentro de la carpeta nueva.
> "!RUTA!\LEEME-PRIMERO.txt" echo ANTES DE ARRANCAR ESTE PROYECTO
>> "!RUTA!\LEEME-PRIMERO.txt" echo ==================================
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo 1. Crea un proyecto NUEVO en supabase.com
>> "!RUTA!\LEEME-PRIMERO.txt" echo    NO uses el mismo del otro CRM: se mezclarian
>> "!RUTA!\LEEME-PRIMERO.txt" echo    los clientes de los dos negocios.
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo 2. Crea aqui un archivo llamado  .env  con:
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo    VITE_SUPABASE_URL=...
>> "!RUTA!\LEEME-PRIMERO.txt" echo    VITE_SUPABASE_ANON_KEY=...
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo 3. Aplica MIGRACION-CUENTA-NUEVA.sql en el
>> "!RUTA!\LEEME-PRIMERO.txt" echo    SQL Editor de Supabase.
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo 4. Abre una terminal en esta carpeta y corre:
>> "!RUTA!\LEEME-PRIMERO.txt" echo       npm install
>> "!RUTA!\LEEME-PRIMERO.txt" echo.
>> "!RUTA!\LEEME-PRIMERO.txt" echo 5. Ya puedes usar INICIAR-CRM.bat

echo.
echo ================================================================
echo   LISTO
echo ================================================================
echo.
echo   Carpeta nueva: !DESTINO!  (al lado de esta)
echo.
echo   FALTA lo importante, esta explicado en LEEME-PRIMERO.txt
echo   dentro de esa carpeta:
echo.
echo     1. Proyecto de Supabase NUEVO  (si usas el mismo, los dos
echo        negocios comparten clientes)
echo     2. Su propio archivo .env
echo     3. npm install
echo.
pause
