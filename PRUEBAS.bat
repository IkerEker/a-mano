@echo off
rem A MANO - prueba exacta y pruebas del motor desde la casa local. Escribe PRUEBAS_informe.txt
setlocal
cd /d "%~dp0"
set INF=PRUEBAS_informe.txt
if "%TEXTURAS_ROOT%"=="" set TEXTURAS_ROOT=%~dp0..\..
echo PRUEBAS A MANO %date% %time% > %INF%
echo TEXTURAS_ROOT=%TEXTURAS_ROOT% >> %INF%
where node >nul 2>nul && (
  node --version >> %INF%
  echo == huella >> %INF% & node tests\node\huella.js >> %INF% 2>&1
  echo == franjas >> %INF% & node tests\node\franjas.js >> %INF% 2>&1
  echo == photoshop simulado >> %INF% & node tests\sim\harness.js >> %INF% 2>&1
  echo == after effects >> %INF% & node tests\ae\harness.js >> %INF% 2>&1
) || echo FALTA node (https://nodejs.org) >> %INF%
where python >nul 2>nul && (
  python --version >> %INF% 2>&1
  python -c "import numpy,scipy,PIL;print('numpy',numpy.__version__,'scipy',scipy.__version__,'Pillow',PIL.__version__)" >> %INF% 2>&1 && (
    echo == biblioteca >> %INF% & python tools\biblioteca.py >> %INF% 2>&1
    echo == grumos (esperado d3ca0cf24cb8a2ba3fa4b8a3869c2eba) >> %INF% & python tools\grumos.py >> %INF% 2>&1 & certutil -hashfile js\grumosdata.js MD5 >> %INF%
    echo == cintas (esperado efd2021b0614bfa478f8b1e111b3aa78) >> %INF% & python tools\extract_textures.py >> %INF% 2>&1 & certutil -hashfile js\texdata.js MD5 >> %INF%
    echo == construir >> %INF% & python tools\build.py >> %INF% 2>&1
  ) || echo FALTAN numpy/scipy/Pillow: pip install numpy scipy pillow >> %INF%
) || echo FALTA python >> %INF%
echo == git status js (vacio = identico) >> %INF%
git status --short js >> %INF% 2>&1
echo == FIN PRUEBAS >> %INF%
type %INF%
pause
