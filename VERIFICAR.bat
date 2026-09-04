@echo off
setlocal
cd /d "%~dp0"
set "LOG=%~dp0verificar-log.txt"

echo Verificando el codigo... > "%LOG%"
echo. >> "%LOG%"

echo ================================================================
echo   Revisando que el codigo compile sin errores
echo ================================================================
echo.
echo Esto tarda alrededor de un minuto. No cierres la ventana.
echo.

echo ---- TIPOS (tsc) ---- >> "%LOG%"
call npx tsc --noEmit >> "%LOG%" 2>&1
echo TIPOS_RESULTADO=%errorlevel% >> "%LOG%"
echo. >> "%LOG%"

echo ---- COMPILACION (build) ---- >> "%LOG%"
call npm run build >> "%LOG%" 2>&1
echo BUILD_RESULTADO=%errorlevel% >> "%LOG%"

echo.
echo Listo. El detalle quedo en verificar-log.txt
echo.
pause
