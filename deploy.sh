#!/bin/bash

# AI Trading Copilot - AWS Amplify Deployment Script
# This script helps deploy your frontend to AWS Amplify

set -e  # Exit on any error

echo "🚀 AI Trading Copilot - AWS Amplify Deployment"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "amplify.yml" ]; then
    echo "❌ Error: amplify.yml not found. Please run this script from the project root."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found."
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "1. ✅ amplify.yml configuration found"
echo "2. ✅ frontend directory found"

# Check if git is initialized and has commits
if [ ! -d ".git" ]; then
    echo "⚠️  Warning: Git repository not initialized."
    read -p "Do you want to initialize git repository? (y/n): " init_git
    if [ "$init_git" = "y" ]; then
        git init
        git add .
        git commit -m "Initial commit for Amplify deployment"
        echo "✅ Git repository initialized"
    else
        echo "❌ Git repository required for Amplify deployment"
        exit 1
    fi
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    read -p "Do you want to commit them now? (y/n): " commit_changes
    if [ "$commit_changes" = "y" ]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    fi
fi

# Test build locally
echo "🔨 Testing build locally..."
cd frontend
if npm run build; then
    echo "✅ Local build successful"
    cd ..
else
    echo "❌ Local build failed. Please fix build errors before deploying."
    exit 1
fi

echo ""
echo "🎯 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Push your code to your Git repository:"
echo "   git push origin main"
echo ""
echo "2. Go to AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/"
echo ""
echo "3. Click 'New app' → 'Host web app'"
echo ""
echo "4. Connect your Git repository and deploy!"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "🌐 Your API endpoints:"
echo "   - Prediction: https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev/predict/{ticker}"
echo "   - History: https://42t4qwunq5.execute-api.us-east-1.amazonaws.com/dev/get-history/{ticker}"
echo ""
echo "✨ Happy deploying!"