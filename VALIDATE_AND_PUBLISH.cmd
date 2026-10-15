@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo Smart 5S Inspector - validate and upload
where git >nul 2>&1 || (echo Git for Windows is required & pause & exit /b 1)
where node >nul 2>&1 || (echo Node.js LTS is required & pause & exit /b 1)
if not exist package.json (echo Missing package.json & pause & exit /b 1)
if not exist .gitignore (echo Missing .gitignore & pause & exit /b 1)
call npm install --no-audit --no-fund || (echo Install failed & pause & exit /b 1)
call npm test || (echo Tests failed & pause & exit /b 1)
call npm run build || (echo Build failed. Do not deploy. & pause & exit /b 1)
if not exist .git git init -b main
git remote get-url origin >nul 2>&1
if errorlevel 1 git remote add origin https://github.com/72unicon-dot/smart-5s-inspector.git
git fetch origin main || (echo Could not fetch remote & pause & exit /b 1)
git add .
git diff --cached --name-only
git diff --cached --name-only | findstr /I /R /C:"\.env\.local" /C:"service_role" /C:"secret" /C:"node_modules" /C:"\.next" >nul
if not errorlevel 1 (echo Staging contains suspicious file. Stop. & pause & exit /b 1)
echo.
echo Review public files above. Continue ONLY if no secrets or company data.
choice /C YN /M "Push sources to public GitHub repository?"
if errorlevel 2 exit /b 1
git -c user.name="Smart 5S Inspector" -c user.email="noreply@users.noreply.github.com" commit -m "Add Smart 5S Inspector app" || (echo Nothing to commit or error)
git pull --rebase origin main || (echo Rebase conflict: resolve manually & pause & exit /b 1)
git push -u origin main || (echo Push failed & pause & exit /b 1)
echo Uploaded successfully. Open https://github.com/72unicon-dot/smart-5s-inspector
pause
