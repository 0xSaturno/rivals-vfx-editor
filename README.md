# **<img src="https://cdn.jsdelivr.net/gh/ilSaturnooooo/saturno-resourcers/saturno_logo_full-alpha-icon.png" width="28"/> Rivals VFX Editor**
[![Release](https://img.shields.io/github/v/release/0xSaturno/rivals-vfx-editor.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/0xSaturno/rivals-vfx-editor/total.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/releases)
[![Issues](https://img.shields.io/github/issues/0xSaturno/rivals-vfx-editor.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/issues)
[![CI Status](https://img.shields.io/github/actions/workflow/status/0xSaturno/rivals-vfx-editor/release.yml?label=CI)](https://github.com/0xSaturno/rivals-vfx-editor/actions)

A powerful desktop editor for batch editing color parameters in Marvel Rivals' VFX material files.

## **✨ Features**

* **Hero Browser Suite**: Fully procedural Hero Browser building directly from game files to effortlessly extract, convert, and load VFX assets via an intuitive interface.
* **Multiple File Upload**: Load one or more individual `.uasset` files at once via a file picker or drag-and-drop.
* **Recursive Folder Import**: Load entire folders and their subfolders. The editor will find all compatible files within them, and folder structure will be kept when changes are saved.
* **Multi-Format Color Parsing**: Parsing and editing support for **WidgetBlueprint**, **MaterialInstance**, and **MasterMaterial** `.uasset` types.
* **Automated Usmap Management**: Seamlessly handles and manages `.usmap` files in the background required for asset parsing.
* **Advanced Selection**:
  * Use checkboxes for individual parameter selection.
  * `Shift + Click` to select a range of parameters.
  * `Alt + Click` to deselect a range.
* **Direct Color Editing**:
  * Click on a color to open the color wheel.
  * Edit the hex code directly in the color field for precise adjustments, copy, and paste.
* **Batch Editing**:
  * **Single Color**: Apply a specific color to all selected parameters.
  * **Hue Shift**: Adjust the hue of selected colors with an interactive slider. *Double click the dot to reset the value.*
  * **Color Shuffle**: Apply a user-defined color palette to the selected parameters, assigning a different color to each one sequentially.
  * **Brightness Multiplier**: Dynamically scale the intensity/brightness of selected colors with a dedicated slider.
* **Advanced Editing Options**:
  * **Preserve Intensity**: Maintains the original brightness of the color when applying a new one. (Recommended to keep enabled)
  * **Ignore Grayscale**: Excludes grayscale colors (where R=G=B) from global edits.
* **Real-Time Preview**: Instantly see color changes reflected in the parameter table without needing to save the files.
* **Powerful Filtering**:
  * Filter parameters by name or filename.
  * Filter parameters by their folder path.
  * Filter parameters dynamically by a specific **Hue Range**.
  * Toggle the visibility of grayscale and Enemy parameters.
* **Automated Uasset Processing**:
  * Includes UAssetToolRivals to directly process game assets into the editor.
* **Cache System**:
  * Efficiently manages converted JSON files to speed up reloading and processing.
* **Parser Settings**:
  * Fully customizable keyword filtering and color property definitions to fine-tune which parameters are detected.
* **Extra App Controls**:
  * Control **App UI Scale** via the settings tab or use `Ctrl + Mouse scroll wheel`.
  * `F5` to reset the app.

## **🌈 VFX Editor Usage**

1. **Launch the `Rivals VFX Editor.exe` app**.
2. **Load your .uasset files** either by utilizing the built-in **Hero Browser** to extract and load VFX assets for specific characters directly from your game path, or by manually dragging and dropping files into the import area.
3. **Select the parameters** you want to modify using the checkboxes.
4. **Use the Global Controls** in the left panel to make your desired changes.
5. **Save your files** by clicking the green "Save UAsset" button. The modified files will be ready for paking.

### **🧱 Requirements**
To run the background asset extraction and parsing tool UAssetTool, you must have the **.NET 8.0 Runtime** installed on your system.
* [Download .NET 8.0 Desktop Runtime (x64)](https://dotnet.microsoft.com/en-us/download/dotnet/thank-you/runtime-desktop-8.0.26-windows-x64-installer)

### ℹ️ acknowledgements
- [UAssetToolRivals](https://github.com/XzantGaming/UassetToolRivals): included in this software as requirement for game files processing