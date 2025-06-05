mod cmd;

use tauri::Manager;
// Removed the `use std::io::Read;` line as requested.
use serde::{Deserialize, Serialize};
use std::env;
// Keep other imports

mod ai;

use base64::engine::general_purpose;
use base64::Engine;
use tauri::Runtime;
use tauri::Url;

#[derive(Debug, Serialize, Deserialize)]
struct FolderEntry {
    name: String,
    is_file: bool,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FolderEntry>>,
}
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

/// 递归读取文件夹结构，返回嵌套的文件夹结构
#[tauri::command]
fn read_folder_structure(path: String) -> FolderEntry {
    let path_buf = std::path::PathBuf::from(&path);
    let name = path_buf.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let mut children = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                let child_name = entry.file_name().to_string_lossy().to_string();
                let path_str = path.to_string_lossy().to_string();
                
                if path.is_file() {
                    children.push(FolderEntry {
                        name: child_name,
                        is_file: true,
                        path: path_str,
                        children: None,
                    });
                } else if path.is_dir() {
                    children.push(read_folder_structure(path_str));
                }
            }
        }
    }
    
    FolderEntry {
        name,
        is_file: false,
        path,
        children: Some(children),
    }
}

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

#[tauri::command]
fn open_devtools<R: Runtime>(app: tauri::AppHandle<R>) {
    if let Some(webview_window) = app.get_webview_window("main") {
        let _ = webview_window.open_devtools();
    } else {
        eprintln!("Could not get main webview window 'main' to open devtools");
    }
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
            cmd::fs::read_folder_structure,
            cmd::fs::read_text_file,
            cmd::fs::read_file_base64,
            cmd::fs::write_text_file,
            cmd::fs::write_file_base64,
            cmd::fs::create_folder,
            cmd::fs::read_folder,
            cmd::fs::read_folder_recursive,
            cmd::fs::delete_file,
            cmd::fs::exists,
            write_stdout,
            write_stderr,
            exit
            read_text_file,
            read_folder,
            read_folder_recursive, 
            read_folder_structure,
            delete_file,
            read_text_file,
            write_text_file,
            exists,
            read_file_base64,
            write_file_base64,
            create_folder,
            write_stdout,
            write_stderr,
            exit,
            ai::save_ai_settings,
            ai::load_ai_settings,
            ai::fetch_ai_models,
            ai::save_prompt_version,
            ai::delete_prompt_version,
            ai::update_prompt_version,
            // New AI API config commands
            ai::get_all_api_configs,
            ai::add_api_config,
            ai::edit_api_config,
            ai::delete_api_config,
            ai::get_active_api_config,
            ai::reset_ai_settings,
            ai::set_active_ai_config,
            #[cfg(desktop)] // Keep the cfg attribute for the command itself
            set_update_channel,
            open_devtools
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
