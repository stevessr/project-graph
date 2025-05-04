use std::env;
use std::io::Read;

use base64::engine::general_purpose;
use base64::Engine;

use tauri::Runtime;
use tauri::Url;
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
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if entry.path().is_file() {
                    if let Some(file_name) = entry.file_name().to_str() {
                        files.push(file_name.to_string());
                    }
                }
            }
        }
    }
    files
}

/// 读取一个文件夹中的全部文件，递归的读取
/// 如果文件夹不存在，返回空列表
/// fileExts: 要读取的文件扩展名列表，例如：[".txt", ".md"]
#[tauri::command]
fn read_folder_recursive(path: String, fileExts: Vec<String>) -> Vec<String> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() {
                    if let Some(file_name) = path.to_str() {
                        if fileExts.iter().any(|ext| file_name.ends_with(ext)) {
                            files.push(file_name.to_string());
                        }
                    }
                } else if path.is_dir() {
                    let mut sub_files = read_folder_recursive(path.to_str().unwrap().to_string(), fileExts.clone());
                    files.append(&mut sub_files);
                }
            }
        }
    }
    files
}


/// 删除文件
#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(())
}


/// 读取文件，返回字符串
#[tauri::command]
fn read_text_file(path: String) -> String {
    let mut file = std::fs::File::open(path).unwrap();
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();
    contents
}

/// 读取文件，返回base64
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    Ok(general_purpose::STANDARD
        .encode(&std::fs::read(path).map_err(|e| format!("无法读取文件: {}", e))?))
}

/// 写入文件
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// 写入文件，base64字符串
#[tauri::command]
fn write_file_base64(content: String, path: String) -> Result<(), String> {
    std::fs::write(
        &path,
        &general_purpose::STANDARD
            .decode(content)
            .map_err(|e| format!("解码失败: {}", e))?,
    )
    .map_err(|e| {
        eprintln!("写入文件失败: {}", e);
        return e.to_string();
    })?;
    Ok(())
}

/// 创建文件夹
/// 如果创建成功，则返回true，如果创建失败则返回false
#[tauri::command]
fn create_folder(path: String) -> bool {
    std::fs::create_dir_all(&path).is_ok()
}

use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreBuilder;

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

#[tauri::command]
async fn save_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>, settings: AiSettings) -> Result<(), String> {
    // Build the store and handle potential build errors
    let mut store = StoreBuilder::new(&app, ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?; // More descriptive error

    // Reload the store from disk and handle potential reload errors
    store.reload()
         .map_err(|e| format!("Failed to reload store: {}", e))?;

    // 1. Serialize settings and handle potential serde error
    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // 2. Set the value in the store and handle potential store error
    store.set("settings".to_string(), settings_value)
         .map_err(|e| format!("Failed to set value in store: {}", e))?; // Assuming store.set returns Result<(), Error>

    // 3. Save the store to disk and handle potential save errors
    store.save()
         .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn load_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<AiSettings, String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(&app, ".ai_settings.dat").build().map_err(|e| e.to_string())?;
    store.reload().map_err(|e| e.to_string())?;
    match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone()).map_err(|e| e.to_string()),
        None => Ok(AiSettings::default()),
    }
}

#[tauri::command]
async fn fetch_ai_models<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>, // Keep if needed for other things, otherwise remove or ignore
    url: String,
    api_key: Option<String>
) -> Result<serde_json::Value, String> {

    // Create a reqwest client
    // You might want to create and manage a single client instance using Tauri's state management
    // for better performance (connection pooling), but creating one per request is simpler to start.
    let client = reqwest::Client::new();

    // Start building the request
    let mut request_builder = client.get(&url);

    // Conditionally add the Authorization header
    if let Some(key) = api_key {
        let bearer_token = format!("Bearer {}", key);
        // Attempt to create a HeaderValue. This validates the format.
        match HeaderValue::from_str(&bearer_token) {
            Ok(header_value) => {
                request_builder = request_builder.header(AUTHORIZATION, header_value);
            }
            Err(e) => {
                // Handle error if the constructed header value is invalid
                return Err(format!("Invalid API key format for Authorization header: {}", e));
            }
        }
    }

    // Send the request and await the response
    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Failed to send request to '{}': {}", url, e))?;

    // Check if the request was successful (status code 2xx)
    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
         return Err(format!("Request failed with status: {} - {}", status, error_body));
    }

    // Parse the response body as JSON
    let json_response = response
        .json::<serde_json::Value>() // Specify the type to deserialize into
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
) -> Result<(), tauri_plugin_updater::Error> {
    println!("Setting update channel to {}", channel);
    app.updater_builder()
        .endpoints(vec![Url::parse(
            format!(
            "https://github.com/LiRenTech/project-graph/releases/{channel}/download/latest.json"
        )
            .as_str(),
        )?])?
        .build()?
        .check()
        .await?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 在 Linux 上禁用 DMA-BUF 渲染器
    // 否则无法在 Linux 上运行
    // 相同的bug: https://github.com/tauri-apps/tauri/issues/10702
    // 解决方案来源: https://github.com/clash-verge-rev/clash-verge-rev/blob/ae5b2cfb79423c7e76a281725209b812774367fa/src-tauri/src/lib.rs#L27-L28
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_cli::init())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            read_folder,
            read_folder_recursive,
            delete_file,
            write_text_file,
            exists,
            read_file_base64,
            create_folder,
            write_file_base64,
            write_stdout,
            write_stderr,
            exit,
            save_ai_settings,
            load_ai_settings,
            fetch_ai_models,
            #[cfg(desktop)]
            set_update_channel
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
