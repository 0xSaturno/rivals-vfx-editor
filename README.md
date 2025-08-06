# **<img src="https://cdn.jsdelivr.net/gh/ilSaturnooooo/saturno-resourcers/saturno_logo_full-alpha-icon.png" width="28"/> Rivals VFX Editor**
[![Release](https://img.shields.io/github/v/release/0xSaturno/rivals-vfx-editor.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/0xSaturno/rivals-vfx-editor/total.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/releases)
[![Issues](https://img.shields.io/github/issues/0xSaturno/rivals-vfx-editor.svg?style=flat-square)](https://github.com/0xSaturno/rivals-vfx-editor/issues)
[![CI Status](https://img.shields.io/github/actions/workflow/status/0xSaturno/rivals-vfx-editor/release.yml?label=CI)](https://github.com/0xSaturno/rivals-vfx-editor/actions)

A simple yet powerful web-based editor for batch editing color parameters in Marvel Rivals' VFX material files.

## **✨ Features**

* **Multiple File Upload**: Load one or more individual `.json` files at once via a file picker or drag-and-drop.
* **Recursive Folder Import**: Load entire folders and their subfolders. The editor will find all compatible files within them, and folder structure will be kept when changes are saved.
* **Advanced Selection**:
  * Use checkboxes for individual parameter selection.
  * `Shift + Click` to select a range of parameters.
  * `Alt + Click` to deselect a range.
* **Automatic Color Detection**: Automatically parses uploaded files to find and list all "VectorParameterValues" that contain the word "color" and "tint".
* **Direct Color Editing**:
  * Click on a color to open the color wheel.
  * Edit the hex code directly in the color field for precise adjustments, copy, and paste.
* **Batch Editing**:
  * **Single Color**: Apply a specific color to all selected parameters.
  * **Hue Shift**: Adjust the hue of selected colors with an interactive slider. *Double click the dot to reset the value.*
  * **Color Shuffle**: Apply a user-defined color palette to the selected parameters, assigning a different color to each one sequentially.
* **Advanced Editing Options**:
  * **Preserve Intensity**: Maintains the original brightness of the color when applying a new one. (Recommended to keep enabled)
  * **Ignore Grayscale**: Excludes grayscale colors (where R=G=B) from global edits.
* **Real-Time Preview**: Instantly see color changes reflected in the parameter table without needing to save the files.
* **Powerful Filtering**:
  * Filter parameters by name or filename.
  * Filter parameters by their folder path.
  * Toggle the visibility of grayscale parameters.
* **Simplified Saving**:
  * Save all modified files using the File System Access API for better performance and reliability.
* **Automated Uasset Conversion Scripts**:
  * Includes batch script to easily convert multiple .uasset files to .json and vice-versa. Check setup and usage.
* **Extra App Controls**:
  * `Ctrl + Mouse scroll wheel` to scale the app UI.
  * `F5` to reset the app. 

## **🌈 VFX Editor Usage**

1. **Launch the `Rivals VFX Editor.exe` app**.
2. **Load your .json files** by dragging them into the import area or by clicking to select them.
3. **Select the parameters** you want to modify using the checkboxes.
4. **Use the Global Controls** in the left panel to make your desired changes.
5. **Save your files** by clicking the green "Save Files" button. A window will appear to ask for your output folder, grant the app access to that path. The modified files will be saved to a new folder named `output` in the same location you chose to save.
6. **Convert your edited .json files** with the `convert_to_uasset.bat` script, wait for the conversion to complete and the converted files will be ready for paking.

## **🔄️ Conversion Scripts Usage**

* `convert_to_json.bat` can be used to batch convert .uasset files to .json.
* `convert_to_uasset.bat` can be used to batch convert .json files back to .uasset.
* `update_mappings.bat` can be used to update UassetGUI to the latest mappings file.


### ℹ️ acknowledgements
- [UassetGUI](https://github.com/atenfyr/UAssetGUI): included in this software as requirement for conversion scripts