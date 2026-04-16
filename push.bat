@echo off
echo =========================================
echo GitHub Auto-Updater for PowerSense
echo =========================================
echo.

echo Adding modified files...
git add .

echo.
echo Committing changes...
git commit -m "Updated frontend for deployment"

echo.
echo Pushing code to GitHub...
git push

echo.
echo =========================================
echo Done! Please check your GitHub repository.
echo =========================================
pause
