mod cmd;

use std::env;
use tauri::Manager;

use tauri::Runtime;
use tauri::Url;

use cmd::fs::{
    create_folder, delete_file, exists, read_file_base64, read_folder, read_folder_recursive,
    read_folder_structure, read_text_file, write_file_base64, write_text_file,
};

#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

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
    let updater = app
        .updater_builder()
        .endpoints(vec![update_url.clone()]) // Clone URL for the vec
        .map_err(|e| format!("Failed to set updater endpoints to '{}': {}", update_url, e))? // Added map_err for builder error
        .build()
        .map_err(|e| format!("Failed to build updater: {}", e))?; // Added map_err for build error

    // Check for updates immediately after setting the channel
    updater
        .check()
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
        .plugin(tauri_plugin_window_state::Builder::new().build())
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
                handle
                    .plugin(tauri_plugin_cli::init())
                    .map_err(|e| eprintln!("Failed to init cli plugin: {}", e))
                    .ok();
                handle
                    .plugin(tauri_plugin_process::init())
                    .map_err(|e| eprintln!("Failed to init process plugin: {}", e))
                    .ok();
                handle
                    .plugin(tauri_plugin_updater::Builder::new().build())
                    .map_err(|e| eprintln!("Failed to init updater plugin: {}", e))
                    .ok();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            write_stdout,
            write_stderr,
            read_text_file,
            read_folder,
            read_folder_recursive,
            read_folder_structure,
            delete_file,
            write_text_file,
            exists,
            read_file_base64,
            write_file_base64,
            create_folder,
            #[cfg(desktop)] // Keep the cfg attribute for the command itself
            set_update_channel,
            open_devtools,
            exit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
