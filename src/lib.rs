use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

// ============================================================================
// STATE & TYPES
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct FilterDictionary {
    pub include_keywords: Vec<String>,
    pub exclude_keywords: Vec<String>,
    pub color_property_names: Vec<String>,
}

impl Default for FilterDictionary {
    fn default() -> Self {
        Self {
            include_keywords: vec![
                "color".to_string(),
                "tint".to_string(),
                "Enemy".to_string(),
                "Emiss".to_string(),
                "Diff".to_string(),
            ],
            exclude_keywords: vec![
                "Offset".to_string(),
                "uv".to_string(),
                "ColorMaskChannel".to_string(),
                "MaskColor_Enemy".to_string(),
            ],
            color_property_names: vec![
                "ColorAndOpacity".to_string(),
                "SpecifiedColor".to_string(),
                "BaseColor".to_string(),
                "HighlightColor".to_string(),
                "FontTopColor".to_string(),
                "FontButtomColor".to_string(),
                "VectorParameter".to_string(),
                "ShadowColor".to_string(),
                "ContentColor".to_string(),
                "OutlineColor".to_string(),
                "Color".to_string(),
                "TextColor".to_string(),
                "BackgroundColor".to_string(),
            ],
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub usmap_path: Option<String>,
    pub show_detailed_errors: bool,
    #[serde(default)]
    pub auto_clear_cache: bool,
    #[serde(default)]
    pub filter_dictionary: FilterDictionary,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            usmap_path: None,
            show_detailed_errors: true,
            auto_clear_cache: false,
            filter_dictionary: FilterDictionary::default(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CacheEntry {
    pub hash: String,
    pub json_path: String,
    pub uasset_path: String,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CacheIndex {
    pub entries: HashMap<String, CacheEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CacheInfo {
    pub file_count: usize,
    pub total_size_bytes: u64,
    pub cache_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub success: bool,
    pub json_path: Option<String>,
    pub cached: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchConversionResult {
    pub total: usize,
    pub succeeded: usize,
    pub failed: usize,
    pub cached_count: usize,
    pub results: Vec<SingleConversionResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SingleConversionResult {
    pub success: bool,
    pub file_name: String,
    pub uasset_path: String,
    pub json_path: Option<String>,
    pub cached: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    #[serde(rename = "type", default)]
    pub progress_type: Option<String>,
    pub current: usize,
    pub total: usize,
    pub file_name: String,
    pub cached: bool,
    pub error: Option<String>,
}

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub cache_index: Mutex<CacheIndex>,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn get_cache_dir() -> PathBuf {
    let temp_dir = std::env::temp_dir();
    temp_dir.join("rvfxe-cache")
}

fn get_settings_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("rivals-vfx-editor")
        .join("settings.json")
}

fn get_cache_index_path() -> PathBuf {
    get_cache_dir().join("index.json")
}

fn load_settings() -> AppSettings {
    let path = get_settings_path();
    eprintln!("[DEBUG] Loading settings from: {:?}", path);
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(s) => match serde_json::from_str::<AppSettings>(&s) {
                Ok(mut settings) => {
                    // Force detailed errors to true since toggle was removed
                    settings.show_detailed_errors = true;
                    settings
                }
                Err(e) => {
                    eprintln!("[DEBUG] Failed to parse settings: {}", e);
                    AppSettings::default()
                }
            },
            Err(e) => {
                eprintln!("[DEBUG] Failed to read settings file: {}", e);
                AppSettings::default()
            }
        }
    } else {
        eprintln!("[DEBUG] Settings file not found, creating new one with defaults");
        let settings = AppSettings::default();
        if let Err(e) = save_settings(&settings) {
            eprintln!("[DEBUG] Failed to save default settings: {}", e);
        }
        settings
    }
}

fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    eprintln!("[DEBUG] Saving settings to: {:?}", path);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            eprintln!("[DEBUG] Failed to create settings dir: {}", e);
            return Err(e.to_string());
        }
    }
    match serde_json::to_string_pretty(settings) {
        Ok(json) => {
            if let Err(e) = fs::write(&path, json) {
                eprintln!("[DEBUG] Failed to write settings file: {}", e);
                Err(e.to_string())
            } else {
                Ok(())
            }
        }
        Err(e) => {
            eprintln!("[DEBUG] Failed to serialize settings: {}", e);
            Err(e.to_string())
        }
    }
}

fn load_cache_index() -> CacheIndex {
    let path = get_cache_index_path();
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        CacheIndex::default()
    }
}

fn save_cache_index(index: &CacheIndex) -> Result<(), String> {
    let path = get_cache_index_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(index).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

fn compute_file_hash(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

fn get_uasset_tool_path(app: &AppHandle) -> PathBuf {
    // In development, use UAssetCLI from UAssetAPI.Lightweight
    // In production, use the bundled resource
    let cwd = std::env::current_dir().unwrap_or_default();
    eprintln!("[DEBUG] Current working directory: {:?}", cwd);

    let dev_path = cwd
        .join("UAssetAPI.Lightweight")
        .join("UAssetCLI")
        .join("bin")
        .join("Debug")
        .join("net8.0")
        .join("win-x64")
        .join("UAssetCLI.exe");

    eprintln!(
        "[DEBUG] Checking dev path: {:?} exists={}",
        dev_path,
        dev_path.exists()
    );

    if dev_path.exists() {
        return dev_path;
    }

    // Try release build
    let release_path = cwd
        .join("UAssetAPI.Lightweight")
        .join("UAssetCLI")
        .join("bin")
        .join("Release")
        .join("net8.0")
        .join("win-x64")
        .join("publish")
        .join("UAssetCLI.exe");

    eprintln!(
        "[DEBUG] Checking release path: {:?} exists={}",
        release_path,
        release_path.exists()
    );

    if release_path.exists() {
        return release_path;
    }

    // Try tools folder next to executable (for organized distributions)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let dist_path = exe_dir.join("tools").join("UAssetCLI.exe");
            eprintln!(
                "[DEBUG] Checking dist path (tools): {:?} exists={}",
                dist_path,
                dist_path.exists()
            );
            if dist_path.exists() {
                return dist_path;
            }

            // Also check directly next to exe (cargo-dist flattens includes)
            let flat_path = exe_dir.join("UAssetCLI.exe");
            eprintln!(
                "[DEBUG] Checking dist path (flat): {:?} exists={}",
                flat_path,
                flat_path.exists()
            );
            if flat_path.exists() {
                return flat_path;
            }
        }
    }

    // Bundled resource path (in tools subfolder) - for Tauri builds
    let bundled_path = app
        .path()
        .resource_dir()
        .unwrap_or_default()
        .join("tools")
        .join("UAssetCLI.exe");

    eprintln!("[DEBUG] Falling back to bundled path: {:?}", bundled_path);
    bundled_path
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

#[tauri::command]
fn get_exe_dir() -> Result<String, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or_else(|| "Could not get exe parent directory".to_string())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_usmap_path(path: String, state: State<AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.usmap_path = Some(path);
    save_settings(&settings)
}

#[tauri::command]
fn set_detailed_errors(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.show_detailed_errors = enabled;
    save_settings(&settings)
}

#[tauri::command]
fn set_auto_clear_cache(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.auto_clear_cache = enabled;
    save_settings(&settings)
}

#[tauri::command]
fn set_filter_dictionary(
    dictionary: FilterDictionary,
    state: State<AppState>,
) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.filter_dictionary = dictionary;
    save_settings(&settings)
}

#[tauri::command]
fn get_cache_info() -> CacheInfo {
    let cache_dir = get_cache_dir();
    let mut file_count: usize = 0;
    let mut total_size = 0u64;

    fn visit_dirs(dir: &Path, count: &mut usize, size: &mut u64) -> std::io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    visit_dirs(&path, count, size)?;
                } else {
                    *count += 1;
                    *size += entry.metadata()?.len();
                }
            }
        }
        Ok(())
    }

    if cache_dir.exists() {
        let _ = visit_dirs(&cache_dir, &mut file_count, &mut total_size);
    }

    CacheInfo {
        file_count,
        total_size_bytes: total_size,
        cache_dir: cache_dir.to_string_lossy().to_string(),
    }
}

