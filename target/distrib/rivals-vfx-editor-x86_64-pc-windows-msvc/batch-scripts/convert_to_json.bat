@echo off
title UAsset to JSON Conversion

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
echo %yellow%--- UAsset to JSON Conversion ---%reset%
echo.

REM --- USER INPUT ---
echo %yellow%--- USER INPUT ---%reset%
set "sourceFolder="
set /p "sourceFolder=%cyan%Enter the path to the folder with your .uasset files and press Enter: %reset%"

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
echo %magenta%Starting conversion...%reset%
echo %magenta%Source folder:   %white%%sourceFolder%%reset%
echo %magenta%Output folder:  %white%%outputFolder%%reset%
echo.

REM Loop through each .uasset file in the user-provided folder
for %%F in ("%sourceFolder%\*.uasset") do (
    echo %white%Converting: "%%~nxF"%reset%
    
    REM Executes the command, specifying the full path to UAssetGUI.exe
    REM %~dp0 expands to the path of the folder where this batch script is located
    REM Syntax: UAssetGUI tojson <source> <destination> <engine_version> <mapping_name>
    "%~dp0UAssetGUI.exe" tojson "%%F" "%outputFolder%\%%~nF.json" VER_UE5_3 Rivals
)

REM --- COMPLETION ---
echo.
echo %green%====================================%reset%
echo %green%Conversion complete!%reset%
echo.
echo %green%The .json files are located in the "%outputFolder%" folder.%reset%
echo %green%====================================%reset%
pause