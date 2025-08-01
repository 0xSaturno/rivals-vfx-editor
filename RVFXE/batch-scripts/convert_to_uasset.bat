@echo off
title JSON to UAsset Conversion

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
echo %yellow%--- JSON to UAsset Conversion (Recursive) ---%reset%
echo.

REM --- USER INPUT ---
echo %yellow%--- USER INPUT ---%reset%
set "sourceFolder="
set /p "sourceFolder=%cyan%Enter the path to the root folder with your .json files and press Enter: %reset%"

set "outputFolder="
set /p "outputFolder=%cyan%Enter the path for the output .uasset files and press Enter: %reset%"

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
echo %magenta%Starting conversion from JSON to UAsset...%reset%
echo %magenta%Source folder:   %white%%sourceFolder%%reset%
echo %magenta%Output folder:  %white%%outputFolder%%reset%
echo %magenta%Skipping any folders named 'Curves'.%reset%
echo.

REM --- CONVERSION LOOP (RECURSIVE WITH SKIP LOGIC) ---
setlocal enabledelayedexpansion

REM Loop recursively through each .json file
for /r "%sourceFolder%" %%F in (*.json) do (
    set "fullPath=%%F"
    
    REM Check if the file path contains folders to exclude
    echo "!fullPath!" | findstr /I /C:"\\Curves\\" >nul
    
    REM If 'errorlevel' is 1, no match was found, so proceed with conversion
    if errorlevel 1 (
        REM Get the relative path of the file
        set "relativePath=!fullPath:%sourceFolder%\=!"
        
        REM Build the output path preserving the folder structure
        set "outputPath=%outputFolder%\!relativePath!"
        set "outputUassetPath=!outputPath:.json=.uasset!"
        
        REM Create the destination folder structure if it doesn't exist
        for %%P in ("!outputPath!") do (
            if not exist "%%~dpP" mkdir "%%~dpP"
        )
        
        echo %white%Converting: "!relativePath!"%reset%
        
        REM Executes the fromjson command
        UAssetGUI fromjson "%%F" "!outputUassetPath!" Rivals
    ) else (
        REM If 'errorlevel' is 0, a folder to exclude was found. Skip the file.
        echo %magenta%Skipping: "%%~nxF" in forbidden folder.%reset%
    )
)

endlocal

REM --- COMPLETION ---
echo.
echo %green%====================================%reset%
echo %green%Conversion complete!%reset%
echo.
echo %green%The .uasset files are located in the "%outputFolder%" folder.%reset%
echo %green%====================================%reset%
pause