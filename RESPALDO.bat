@echo off
rem A MANO - copia de seguridad de todo el historial (git bundle). Guarda las 3 ultimas.
setlocal
cd /d "%~dp0"
set RESP=..\_respaldos
if not exist %RESP% mkdir %RESP%
for /f %%d in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HHmm"') do set F=%RESP%\a-mano_%%d.bundle
git bundle create "%F%" --all && git bundle verify "%F%" && echo RESPALDO CORRECTO: %F%
for /f "skip=3 delims=" %%f in ('dir /b /o-n %RESP%\a-mano_*.bundle') do del "%RESP%\%%f"
pause