#[tauri::command]
fn clear_cache(state: State<AppState>) -> Result<(), String> {
    let cache_dir = get_cache_dir();
    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }

    let mut cache_index = state.cache_index.lock().unwrap();
    cache_index.entries.clear();
    save_cache_index(&cache_index)
}

#[tauri::command]
async fn convert_uasset_to_json(
    app: AppHandle,
    uasset_path: String,
    state: State<'_, AppState>,
) -> Result<ConversionResult, String> {
    let uasset_path_buf = PathBuf::from(&uasset_path);

    if !uasset_path_buf.exists() {
        return Ok(ConversionResult {
            success: false,
            json_path: None,
            cached: false,
            error: Some(format!("File not found: {}", uasset_path)),
        });
    }

    // Check cache
    let file_hash = compute_file_hash(&uasset_path_buf)?;
    let cache_dir = get_cache_dir();
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    {
        let cache_index = state.cache_index.lock().unwrap();
        if let Some(entry) = cache_index.entries.get(&uasset_path) {
            if entry.hash == file_hash && Path::new(&entry.json_path).exists() {
                return Ok(ConversionResult {
                    success: true,
                    json_path: Some(entry.json_path.clone()),
                    cached: true,
                    error: None,
                });
            }
        }
    }

    // Get usmap path from settings
    let usmap_path = {
        let settings = state.settings.lock().unwrap();
        settings.usmap_path.clone()
    };

    // Run conversion
    let tool_path = get_uasset_tool_path(&app);
    let file_name = uasset_path_buf
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    let json_path = cache_dir.join(format!("{}_{}.json", file_name, &file_hash[..8]));

    let mut cmd = Command::new(&tool_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.arg("to-json").arg(&uasset_path).arg(&json_path);

    if let Some(usmap) = &usmap_path {
        cmd.arg("--usmap").arg(usmap);
    }

    let output = cmd.output().await.map_err(|e| e.to_string())?;

    if output.status.success() {
        // Update cache
        let mut cache_index = state.cache_index.lock().unwrap();
        cache_index.entries.insert(
            uasset_path.clone(),
            CacheEntry {
                hash: file_hash,
                json_path: json_path.to_string_lossy().to_string(),
                uasset_path: uasset_path.clone(),
                timestamp: chrono::Utc::now().to_rfc3339(),
            },
        );
        let _ = save_cache_index(&cache_index);

        Ok(ConversionResult {
            success: true,
            json_path: Some(json_path.to_string_lossy().to_string()),
            cached: false,
            error: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(ConversionResult {
            success: false,
            json_path: None,
            cached: false,
            error: Some(format!("{}\n{}", stdout, stderr)),
        })
    }
}

#[tauri::command]
async fn convert_json_to_uasset(
    app: AppHandle,
    json_path: String,
    output_path: String,
    state: State<'_, AppState>,
) -> Result<ConversionResult, String> {
    let tool_path = get_uasset_tool_path(&app);

    let usmap_path = {
        let settings = state.settings.lock().unwrap();
        settings.usmap_path.clone()
    };

    let mut cmd = Command::new(&tool_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.arg("from-json").arg(&json_path).arg(&output_path);

    if let Some(usmap) = &usmap_path {
        cmd.arg("--usmap").arg(usmap);
    }

    eprintln!("[DEBUG] Running from-json command: {:?}", tool_path);
    eprintln!(
        "[DEBUG] Args: from-json {} {} {:?}",
        json_path, output_path, usmap_path
    );
    let start = std::time::Instant::now();
    let output = cmd.output().await.map_err(|e| e.to_string())?;
    eprintln!("[DEBUG] Command completed in {:?}", start.elapsed());

    if output.status.success() {
        Ok(ConversionResult {
            success: true,
            json_path: Some(output_path),
            cached: false,
            error: None,
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(ConversionResult {
            success: false,
            json_path: None,
            cached: false,
            error: Some(format!("{}\n{}", stdout, stderr)),
        })
    }
}

#[tauri::command]
async fn batch_convert_uassets_to_json(
    app: AppHandle,
    uasset_paths: Vec<String>,
    root_path: String,
    state: State<'_, AppState>,
) -> Result<BatchConversionResult, String> {
    let cache_dir = get_cache_dir();
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let usmap_path = {
        let settings = state.settings.lock().unwrap();
        settings.usmap_path.clone()
    };

    let tool_path = get_uasset_tool_path(&app);
    let total = uasset_paths.len();
    let mut results = Vec::new();
    let mut succeeded = 0;
    let mut failed = 0;
    let mut cached_count = 0;

    // Create temp file with list of paths
    // Format per line: inputPath,outputRelPath
    let list_file = cache_dir.join("batch_input.txt");
    let paths_to_convert: Vec<String>;

    {
        let cache_index = state.cache_index.lock().unwrap();
        let mut non_cached_paths = Vec::new();

        for uasset_path in &uasset_paths {
            let path_buf = PathBuf::from(uasset_path);
            let file_name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            if !path_buf.exists() {
                results.push(SingleConversionResult {
                    success: false,
                    file_name: file_name.clone(),
                    uasset_path: uasset_path.clone(),
                    json_path: None,
                    cached: false,
                    error: Some("File not found".to_string()),
                });
                failed += 1;
                continue;
            }

            // Determine relative path for structure preservation
            // Priority 1: Extract from Character ID (10xx)
            // Priority 2: Relative to root_path
            // Priority 3: Flat filename (fallback)

            let path_components: Vec<_> = path_buf
                .components()
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .collect();

            let mut char_id_relative_path = None;
            for (i, part) in path_components.iter().enumerate() {
                // Check for 10xx pattern (4 digits, starts with 10)
                if part.len() == 4 && part.starts_with("10") && part.chars().all(char::is_numeric) {
                    let mut rel_path = PathBuf::new();
                    for p in &path_components[i..] {
                        rel_path.push(p);
                    }
                    char_id_relative_path = Some(rel_path);
                    break;
                }
            }

            let relative_sub_path = if let Some(rel) = char_id_relative_path {
                rel.with_extension("json").to_string_lossy().to_string()
            } else if let Ok(rel) = path_buf.strip_prefix(&root_path) {
                let root_name = Path::new(&root_path).file_name().unwrap_or_default();
                Path::new(root_name)
                    .join(rel)
                    .with_extension("json")
                    .to_string_lossy()
                    .to_string()
            } else {
                // Fallback to flat structure if outside root
                let root_name = Path::new(&root_path).file_name().unwrap_or_default();
                Path::new(root_name)
                    .join(&file_name)
                    .with_extension("json")
                    .to_string_lossy()
                    .to_string()
            };

            // Expected JSON path in cache
            let expected_json_path = cache_dir.join(&relative_sub_path);

            // Check cache
            if let Ok(hash) = compute_file_hash(&path_buf) {
                if let Some(entry) = cache_index.entries.get(uasset_path) {
                    if entry.hash == hash && Path::new(&entry.json_path).exists() {
                        results.push(SingleConversionResult {
                            success: true,
                            file_name: file_name.clone(),
                            uasset_path: uasset_path.clone(),
                            json_path: Some(entry.json_path.clone()),
                            cached: true,
                            error: None,
                        });
                        succeeded += 1;
                        cached_count += 1;

                        // Emit progress
                        let _ = app.emit(
                            "conversion-progress",
                            ConversionProgress {
                                progress_type: Some("progress".to_string()),
                                current: results.len(),
                                total,
                                file_name: file_name.clone(),
                                cached: true,
                                error: None,
                            },
                        );
                        continue;
                    }
                }
            }

            // Add to list: inputPath,outputRelPath
            non_cached_paths.push(format!("{},{}", uasset_path, relative_sub_path));
        }

        paths_to_convert = non_cached_paths;
    }

    // If all cached, return early
    if paths_to_convert.is_empty() {
        return Ok(BatchConversionResult {
            total,
            succeeded,
            failed,
            cached_count,
            results,
        });
    }

    // Write paths to temp file
    fs::write(&list_file, paths_to_convert.join("\n")).map_err(|e| e.to_string())?;

    // Run batch conversion
    let mut cmd = Command::new(&tool_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.arg("batch-to-json")
        .arg(&list_file)
        .arg(&cache_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(usmap) = &usmap_path {
        cmd.arg("--usmap").arg(usmap);
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    // Take stderr for progress reading
    let stderr = child.stderr.take();
    let app_clone = app.clone();

    // Spawn a task to read progress from stderr (non-blocking)
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Ok(progress) = serde_json::from_str::<ConversionProgress>(&line) {
                    let _ = app_clone.emit("conversion-progress", &progress);
                }
            }
        }
    });

    // Wait for process to complete
    let output = child.wait_with_output().await.map_err(|e| e.to_string())?;

    // Wait for stderr reading to finish
    let _ = stderr_handle.await;

    // Parse batch results from stdout
    let stdout = String::from_utf8_lossy(&output.stdout);
    if let Ok(batch_result) = serde_json::from_str::<serde_json::Value>(&stdout) {
        if let Some(batch_results) = batch_result.get("results").and_then(|r| r.as_array()) {
            let mut cache_index = state.cache_index.lock().unwrap();

            for result in batch_results {
                let success = result
                    .get("success")
                    .and_then(|s| s.as_bool())
                    .unwrap_or(false);
                let file_name = result
                    .get("fileName")
                    .and_then(|s| s.as_str())
                    .unwrap_or("")
                    .to_string();
                let uasset_path = result
                    .get("uassetPath")
                    .and_then(|s| s.as_str())
                    .unwrap_or("")
                    .to_string();
                let json_path = result
                    .get("jsonPath")
                    .and_then(|s| s.as_str())
                    .map(|s| s.to_string());
                let error = result
                    .get("error")
                    .and_then(|s| s.as_str())
                    .map(|s| s.to_string());

                if success {
                    succeeded += 1;

                    // Update cache
                    if let (Some(jp), Ok(hash)) =
                        (&json_path, compute_file_hash(Path::new(&uasset_path)))
                    {
                        cache_index.entries.insert(
                            uasset_path.clone(),
                            CacheEntry {
                                hash,
                                json_path: jp.clone(),
                                uasset_path: uasset_path.clone(),
                                timestamp: chrono::Utc::now().to_rfc3339(),
                            },
                        );
                    }
                } else {
                    failed += 1;
                }

                results.push(SingleConversionResult {
                    success,
                    file_name,
                    uasset_path,
                    json_path,
                    cached: false,
                    error,
                });
            }

            let _ = save_cache_index(&cache_index);
        }
    }

    // Cleanup temp file
    let _ = fs::remove_file(&list_file);

    Ok(BatchConversionResult {
        total,
        succeeded,
        failed,
        cached_count,
        results,
    })
}

#[tauri::command]
async fn batch_convert_jsons_to_uassets(
    app: AppHandle,
    state: State<'_, AppState>,
    json_paths: Vec<String>,
    output_dir: String,
) -> Result<BatchConversionResult, String> {
    let tool_path = get_uasset_tool_path(&app);
    let cache_dir = get_cache_dir();

    let usmap_path = {
        let settings = state.settings.lock().unwrap();
        settings.usmap_path.clone()
    };

    // Create temp file with list of paths (format: jsonPath,outputName per line)
    let list_file = cache_dir.join("batch_output_list.txt");
    fs::write(&list_file, json_paths.join("\n")).map_err(|e| e.to_string())?;

    // Ensure output directory exists
    fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    let total = json_paths.len();

    eprintln!(
        "[DEBUG] batch_convert_jsons_to_uassets: total={} files, output_dir={}",
        total, output_dir
    );
    eprintln!("[DEBUG] Tool path: {:?}", tool_path);
    eprintln!("[DEBUG] Usmap path: {:?}", usmap_path);

    // Run batch conversion
    let mut cmd = Command::new(&tool_path);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    cmd.arg("batch-from-json")
        .arg(&list_file)
        .arg(&output_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(usmap) = &usmap_path {
        cmd.arg("--usmap").arg(usmap);
    }

    eprintln!("[DEBUG] Spawning batch command...");
    let spawn_start = std::time::Instant::now();
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    eprintln!("[DEBUG] Spawn took {:?}", spawn_start.elapsed());

    // Take stderr for progress reading
    let stderr = child.stderr.take();
    let app_clone = app.clone();

    // Spawn a task to read progress from stderr (non-blocking)
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Ok(progress) = serde_json::from_str::<ConversionProgress>(&line) {
                    let _ = app_clone.emit("conversion-progress", &progress);
                }
            }
        }
    });

    // Wait for process to complete
    let output = child.wait_with_output().await.map_err(|e| e.to_string())?;

    // Wait for stderr reading to finish
    let _ = stderr_handle.await;

    // Parse batch results from stdout
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr_output = String::from_utf8_lossy(&output.stderr);

    // Log for debugging
    eprintln!("[DEBUG] batch-from-json stdout length: {}", stdout.len());
    eprintln!(
        "[DEBUG] batch-from-json stderr length: {}",
        stderr_output.len()
    );
    let stdout_preview: String = stdout.chars().take(500).collect();
    eprintln!("[DEBUG] stdout preview: {}", stdout_preview);
    if !output.status.success() {
        eprintln!("[DEBUG] Exit code: {:?}", output.status.code());
    }

    let mut succeeded = 0;
    let mut failed = total; // Default to all failed
    let results = Vec::new();

    if let Ok(batch_result) = serde_json::from_str::<serde_json::Value>(&stdout) {
        succeeded = batch_result
            .get("succeeded")
            .and_then(|s| s.as_u64())
            .unwrap_or(0) as usize;
        failed = batch_result
            .get("failed")
            .and_then(|s| s.as_u64())
            .unwrap_or(total as u64) as usize;
    } else {
        eprintln!("[DEBUG] Failed to parse stdout as JSON");
    }

    Ok(BatchConversionResult {
        total,
        succeeded,
        failed,
        cached_count: 0,
        results,
    })
}

#[tauri::command]
fn log_unique_params(param_names: Vec<String>) {
    println!("\n=== Found {} Unique Parameters ===", param_names.len());
    for name in param_names {
        println!(" - {}", name);
    }
    println!("=====================================\n");
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = load_settings();
    let cache_index = load_cache_index();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            settings: Mutex::new(settings),
            cache_index: Mutex::new(cache_index),
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            set_usmap_path,
            set_detailed_errors,
            set_auto_clear_cache,
            set_filter_dictionary,
            get_cache_info,
            clear_cache,
            convert_uasset_to_json,
            convert_json_to_uasset,
            batch_convert_uassets_to_json,
            batch_convert_jsons_to_uassets,
            get_exe_dir,
            log_unique_params,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<AppState>();
                let should_clear = {
                    let settings = state.settings.lock().unwrap();
                    settings.auto_clear_cache
                };

                if should_clear {
                    let cache_dir = get_cache_dir();
                    if cache_dir.exists() {
                        let _ = fs::remove_dir_all(&cache_dir);
                    }
                    let mut cache_index = state.cache_index.lock().unwrap();
                    cache_index.entries.clear();
                    let _ = save_cache_index(&cache_index);
                }
            }
        });
}
