@echo off
echo =========================================
echo GitHub Auto-Push Script for PowerSense
echo =========================================
echo.

set /p REPO_URL="Please paste your empty GitHub Repository URL (e.g. https://github.com/Username/Repo.git): "

echo.
echo Initializing Git repository...
git init

echo.
echo Adding files...
git add .

echo.
echo Committing files...
git commit -m "Initial commit - PowerSense App"

echo.
echo Creating main branch...
git branch -M main

echo.
echo Linking to GitHub...
git remote add origin %REPO_URL%

echo.
echo Pushing code to GitHub...
git push -u origin main

echo.
echo =========================================
echo Done! Please check your GitHub repository.
echo =========================================
pause
