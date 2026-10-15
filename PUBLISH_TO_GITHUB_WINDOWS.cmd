@echo off
setlocal
cd /d "%~dp0"
echo === Smart 5S Inspector GitHub upload ===
where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git for Windows is required: https://git-scm.com/downloads/win
  pause
  exit /b 1
)
if not exist package.json (
  echo [ERROR] package.json not found.
  pause
  exit /b 1
)
if exist .env.local echo [INFO] .env.local is excluded by .gitignore
if not exist .gitignore (
  echo [ERROR] .gitignore missing. Stop to prevent accidental secret upload.
  pause
  exit /b 1
)
if not exist .git git init -b main
call git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin https://github.com/72unicon-dot/smart-5s-inspector.git
call git add .
echo.
echo === Files staged for PUBLIC GitHub upload ===
call git diff --cached --name-only
call git diff --cached --name-only | findstr /I /R "\.env\.local$ service.role secret api.key node_modules" >nul
if not errorlevel 1 (
  echo [STOP] Possibly sensitive file detected. Review staging before continuing.
  pause
  exit /b 1
)
echo.
echo [IMPORTANT] GitHub repository is PUBLIC. Only upload non-secret source code.
choice /M "Publish staged source files to public GitHub repository"
if errorlevel 2 exit /b 0
call git commit -m "Add Smart 5S Inspector application"
if errorlevel 1 echo [INFO] No new commit or Git user identity not configured.
call git push -u origin main
if errorlevel 1 (
  echo [ERROR] GitHub upload failed. Check GitHub authentication and repository access.
  pause
  exit /b 1
)
echo [SUCCESS] GitHub upload finished.
pause
