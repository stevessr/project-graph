// Removed the `use std::io::Read;` line as requested.
use std::env;
// Keep other imports

use base64::engine::general_purpose;
use base64::Engine;
use reqwest::header::{HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize}; // Combined Serialize/Deserialize import here
use tauri::Manager; // Import Manager trait ONCE
use tauri::Runtime;
use tauri::Url;
#[allow(unused_imports)]
use tauri_plugin_store::{Store, StoreBuilder}; // Import Store and StoreBuilder ONCE

#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

/// 判断文件是否存在
#[tauri::command]
fn exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

/// 读取文件夹中的文件列表
/// 如果文件夹不存在，返回空列表
#[tauri::command]
fn read_folder(path: String) -> Vec<String> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.filter_map(Result::ok) { // Simplified loop
            if entry.path().is_file() {
                if let Some(file_name) = entry.file_name().to_str() {
                    files.push(file_name.to_string());
                }
            }
        }
    }
    files
}

/// 读取一个文件夹中的全部文件，递归的读取
/// 如果文件夹不存在，返回空列表
/// file_exts: 要读取的文件扩展名列表，例如：\[".txt", ".md"]
#[tauri::command]
fn read_folder_recursive(path: String, file_exts: Vec<String>) -> Vec<String> {
    _read_folder_recursive_impl(&path, &file_exts) // Pass file_exts here
}

// Helper function to handle recursion with references
fn _read_folder_recursive_impl(path: &str, file_exts: &Vec<String>) -> Vec<String> { // Renamed parameter here
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.filter_map(Result::ok) { // Simplified loop
            let current_path = entry.path();
            if current_path.is_file() {
                 // Check extension before converting path to string unnecessarily
                let has_matching_ext = file_exts.is_empty() || // Use file_exts here
                    current_path.extension()
                        .and_then(|os_str| os_str.to_str())
                        .map(|ext| file_exts.iter().any(|allowed_ext| allowed_ext.trim_start_matches('.') == ext)) // Use file_exts here
                        .unwrap_or(false); // Handle files with no extension

                // Alternative check if file_exts includes the dot (e.g., ".txt")
                // let has_matching_ext = file_exts.is_empty() ||
                //     current_path.to_str().map(|p| file_exts.iter().any(|ext| p.ends_with(ext))).unwrap_or(false);


                if has_matching_ext {
                   if let Some(path_str) = current_path.to_str() {
                        files.push(path_str.to_string());
                    }
                }

            } else if current_path.is_dir() {
                if let Some(dir_path_str) = current_path.to_str() {
                    // Pass file_exts down recursively
                    files.append(&mut _read_folder_recursive_impl(dir_path_str, file_exts));
                }
            }
        }
    }
    files
}


/// 删除文件
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| format!("删除文件 '{}' 失败: {}", path, e))
}

/// 读取文件，返回字符串
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("无法读取文本文件 '{}': {}", path, e))
}

/// 读取文件，返回base64
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("无法读取文件 '{}': {}", path, e))?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

/// 写入文件
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    let path_ref = std::path::Path::new(&path);
    if let Some(parent) = path_ref.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("无法创建目录 '{}': {}", parent.display(), e))?;
    }
    std::fs::write(path_ref, content)
        .map_err(|e| format!("写入文本文件失败 '{}': {}", path, e))
}

/// 写入文件，base64字符串
#[tauri::command]
fn write_file_base64(content: String, path: String) -> Result<(), String> {
    let bytes = general_purpose::STANDARD
        .decode(content)
        .map_err(|e| format!("Base64解码失败: {}", e))?;

    let path_ref = std::path::Path::new(&path);
    if let Some(parent) = path_ref.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("无法创建目录 '{}': {}", parent.display(), e))?;
    }

    std::fs::write(path_ref, &bytes)
        .map_err(|e| {
            eprintln!("写入文件失败 '{}': {}", path, e); // Keep logging if desired
            format!("写入文件失败 '{}': {}", path, e)
        })
}

/// 创建文件夹
/// 如果创建成功，则返回true，如果创建失败则返回false
#[tauri::command]
fn create_folder(path: String) -> bool {
    std::fs::create_dir_all(&path).is_ok()
}

// --- Start of AiSettings Section ---

// Define AiSettings struct ONCE
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSettings {
    pub api_endpoint: Option<String>,
    pub api_key: Option<String>,
    pub selected_model: Option<String>,
    pub custom_prompts: Option<String>,
}

impl Default for AiSettings {
    fn default() -> Self {
        AiSettings {
            api_endpoint: None,
            api_key: None,
            selected_model: None,
            custom_prompts: None,
        }
    }
}


// Removed duplicate imports for Manager, StoreBuilder, Serialize
// Removed second (conflicting) definition of AiSettings struct

// --- End of AiSettings Section ---


