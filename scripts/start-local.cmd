@echo off
rem Starts FleetTrack for local development in three terminal windows (API, client, GPS simulator).
rem Needs Node 18+ and MongoDB running (the MongoDB installer sets it up as a Windows service).
rem Double-click this file or run it from a terminal. Close the three windows to stop.

cd /d "%~dp0.."

if not exist server\node_modules (
  echo Installing dependencies for the first time...
  call npm install
  call npm run setup
)
if not exist server\.env copy server\.env.example server\.env >nul
if not exist client\.env copy client\.env.example client\.env >nul

start "FleetTrack API (http://localhost:5000)" cmd /k "cd /d server && npm run dev"
start "FleetTrack client (http://localhost:5173)" cmd /k "cd /d client && npm run dev"
start "FleetTrack GPS simulator" cmd /k "cd /d server && echo Waiting for the API... && timeout /t 8 /nobreak >nul && npm run simulate -- --auto"

echo.
echo Three windows were opened. Sign in at http://localhost:5173 with admin@fleet.com / Admin@123
echo First time? Seed demo data in a new terminal:  npm run seed
timeout /t 6 /nobreak >nul
start http://localhost:5173
