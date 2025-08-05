const { useState, useCallback, useMemo, useRef, useEffect } = React;

// component that makes all the little star particles for the header
const Particles = () => {
    const particles = useMemo(() => {
        const particleArray = [];
        const numParticles = 200; //  stars amount!
        for (let i = 0; i < numParticles; i++) {
            const size = Math.random() * 2.5 + 0.5; 
            const duration = 5 + Math.random() * 10; // shorter duration = faster particles
            const style = {
                width: `${size}px`,
                height: `${size}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `-${Math.random() * duration}s`, // negative delay makes them start at random points in the animation, no delay
                animationDuration: `${duration}s`, 
            };
            particleArray.push(<div key={i} className="particle" style={style}></div>);
        }
        return particleArray;
    }, []);

    return <div className="particles">{particles}</div>;
};


// helper function to dive into a nested object and change a value.
const setNestedValue = (obj, path, value) => {
  let schema = obj;
  for (let i = 0; i < path.length - 1; i++) {
    schema = schema[path[i]];
  }
  schema[path[path.length - 1]] = value;
};

const rgbaToDisplayHex = (r, g, b) => {
    const maxVal = Math.max(r, g, b, 1.0);
    const normR = r / maxVal;
    const normG = g / maxVal;
    const normB = b / maxVal;

    const toHex = (c) => {
        const numC = Number.isNaN(c) ? 0 : Number(c);
        const hex = Math.round(numC * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(normR)}${toHex(normG)}${toHex(normB)}`;
};

const hexToRgba = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return { r: r / 255, g: g / 255, b: b / 255 };
};

function rgbToHsl(r, g, b) {
    const maxVal = Math.max(r, g, b, 1.0);
    if (maxVal === 0) return [0, 0, 0];
    const r_norm = r / maxVal;
    const g_norm = g / maxVal;
    const b_norm = b / maxVal;
    
    const max = Math.max(r_norm, g_norm, b_norm), min = Math.min(r_norm, g_norm, b_norm);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r_norm: h = (g_norm - b_norm) / d + (g_norm < b_norm ? 6 : 0); break;
            case g_norm: h = (b_norm - r_norm) / d + 2; break;
            case b_norm: h = (r_norm - g_norm) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

const StyledPanel = ({ title, children, className, ...props }) => {
    return (
        <div className={`relative group ${className}`} style={{ backgroundColor: 'var(--bg-3)' }} {...props}>
            <div className="absolute inset-0 border-2 pointer-events-none transition-colors" style={{ borderColor: 'var(--bg-2)' }}></div>
            <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-main)' }}></div>
            <h2 className="absolute -top-3 left-4 px-2 text-xl font-medium" style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}>
               <span className="transition-colors group-hover:text-[--accent-main]">{title}</span>
            </h2>
            <div className="p-6 pt-8">
                {children}
            </div>
        </div>
    );
};

const ToggleSwitch = ({ label, enabled, setEnabled }) => {
    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</span>
            <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={enabled} onChange={() => setEnabled(!enabled)} />
                <div className="block w-14 h-8 transition-colors" style={{ backgroundColor: enabled ? 'var(--accent-main)' : 'var(--bg-1)'}}></div>
                <div className="absolute left-1 top-1 w-6 h-6 flex items-center justify-center transition-transform peer-checked:translate-x-full" 
                    style={{ 
                        backgroundColor: 'var(--bg-4)',
                        transform: enabled ? 'translateX(1.5rem)' : 'translateX(0)'
                    }}>
                    <svg className={`w-4 h-4 ${enabled ? 'hidden' : 'block'}`} style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <svg className={`w-5 h-5 ${enabled ? 'block' : 'hidden'}`} style={{ color: 'var(--accent-main)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
            </div>
        </label>
    );
};


// MAIN APP COMPONENT
function App() {
  const [colorParams, setColorParams] = useState([]);
  const [originalFiles, setOriginalFiles] = useState({});
  const [selectedParams, setSelectedParams] = useState(new Set());
  const [masterColor, setMasterColor] = useState('#ffffff');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const [ignoreGrayscale, setIgnoreGrayscale] = useState(true);
  const [preserveIntensity, setPreserveIntensity] = useState(true);
  const [showGrayscale, setShowGrayscale] = useState(true);
  const [hueShiftValue, setHueShiftValue] = useState(0);
  
  const [shuffleColors, setShuffleColors] = useState(['#ccffff', '#88eeee', '#66dddd']);
  
  const directoryHandleRef = useRef(null);

  const [folders, setFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState(new Set());


  // JSON format spider to find color parameters
  const parseJsonAndExtractColors = (json, fileName, relativePath, allParams) => {
        // FORMAT TYPE 1: VFX Material File (original format)
      const vectorParamsArray = json?.Exports?.[0]?.Data?.find(p => p.Name === 'VectorParameterValues');
      if (vectorParamsArray && vectorParamsArray.Value) {
        vectorParamsArray.Value.forEach((param, paramIndex) => {
          const paramInfo = param?.Value?.find(p => p.Name === 'ParameterInfo');
          const paramName = paramInfo?.Value?.find(p => p.Name === 'Name')?.Value;

          if (paramName) {
            const paramNameLower = paramName.toLowerCase();
            const hasColorOrTint = paramNameLower.includes('color') || paramNameLower.includes('tint');
            const exactExclusionList = ['LinerColor_Offset&Softness', 'ColorMaskChannel', 'MaskColor_Enemy'];
            const keywordExclusionList = ['offset', 'uv'];
            const isExactlyExcluded = exactExclusionList.includes(paramName);
            const hasExcludedKeyword = keywordExclusionList.some(keyword => paramNameLower.includes(keyword));

            if (hasColorOrTint && !isExactlyExcluded && !hasExcludedKeyword) {
                const paramValueObj = param?.Value?.find(p => p.Name === 'ParameterValue');
                const linearColor = paramValueObj?.Value?.find(p => p.Name === 'ParameterValue')?.Value;

                if (linearColor) {
                  const id = `${relativePath}-${paramName}-${paramIndex}`;
                  const path = [
                    'Exports', 0, 'Data', 
                    json.Exports[0].Data.findIndex(p => p.Name === 'VectorParameterValues'), 
                    'Value', paramIndex, 'Value', 
                    param.Value.findIndex(p => p.Name === 'ParameterValue'), 
                    'Value', 0, 'Value'
                  ];
                  
                  const sanitizedRgba = {
                      ...linearColor,
                      R: parseFloat(linearColor.R) || 0,
                      G: parseFloat(linearColor.G) || 0,
                      B: parseFloat(linearColor.B) || 0,
                      A: parseFloat(linearColor.A) || 0,
                  };

                  allParams.push({ id, fileName, paramName, path, rgba: sanitizedRgba, relativePath });
                }
            }
          }
        });
      }
      // FORMAT TYPE 2: RichText blueprints support
      else if (json?.Exports?.[0]?.$type === "UAssetAPI.ExportTypes.DataTableExport, UAssetAPI" && json.Exports[0].Table?.Data) {
          const tableData = json.Exports[0].Table.Data;
          const tablePath = ['Exports', 0, 'Table', 'Data'];

          tableData.forEach((row, rowIndex) => {
              if (row.StructType === "RichTextStyleRow") {
                  const styleName = row.Name;
                  const rowPath = [...tablePath, rowIndex, 'Value'];
                  findColorsRecursive(row.Value, rowPath, fileName, styleName, allParams, relativePath);
              }
          });
      }
  }

  const processFileObjects = (fileObjects, append = false) => {
      let allParams = append ? [...colorParams] : [];
      let newOriginalFiles = append ? {...originalFiles} : {};

      fileObjects.forEach(fileObj => {
          if (append && newOriginalFiles[fileObj.relativePath]) {
              return;
          }
          try {
              const json = JSON.parse(fileObj.content);
              newOriginalFiles[fileObj.relativePath] = json;
              parseJsonAndExtractColors(json, fileObj.name, fileObj.relativePath, allParams);
          } catch (error) {
              console.error("Error processing file content:", fileObj.name, error);
              alert(`Error processing file ${fileObj.name}.`);
          }
      });

      //  Extract folder list for filtering UI
      const uniqueFolders = [...new Set(allParams.map(p => {
          const lastSlash = p.relativePath.lastIndexOf('/');
          return lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/'; // root folder
      }))];
      setFolders(uniqueFolders.sort());
      setSelectedFolders(new Set(uniqueFolders)); // Select all by default

      setColorParams(allParams);
      setOriginalFiles(newOriginalFiles);
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files, colorParams.length > 0);
  };
  
const traverseFileTree = async (item, path, fileObjects) => {
      path = path || "";
      if (item.isFile) {
          return new Promise(resolve => {
              item.file(file => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      if (file.name.endsWith('.json')) {
                          fileObjects.push({ 
                              name: file.name, 
                              content: e.target.result,
                              relativePath: path ? `${path}/${file.name}` : file.name
                          });
                      }
                      resolve();
                  };
                  reader.readAsText(file);
              });
          });
      } else if (item.isDirectory) {
          const dirReader = item.createReader();
          // This loop fixes the WebEngine readEntries limitation of 100 max entries
          let allEntries = [];
          let currentEntries = await new Promise(resolve => dirReader.readEntries(resolve));
          while (currentEntries.length > 0) {
              allEntries = allEntries.concat(currentEntries);
              currentEntries = await new Promise(resolve => dirReader.readEntries(resolve));
          }
          for (let i = 0; i < allEntries.length; i++) {
              await traverseFileTree(allEntries[i], path ? `${path}/${item.name}` : item.name, fileObjects);
          }
      }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    
    const fileObjects = [];
    if (event.dataTransfer.items) {
        const promises = [];
        for (let i = 0; i < event.dataTransfer.items.length; i++) {
            const item = event.dataTransfer.items[i].webkitGetAsEntry();
            if (item) {
                promises.push(traverseFileTree(item, "", fileObjects));
            }
        }
        await Promise.all(promises);
        processFileObjects(fileObjects, colorParams.length > 0);
    }
  };


  const handleParamChange = (id, newRgba) => {
    setColorParams(prevParams =>
      prevParams.map(p => (p.id === id ? { ...p, rgba: newRgba } : p))
    );
  };

  const handleSelectionChange = (id) => {
    setSelectedParams(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedParams.size === filteredParams.length) {
      setSelectedParams(new Set());
    } else {
      setSelectedParams(new Set(filteredParams.map(p => p.id)));
    }
  };

  const applyColor = (p, newColorRgba) => {
    const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;

    if (ignoreGrayscale && isGrayscale) {
        return p.rgba;
    }

    if (preserveIntensity) {
        const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
        if (originalIntensity === 0) return { ...p.rgba, R: 0, G: 0, B: 0 };

        const maxNew = Math.max(newColorRgba.r, newColorRgba.g, newColorRgba.b);
        if (maxNew === 0) return { ...p.rgba, R: 0, G: 0, B: 0 };

        const normalizedNewR = newColorRgba.r / maxNew;
        const normalizedNewG = newColorRgba.g / maxNew;
        const normalizedNewB = newColorRgba.b / maxNew;

        return {
            ...p.rgba,
            R: normalizedNewR * originalIntensity,
            G: normalizedNewG * originalIntensity,
            B: normalizedNewB * originalIntensity,
        };
    } else {
        return { ...p.rgba, R: newColorRgba.r, G: newColorRgba.g, B: newColorRgba.b };
    }
  };

  const applyMasterColor = () => {
    if (selectedParams.size === 0) {
        alert("No parameters selected. Please select at least one parameter before applying the master color.");
        return;
    }
    const newRgba = hexToRgba(masterColor);
    setColorParams(prevParams =>
      prevParams.map(p => {
        if (selectedParams.has(p.id)) {
            return { ...p, rgba: applyColor(p, newRgba) };
        }
        return p;
      })
    );
  };
  
  const applyHueShift = () => {
    if (selectedParams.size === 0) {
        alert("No parameters selected. Please select at least one parameter before applying the hue shift.");
        return;
    }

    setColorParams(prevParams =>
      prevParams.map(p => {
        if (selectedParams.has(p.id)) {
            const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;
            if (ignoreGrayscale && isGrayscale) return p;

            const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
            const [h, s, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
            
            let newHue = h + (hueShiftValue / 360);
            if (newHue < 0) newHue += 1;
            if (newHue > 1) newHue -= 1;
            
            const [r, g, b] = hslToRgb(newHue, s, l);

            return { ...p, rgba: { ...p.rgba, R: r * originalIntensity, G: g * originalIntensity, B: b * originalIntensity } };
        }
        return p;
      })
    );
    
    setHueShiftValue(0);
  };
  
  const applyShuffle = () => {
    if (selectedParams.size === 0) {
        alert("No parameters selected. Please select at least one parameter before applying shuffle.");
        return;
    }

    const selectedFiles = [...new Set(colorParams.filter(p => selectedParams.has(p.id)).map(p => p.fileName))];
    const fileToColorMap = {};
    selectedFiles.forEach((fileName, index) => {
        fileToColorMap[fileName] = shuffleColors[index % shuffleColors.length];
    });

    setColorParams(prevParams =>
      prevParams.map(p => {
        if (selectedParams.has(p.id)) {
            const newColorHex = fileToColorMap[p.fileName];
            if (newColorHex) {
                const newRgba = hexToRgba(newColorHex);
                return { ...p, rgba: applyColor(p, newRgba) };
            }
        }
        return p;
      })
    );
  };
  
  const handleShuffleColorChange = (index, color) => {
    const newShuffleColors = [...shuffleColors];
    newShuffleColors[index] = color;
    setShuffleColors(newShuffleColors);
  };


const handleSave = async () => {
    if (colorParams.length === 0) {
        alert("No parameters to save.");
        return;
    }
    
    setSaveStatus('Saving...');

    const modifiedFiles = JSON.parse(JSON.stringify(originalFiles));
    colorParams.forEach(param => {
      // Use relativePath to get the right path
      const fileToModify = modifiedFiles[param.relativePath]; 
      if(fileToModify) {
        setNestedValue(fileToModify, param.path, param.rgba);
      }
    });
    
    const filesToSave = new Set(Object.keys(modifiedFiles));

    try {
        let dirHandle = directoryHandleRef.current;
        // Asks for save path only one time
        if (!dirHandle) {
            dirHandle = await window.showDirectoryPicker();
            directoryHandleRef.current = dirHandle;
        }
        const outputDirHandle = await dirHandle.getDirectoryHandle('output', { create: true });

        for (const relativePath of filesToSave) {
            const pathParts = relativePath.split('/');
            const fileName = pathParts.pop(); // Gets file name
            let currentDirHandle = outputDirHandle;

            // Make every subfolder needed
            for (const part of pathParts) {
                currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
            }

            // Write new files to the right folder
            const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(modifiedFiles[relativePath], null, 2));
            await writable.close();
        }
        
        setSaveStatus(`All ${filesToSave.size} files saved to 'output' folder!`);

    } catch (err) {
        console.error("Error saving files:", err);
        if (err.name !== 'AbortError') {
           setSaveStatus(`Error: ${err.message}.`);
        } else {
           setSaveStatus('Save cancelled.');
        }
    }

    setTimeout(() => setSaveStatus(''), 10000);
  };

  const handleFolderToggle = (folder) => {
      setSelectedFolders(prev => {
          const newSet = new Set(prev);
          if (newSet.has(folder)) {
              newSet.delete(folder);
          } else {
              newSet.add(folder);
          }
          return newSet;
      });
  };
  
  const filteredParams = useMemo(() => {
    let params = colorParams;

    // Filter by selected folders
    if (folders.length > 0) {
        params = params.filter(p => {
            const lastSlash = p.relativePath.lastIndexOf('/');
            const folder = lastSlash > 0 ? p.relativePath.substring(0, lastSlash) : '/';
            return selectedFolders.has(folder);
        });
    }

    if (!showGrayscale) {
        params = params.filter(p => p.rgba.R !== p.rgba.G || p.rgba.G !== p.rgba.B);
    }

    if (searchTerm) {
        params = params.filter(p => 
          p.paramName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.fileName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    return params;
  }, [colorParams, searchTerm, showGrayscale, selectedFolders, folders]);

  return (
    <div style={{ backgroundColor: 'var(--bg-4)', color: 'var(--text-3)' }} className="min-h-screen p-6">
      <div className="w-full">
        <div className="relative group p-4 border-2 particle-header" style={{ borderColor: 'var(--bg-2)'}}>
            <Particles />
            <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-main)', zIndex: 2 }}></div>
            <div className="flex items-center gap-4 relative" style={{ zIndex: 1 }}>
                <img src="./assets/saturn-logo.svg" alt="Rivals Logo" className="h-24 filter brightness-0 invert" />
                <h1 className="text-5xl font-bold" style={{ color: 'var(--text-1)' }}>Rivals VFX Editor</h1>
            </div>
            <span className="absolute bottom-2 right-4 text-xs" style={{ color: 'var(--text-4)', zIndex: 1 }}>
                by Saturn
            </span>
        </div>
        
        <div className="my-8">
            {colorParams.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                    <div className="lg:col-span-3">
                        <StyledPanel title="Global Controls">
                            <div className="flex flex-col space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Fixed Color</h3>
                                    <div className="flex items-center space-x-4">
                                        <input type="color" value={masterColor} onChange={e => setMasterColor(e.target.value)} className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }}/>
                                        <button onClick={applyMasterColor} className="flex-grow px-4 py-3 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                            Apply Fixed Color
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                     <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Hue Shift</h3>
                                        <span className="font-mono text-lg" style={{ color: 'var(--text-3)' }}>{hueShiftValue}°</span>
                                     </div>
                                     <div>
                                        <input id="hue-shift" type="range" min="-180" max="180" value={hueShiftValue} 
                                            onChange={(e) => setHueShiftValue(parseInt(e.target.value))}
                                            onDoubleClick={() => setHueShiftValue(0)}
                                            className="w-full h-2 rounded-none appearance-none cursor-pointer" />
                                    </div>
                                    <button onClick={applyHueShift} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                        Apply Hue Shift
                                    </button>
                                </div>
                                <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                     <h3 className="text-lg font-medium" style={{ color: 'var(--text-2)' }}>Color Shuffle</h3>
                                     <div className="flex justify-around items-center">
                                        {shuffleColors.map((color, index) => (
                                            <input key={index} type="color" value={color} onChange={(e) => handleShuffleColorChange(index, e.target.value)} className="w-12 h-12 p-0 border-0 rounded-none cursor-pointer" style={{ backgroundColor: 'transparent' }}/>
                                        ))}
                                     </div>
                                     <button onClick={applyShuffle} className="w-full px-4 py-2 font-medium rounded-none transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }} disabled={selectedParams.size === 0}>
                                        Apply Shuffle
                                    </button>
                                </div>
                                <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--bg-2)' }}>
                                    <ToggleSwitch label="Preserve Intensity (Recommended)" enabled={preserveIntensity} setEnabled={setPreserveIntensity} />
                                    <ToggleSwitch label="Ignore Grayscale (R=G=B)" enabled={ignoreGrayscale} setEnabled={setIgnoreGrayscale} />
                                </div>
                            </div>
                        </StyledPanel>
                    </div>
                    
                    <div className="lg:col-span-7">
                      <StyledPanel title="Parameters" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                        <div className="p-4 flex flex-col gap-4 border-b" style={{ borderColor: 'var(--bg-2)' }}>
                            <div className="flex justify-between items-center w-full gap-4">
                                {/* Left group: folder filters */}
                                <div className="flex-grow">
                                    {folders.length > 1 && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-3)' }}>Filter by Folder:</h4>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                                                {folders.map(folder => (
                                                    <label key={folder} className="flex items-center text-sm cursor-pointer" style={{ color: 'var(--text-3)' }}>
                                                        <input type="checkbox" checked={selectedFolders.has(folder)} onChange={() => handleFolderToggle(folder)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}/>
                                                        {folder === '/' ? 'Root' : folder}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right group: show filter, searchbox, save button */}
                                <div className="flex-shrink-0 flex items-center gap-4">
                                    <label className="flex items-center text-sm cursor-pointer" style={{ color: 'var(--text-3)' }}>
                                        <input type="checkbox" checked={showGrayscale} onChange={() => setShowGrayscale(!showGrayscale)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0 mr-2" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}/>
                                        Show Grayscale
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Filter by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-64 px-3 py-2 rounded-none focus:outline-none focus:ring-2"
                                        style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)', 'ringColor': 'var(--accent-main)' }}
                                    />
                                    <div className="flex items-center gap-2">
                                        {saveStatus && <span className="text-sm whitespace-nowrap" style={{ color: 'var(--text-4)' }}>{saveStatus}</span>}
                                        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 font-medium rounded-none transition-colors shadow-md" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-1)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4M7 21h10M5 21H3V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2M12 11v-4M9 11h6"></path>
                                            </svg>
                                            Save Files
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-4)' }}>{filteredParams.length} color parameters found.</p>
                        </div>
                        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>

                          <table className="w-full text-sm text-left">
                            <thead style={{ color: 'var(--text-4)' }}>
                              <tr style={{ borderBottom: '2px solid var(--bg-2)' }}>
                                <th scope="col" className="p-4">
                                  <input type="checkbox" onChange={handleSelectAll} checked={filteredParams.length > 0 && selectedParams.size === filteredParams.length} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}/>
                                </th>
                                <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider">Path</th>
                                <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider">Parameter Name</th>
                                <th scope="col" className="px-6 py-3 font-medium uppercase tracking-wider">Color</th>
                                <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">R</th>
                                <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">G</th>
                                <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">B</th>
                                <th scope="col" className="px-6 py-3 text-center font-medium uppercase tracking-wider">A</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredParams.map(p => {
                                let displayRgba = p.rgba;
                                let isPreviewing = false;

                                if (selectedParams.has(p.id) && hueShiftValue !== 0) {
                                    const isGrayscale = p.rgba.R === p.rgba.G && p.rgba.G === p.rgba.B;
                                    if (! (ignoreGrayscale && isGrayscale) ) {
                                        isPreviewing = true;
                                        const originalIntensity = Math.max(p.rgba.R, p.rgba.G, p.rgba.B);
                                        const [h, s, l] = rgbToHsl(p.rgba.R, p.rgba.G, p.rgba.B);
                                        let newHue = h + (hueShiftValue / 360);
                                        if (newHue < 0) newHue += 1;
                                        if (newHue > 1) newHue -= 1;
                                        const [r, g, b] = hslToRgb(newHue, s, l);
                                        displayRgba = { ...p.rgba, R: r * originalIntensity, G: g * originalIntensity, B: b * originalIntensity };
                                    }
                                }
                                
                                const displayHexColor = rgbaToDisplayHex(displayRgba.R, displayRgba.G, displayRgba.B);

                                return (
                                  <tr key={p.id} className="hover:bg-opacity-50" style={{ borderBottom: '1px solid var(--bg-2)', backgroundColor: isPreviewing ? 'rgba(204, 255, 255, 0.05)' : 'transparent' }}>
                                    <td className="w-4 p-4">
                                      <input type="checkbox" checked={selectedParams.has(p.id)} onChange={() => handleSelectionChange(p.id)} className="w-4 h-4 rounded-none focus:ring-offset-0 focus:ring-0" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--accent-main)' }}/>
                                    </td>
                                    <td className="px-6 py-4 font-medium whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{p.relativePath}</td>
                                    <td className="px-6 py-4">{p.paramName}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={displayHexColor}
                                                onChange={(e) => {
                                                    const newRgb = hexToRgba(e.target.value);
                                                    handleParamChange(p.id, {...p.rgba, ...newRgb});
                                                }}
                                                className="w-8 h-8 p-0 border-2 cursor-pointer"
                                                style={{ backgroundColor: 'transparent', borderColor: 'var(--bg-1)' }}
                                            />
                                           <span className="font-mono">{displayHexColor.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    {['R', 'G', 'B', 'A'].map(channel => (
                                      <td key={channel} className="px-2 py-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={(Number(p.rgba[channel]) || 0).toFixed(4)}
                                          onChange={(e) => handleParamChange(p.id, { ...p.rgba, [channel]: parseFloat(e.target.value) || 0 })}
                                          className="w-24 px-2 py-1 rounded-none text-center focus:outline-none focus:ring-2"
                                          style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-1)', color: 'var(--text-2)', 'ringColor': 'var(--accent-main)' }}
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </StyledPanel>
                    </div>
                </div>
            ) : (
                <div className="my-8">
                    <StyledPanel title="Load Files">
                        <div 
                            className={`text-center py-20 px-6 border-2 border-dashed transition-colors`}
                            style={{ backgroundColor: 'var(--bg-2)', borderColor: isDragging ? 'var(--accent-main)' : 'var(--bg-1)' }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                <svg className="mx-auto h-12 w-12" style={{ color: 'var(--text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <path d="M9 15.5a1.5 1.5 0 0 0-3 0v1a1.5 1.5 0 0 0 3 0"></path>
                                    <path d="M18 15.5a1.5 1.5 0 0 0-3 0v1a1.5 1.5 0 0 0 3 0"></path>
                                </svg>
                                <h3 className="mt-2 text-lg font-medium" style={{ color: 'var(--text-2)' }}>No files loaded</h3>
                                <p className="mt-1 text-sm" style={{ color: 'var(--text-4)' }}>Drag and drop .json files here to begin.</p>
                                <input type='file' className="hidden" multiple accept=".json" onChange={handleFileChange} />
                            </label>
                        </div>
                    </StyledPanel>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

// Render the app into the page
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);

