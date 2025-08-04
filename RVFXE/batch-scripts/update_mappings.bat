@echo off
title UAssetGUI Mapping Updater

REM --- COLOR DEFINITIONS ---
set "yellow=[93m"
set "cyan=[96m"
set "red=[91m"
set "green=[92m"
set "reset=[0m"

:start
cls
echo %yellow%--- UAssetGUI Mapping Updater ---%reset%
echo.

REM --- USER INPUT ---
set "newUserMap="
set /p "newUserMap=%cyan%Drag and drop the new .usmap file here or paste the full path and press Enter:%reset% "
echo.

REM --- VALIDATION ---
REM Remove quotes if present
set "newUserMap=%newUserMap:"=%"

REM Check if a path was entered
if not defined newUserMap (
    echo %red%ERROR: No file specified.%reset%
    pause
    goto start
)

REM Check if the specified file exists
if not exist "%newUserMap%" (
    echo %red%ERROR: The file was not found at the specified path.%reset%

    echo %red%Path: %newUserMap%%reset%
    pause
    goto start
)

REM --- EXECUTION ---
echo %yellow%--- Updating... ---%reset%

REM Define the destination folder in AppData
set "mappings_dir=%LOCALAPPDATA%\UAssetGUI\Mappings"

REM Create the destination folder if it doesn't exist
if not exist "%mappings_dir%\" (
    echo %magenta%INFO: Mappings folder not found, creating it...%reset%
    mkdir "%mappings_dir%"
)

echo Updating 'Rivals.usmap' file...

REM Copy the new file, renaming it and overwriting the old one.
REM /Y suppresses the confirmation prompt for overwriting.
copy /Y "%newUserMap%" "%mappings_dir%\Rivals.usmap" >nul

REM Check if the copy was successful
if errorlevel 1 (
    echo.
    echo %red%ERROR: Could not copy the file to the AppData folder.%reset%
    echo %red%Ensure you have the necessary permissions.%reset%
) else (
    echo.
    echo %green%===================================================%reset%
    echo %green%Update completed successfully!%reset%
    echo %green%'Rivals.usmap' has been updated.%reset%
    echo %green%===================================================%reset%
)

echo.
pause
exit