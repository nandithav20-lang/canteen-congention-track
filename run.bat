@echo off
echo ===================================================
echo Starting QueueSense Full-Stack Canteen Intelligence
echo ===================================================

echo [1/2] Starting Flask Backend (Port 5000)...
start "QueueSense Backend" cmd /k "cd /d %~dp0\backend && python app.py"

echo [2/2] Starting Vite Frontend (Port 3000)...
start "QueueSense Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo QueueSense is booting up:
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:5000
echo ===================================================
timeout /t 3
start http://localhost:3000