#[tauri::command]
async fn save_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>, settings: AiSettings) -> Result<(), String> {
    // Use app.app_handle() if needed, otherwise app is fine
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    // It's good practice to reload before saving in case the file was modified externally,
    // though less critical than before loading. Optional, but can prevent race conditions.
    store.reload()
         .map_err(|e| format!("Failed to reload store before saving: {}", e))?;

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // Call store.set directly, assuming the compiler is correct FOR NOW that it returns ()
    // We are losing the specific error checking for the 'set' operation itself here.
    store.set("settings".to_string(), settings_value);

    // Now, attempt to save the store. If 'set' caused an invalid state
    // that prevents saving, this 'save' call should fail.
    store.save()
         .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<AiSettings, String> {
    // Use app.app_handle() if needed, otherwise app is fine
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    // Use reload() as it's the correct method now
    store.reload()
         .map_err(|e| format!("Failed to reload store: {}", e))?; // Handle potential reload error

    match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone()) // Clone value before deserializing
            .map_err(|e| format!("Failed to deserialize settings: {}", e)),
        None => Ok(AiSettings::default()), // Return default if no settings found
    }
}


#[tauri::command]
async fn fetch_ai_models<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>, // Parameter kept but marked unused if not needed
    url: String,
    api_key: Option<String>
) -> Result<serde_json::Value, String> {

    let client = reqwest::Client::new();
    let mut request_builder = client.get(&url);

    if let Some(key) = api_key {
        if !key.trim().is_empty() {
            let bearer_token = format!("Bearer {}", key);
            // Use match for better error handling on header value creation
            match HeaderValue::from_str(&bearer_token) {
                Ok(header_value) => {
                    request_builder = request_builder.header(AUTHORIZATION, header_value);
                }
                Err(e) => {
                    // Return an error if the key is invalid for a header
                    return Err(format!("Invalid API key format for Authorization header: {}", e));
                }
            }
        }
    }

    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Failed to send request to '{}': {}", url, e))?;

    if !response.status().is_success() {
        let status = response.status();
        // Try to get error body text, provide fallback message
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
         return Err(format!("Request failed with status {}: {}", status, error_body));
    }

    let json_response = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    Ok(json_response)
}


#[tauri::command]
fn write_stdout(content: String) {
    println!("{}", content);
}

#[tauri::command]
fn write_stderr(content: String) {
    eprintln!("{}", content);
}

#[tauri::command]
fn exit(code: i32) {
    std::process::exit(code);
}

#[cfg(desktop)]
#[tauri::command]
async fn set_update_channel<R: Runtime>(
    app: tauri::AppHandle<R>,
    channel: String,
) -> Result<(), String> {
    println!("Setting update channel to {}", channel);
    // Construct the URL string carefully
    let update_url_str = format!(
        "https://github.com/LiRenTech/project-graph/releases/{}/download/latest.json",
        channel // Inject the channel name
    );
    let update_url = Url::parse(&update_url_str)
        .map_err(|e| format!("Failed to parse update URL '{}': {}", update_url_str, e))?;

    // Build the updater
    // Note: `endpoints` takes Vec<Url>. Cloning is correct here.
    let updater = app.updater_builder()
        .endpoints(vec![update_url.clone()]) // Clone URL for the vec
        .map_err(|e| format!("Failed to set updater endpoints to '{}': {}", update_url, e))? // Added map_err for builder error
        .build()
        .map_err(|e| format!("Failed to build updater: {}", e))?; // Added map_err for build error

    // Check for updates immediately after setting the channel
    updater.check()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?; // Added map_err for check error

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        println!("Disabling WebKit DMA-BUF renderer on Linux.");
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                // Use get_webview_window instead of get_window
                if let Some(webview_window) = app.get_webview_window("main") {
                     let _ = webview_window.open_devtools(); // Use `let _ =` to ignore Result if not needed
                     // let _ = webview_window.close_devtools();
                } else {
                     eprintln!("Could not get main webview window 'main' for devtools");
                }
            }
            #[cfg(desktop)]
            {
                // Ensure plugins are initialized correctly, logging errors
                let handle = app.handle(); // Get handle once
                handle.plugin(tauri_plugin_cli::init())
                    .map_err(|e| eprintln!("Failed to init cli plugin: {}", e)).ok();
                handle.plugin(tauri_plugin_process::init())
                    .map_err(|e| eprintln!("Failed to init process plugin: {}", e)).ok();
                handle
                    .plugin(tauri_plugin_updater::Builder::new().build())
                    .map_err(|e| eprintln!("Failed to init updater plugin: {}", e)).ok();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            exists,
            read_folder,
            read_folder_recursive, // Keep this name, it's correct for the handler
            delete_file,
            read_text_file,
            write_text_file,
            read_file_base64,
            write_file_base64,
            create_folder,
            write_stdout,
            write_stderr,
            exit,
            save_ai_settings,
            load_ai_settings,
            fetch_ai_models,
            #[cfg(desktop)] // Keep the cfg attribute for the command itself
            set_update_channel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}