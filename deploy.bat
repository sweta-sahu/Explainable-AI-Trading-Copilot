@echo off
REM AI Trading Copilot - AWS Amplify Deployment Script (Windows)
REM This script helps deploy your frontend to AWS Amplify

echo 🚀 AI Trading Copilot - AWS Amplify Deployment
echo ==============================================

REM Check if we're in the right directory
if not exist "amplify.yml" (
    echo ❌ Error: amplify.yml not found. Please run this script from the project root.
    pause
    exit /b 1
)

REM Check if frontend directory exists
if not exist "frontend" (
    echo ❌ Error: frontend directory not found.
    pause
    exit /b 1
)

echo 📋 Pre-deployment checklist:
echo 1. ✅ amplify.yml configuration found
echo 2. ✅ frontend directory found

REM Check if git is initialized
if not exist ".git" (
    echo ⚠️  Warning: Git repository not initialized.
    set /p init_git="Do you want to initialize git repository? (y/n): "
    if /i "%init_git%"=="y" (
        git init
        git add .
        git commit -m "Initial commit for Amplify deployment"
        echo ✅ Git repository initialized
    ) else (
        echo ❌ Git repository required for Amplify deployment
        pause
        exit /b 1
    )
)

REM Test build locally
echo 🔨 Testing build locally...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Local build failed. Please fix build errors before deploying.
    pause
    exit /b 1
)
echo ✅ Local build successful
cd ..

echo.
echo 🎯 Ready for deployment!
echo.
echo Next steps:
echo 1. Push your code to your Git repository:
echo    git push origin main
echo.
echo 2. Go to AWS Amplify Console:
echo    https://console.aws.amazon.com/amplify/
echo.
echo 3. Click 'New app' → 'Host web app'
echo.
echo 4. Connect your Git repository and deploy!
echo.
echo 📚 For detailed instructions, see DEPLOYMENT.md
echo.
echo 🌐 Your API endpoints:
echo    - Prediction: https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev/predict/{ticker}
echo    - History: https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev/get-history/{ticker}
echo.
echo ✨ Happy deploying!
echo.
pause