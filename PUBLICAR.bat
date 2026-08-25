@echo off
setlocal
cd /d "%~dp0"
set "LOG=%~dp0publicar-log.txt"

echo Guardando y publicando... > "%LOG%"
echo. >> "%LOG%"

echo ================================================================
echo   Guardando y publicando los cambios
echo ================================================================
echo.

if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>&1
if exist ".git\HEAD.lock"  del /f /q ".git\HEAD.lock"  >nul 2>&1

git add -A >> "%LOG%" 2>&1
git commit -m "Arreglar registro de clientes: columnas faltantes, formulario no se borra al fallar, guardar ubicacion" >> "%LOG%" 2>&1
git push >> "%LOG%" 2>&1
set "CODIGO=%errorlevel%"

echo. >> "%LOG%"
echo RESULTADO=%CODIGO% >> "%LOG%"
echo. >> "%LOG%"
git log --oneline -3 >> "%LOG%" 2>&1

type "%LOG%"

echo.
if "%CODIGO%"=="0" (
  echo   LISTO. En uno o dos minutos se ve actualizado en linea.
) else (
  echo   Algo fallo. El detalle esta arriba.
)
echo.
pause
