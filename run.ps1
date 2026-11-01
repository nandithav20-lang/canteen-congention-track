# QueueSense One-Click Launcher
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Starting QueueSense Smart Canteen Intelligence" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Green

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Start Flask Backend
Write-Host "[1/2] Starting Flask Backend on Port 5000..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\backend'; python app.py"

Start-Sleep -Seconds 2

# Start Vite Frontend
Write-Host "[2/2] Starting Vite Frontend on Port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\frontend'; npm run dev"

Write-Host "All systems active!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:5000" -ForegroundColor Cyan

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

