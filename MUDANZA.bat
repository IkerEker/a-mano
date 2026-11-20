@echo off
rem A MANO - mudanza a la casa local (ORDEN 2). Doble clic. No borra nada. Escribe MUDANZA_informe.txt
setlocal enabledelayedexpansion
cd /d "%~dp0"
set INF=MUDANZA_informe.txt
set URL=https://github.com/IkerEker/a-mano.git
set RESP=..\_respaldos
echo MUDANZA A MANO %date% %time% > %INF%
where git >nul 2>nul || (echo FALTA git >> %INF% & echo Falta git. & pause & exit /b 1)

if not exist .git (
  git init -q -b main . >> %INF% 2>&1
  git remote add origin %URL% >> %INF% 2>&1
)
git config core.quotepath false
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
git fetch --all --tags >> %INF% 2>&1 || (echo FALLO: git fetch >> %INF% & type %INF% & pause & exit /b 1)
git rev-parse -q --verify HEAD >nul 2>nul || git checkout -q -t origin/main >> %INF% 2>&1
for /f "tokens=*" %%b in ('git for-each-ref --format^="%%(refname:lstrip=3)" refs/remotes/origin') do (
  if not "%%b"=="HEAD" ( git show-ref -q --verify refs/heads/%%b || git branch -q %%b origin/%%b >> %INF% 2>&1 )
)
git checkout -q main >> %INF% 2>&1

echo. >> %INF%
echo == GITHUB (ls-remote) >> %INF%
git ls-remote --heads --tags origin >> %INF% 2>&1
echo == LOCAL (ramas y etiquetas) >> %INF%
git for-each-ref --format="%%(objectname) %%(refname)" refs/heads refs/tags >> %INF% 2>&1
echo == ARCHIVOS POR RAMA (numero en GitHub / numero en local) >> %INF%
for /f "tokens=*" %%b in ('git for-each-ref --format^="%%(refname:lstrip=2)" refs/heads') do (
  for /f %%n in ('git ls-tree -r --name-only origin/%%b ^| find /c /v ""') do set NG=%%n
  for /f %%n in ('git ls-tree -r --name-only %%b ^| find /c /v ""') do set NL=%%n
  git diff --quiet origin/%%b %%b && (echo %%b: !NG! / !NL! IGUALES >> %INF%) || (echo %%b: !NG! / !NL! DISTINTOS >> %INF%)
)
echo == ARBOL DE TRABAJO (vacio = igual que main) >> %INF%
git status --short >> %INF% 2>&1

echo == RESPALDOS >> %INF%
if not exist %RESP% mkdir %RESP%
for %%f in (%RESP%\a-mano_*.bundle) do (
  echo %%f >> %INF%
  git bundle verify "%%f" >> %INF% 2>&1 && (echo   BUNDLE CORRECTO >> %INF%) || (echo   BUNDLE MAL >> %INF%)
  git bundle list-heads "%%f" >> %INF% 2>&1
)
echo == FIN MUDANZA >> %INF%
type %INF%
echo.
echo Hecho. Ahora, si quieres, ejecuta PRUEBAS.bat. Dile a Claude que ya esta.
pause
