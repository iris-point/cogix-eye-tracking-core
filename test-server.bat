@echo off
echo Starting Eye Tracking Demo Server...
cd examples
start cmd /k "node server.js"
timeout /t 2 >nul
start http://localhost:8080/
echo Server started! Opening browser to http://localhost:8080/