use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn read_file(path: PathBuf) -> Result<String, String> {
    fs::read_to_string(path)
        .map_err(|e| e.to_string())
}