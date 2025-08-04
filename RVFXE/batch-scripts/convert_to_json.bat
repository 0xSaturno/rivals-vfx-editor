@echo off
title UAsset to JSON (Recursive, Filtered)

REM Enable ANSI escape codes for colors
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "DEL=%%a"
)

REM --- COLOR DEFINITIONS ---
set "yellow=[93m"
set "cyan=[96m"
set "red=[91m"
set "magenta=[95m"
set "green=[92m"
set "white=[97m"
set "reset=[0m"

REM --- SCRIPT START ---
echo %yellow%--- UAsset to JSON Conversion (Recursive, Filtered) ---%reset%
echo.

REM --- USER INPUT ---
echo %yellow%--- USER INPUT ---%reset%
set "sourceFolder="
set /p "sourceFolder=%cyan%Enter the path to the root folder with your .uasset files and press Enter: %reset%"

set "outputFolder="
set /p "outputFolder=%cyan%Enter the path for the output .json files and press Enter: %reset%"

REM --- VALIDATION ---
echo.
echo %yellow%--- VALIDATION ---%reset%
REM Removes quotes if the user added them by mistake
set "sourceFolder=%sourceFolder:"=%"
set "outputFolder=%outputFolder:"=%"

REM Check if a source path was entered
if not defined sourceFolder (
    echo %red%ERROR: No source folder path was entered. Exiting.%reset%
    pause
    exit /b
)

REM Check if the source folder exists
if not exist "%sourceFolder%" (
    echo %red%ERROR: The source folder was not found!%reset%
    echo %red%Path provided: %sourceFolder%%reset%
    pause
    exit /b
)
echo %green%Source folder found.%reset%

REM Create the destination folder if it doesn't exist
if not exist "%outputFolder%" (
    echo %magenta%INFO: Output folder not found. Creating it...%reset%
    mkdir "%outputFolder%"
) else (
    echo %green%Output folder already exists.%reset%
)

REM --- CONVERSION ---
echo.
echo %yellow%--- CONVERSION PROCESS ---%reset%

REM --- SETUP MAPPINGS (New Section) ---
echo %magenta%Setting up UAssetGUI mappings...%reset%
set "mappings_dir=%LOCALAPPDATA%\UAssetGUI\Mappings"
set "source_map=%~dp0Rivals.usmap"

REM Create the mappings directory if it doesn't exist
if not exist "%mappings_dir%\" (
    echo %magenta%INFO: UAssetGUI Mappings folder not found, creating it...%reset%
    mkdir "%mappings_dir%"
)

REM Copy the .usmap file if it doesn't already exist in the destination
if not exist "%mappings_dir%\Rivals.usmap" (
    if exist "%source_map%" (
        echo %magenta%INFO: Copying 'Rivals.usmap' to AppData...%reset%
        copy "%source_map%" "%mappings_dir%\" >nul
    ) else (
        echo %red%WARNING: 'Rivals.usmap' not found in the script directory. Conversion may fail.%reset%
    )
) else (
    echo %green%Mappings file 'Rivals.usmap' already exists in AppData. Skipping copy.%reset%
)
echo.
REM --- END NEW SECTION ---

echo %magenta%Starting conversion...%reset%
echo %magenta%Source folder:   %white%%sourceFolder%%reset%
echo %magenta%Output folder:  %white%%outputFolder%%reset%
echo %magenta%Skipping folders 'Curves', 'MPC' and files starting with 'M_'.%reset%
echo.

REM --- CONVERSION LOOP (RECURSIVE WITH SKIP LOGIC) ---
setlocal enabledelayedexpansion

REM Loop recursively through each .uasset file
for /r "%sourceFolder%" %%F in (*.uasset) do (
    set "fullPath=%%F"
    set "fileName=%%~nxF"
    set "skip=0"

    REM --- SKIP LOGIC ---
    REM 1. Check for forbidden folders
    echo "!fullPath!" | findstr /I /C:"\\Curves\\" /C:"\\MPC\\" >nul
    if not errorlevel 1 set "skip=1"

    REM 2. Check for forbidden file prefix if not already marked for skip
    if !skip! equ 0 (
        REM Checks if the first 2 characters of the filename are "M_", case-insensitive.
        if /I "!fileName:~0,2!" == "M_" set "skip=1"
    )
    
    REM --- PROCESS OR SKIP ---
    if !skip! equ 1 (
        REM File should be skipped
        echo %magenta%Skipping: "!fileName!"%reset%
    ) else (
        REM File should be converted
        REM Get the relative path of the file
        set "relativePath=!fullPath:%sourceFolder%\=!"
        
        REM Build the output path preserving the folder structure
        set "outputPath=%outputFolder%\!relativePath!"
        set "outputJsonPath=!outputPath:.uasset=.json!"
        
        REM Create the destination folder structure if it doesn't exist
        for %%P in ("!outputPath!") do (
            if not exist "%%~dpP" mkdir "%%~dpP"
        )
        
        echo %white%Converting: "!relativePath!"%reset%
        
        REM Executes the command
        "%~dp0UAssetGUI.exe" tojson "%%F" "!outputJsonPath!" VER_UE5_3 Rivals
    )
)

endlocal

REM --- COMPLETION ---
echo.
echo %green%====================================%reset%
echo %green%Conversion complete!%reset%
echo.
echo %green%The .json files are located in the "%outputFolder%" folder.%reset%
echo %green%====================================%reset%
pause