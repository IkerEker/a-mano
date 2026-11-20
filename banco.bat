@echo off
rem Banco de velocidad de A mano. Necesita Node.js (https://nodejs.org). Escribe tests\banco\resultado.json
cd /d "%~dp0"
node tests\banco\banco.js %*
pause
