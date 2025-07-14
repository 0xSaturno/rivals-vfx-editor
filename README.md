# ![.](https://cdn.jsdelivr.net/gh/ilSaturnooooo/saturno-resourcers/saturno_logo_full-alpha-icon.png)**Rivals VFX Editor**

A simple yet powerful web-based editor for batch-editing color parameters in Marvel Rivals' VFX material files.

## **✨ Features**

* **Multiple File Upload**: Load one or more .json files at once via a file picker or drag-and-drop.  
* **Automatic Color Detection**: Automatically parses uploaded files to find and list all "VectorParameterValues" that contain the word "color".  
* **Batch Editing**:  
  * **Single Color**: Apply a specific color to all selected parameters.  
  * **Hue Shift**: Adjust the hue of selected colors with an interactive slider. _Double click the dot to reset the value._
  * **Color Shuffle**: Apply a user-defined color palette to the selected files, assigning a different color to each file.  
* **Advanced Editing Options**:  
  * **Preserve Intensity**: Maintains the original brightness of the color when applying a new one. (Recommended to keep enabled)  
  * **Ignore Grayscale**: Excludes grayscale colors (where R=G=B) from global edits.  
* **Real-Time Preview**: Instantly see color changes reflected in the parameter table without needing to save the files.  
* **Filtering and Display**:  
  * Filter parameters by name or filename.  
  * Toggle the visibility of grayscale parameters.  
* **Simplified Saving**: Save all modified files to an "output" folder on your computer with a single click.

## **🏗️ Setup Requirements**

1. **Setup** the requirements to make the conversion scripts work by placing `UassetGUI.exe` in the VFX-editor folder.
2. Get latest mappings file for Rivals, move it to the VFX-editor folder, rename it to `"Rivals.usmap"` and set it up inside your UassetGUI. 
> You need to do this even if you already have done it before because of the way UassetGUI works.
3. You should be ready to use the batch scripts when they will be needed.

## **🌈 VFX Editor Usage**

1. **Open the `vfx-editor.html` file** in any Chromium-based browser. 
> Disable any dark mode extensions for the html page only to ensure better compatibility.
2. **Load your .json files** by dragging them into the import area or by clicking to select them.
3. **Select the parameters** you want to modify using the checkboxes.
4. **Use the global controls** in the left panel to make your desired changes.
5. **Save your files** by clicking the "Save Files" button. A window will appear to ask for your output folder, grant access the browser to that path. The modified files will be saved to a new folder named `output` in the same location you chose to save. 
6. **Convert your edited .json files** with the `convert_to_uasset.bat` script, wait for the conversion to complete and the converted files will be ready for paking.

## **🔄️ Convertion scripts Usage**

Check **Setup Requirements** first to be able to use the scripts.
* `convert_to_json.bat` can be used to batch convert .uasset files to .json.
* `convert_to_uasset.bat` can be used to batch convert .json files back to .uasset.



*by Saturn*