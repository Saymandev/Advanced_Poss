@echo off
echo.
echo ====================================
echo Starting Restaurant POS Backend
echo ====================================
echo.

start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo Backend server is starting...
echo.
echo Backend:  http://localhost:5000
echo.
echo Press any key to exit this window (server will keep running)...
pause > nul

