@echo off
echo ========================================
echo Starting Emotion Regulation Experiment
echo 情绪调节实验服务器
echo ========================================
echo.
echo Starting server on http://localhost:8080
echo 服务器地址: http://localhost:8080
echo.
echo The experiment will open in your browser automatically...
echo 实验将自动在浏览器中打开...
echo.
echo Press Ctrl+C to stop the server
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

:: Start browser in background after a delay
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8080"

:: Start the server with the emotion experiment as the main page
node examples/server.js --main=emotion-experiment --port=8080

:: If node fails, try with npm
if errorlevel 1 (
    echo.
    echo Node.js not found, please install Node.js
    echo 未找到 Node.js，请安装 Node.js
    echo.
    echo Download from: https://nodejs.org/
    echo.
    pause
)