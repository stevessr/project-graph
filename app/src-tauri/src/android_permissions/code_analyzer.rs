use std::collections::HashSet;
use std::fs;
use std::path::Path;
use regex::Regex;

// 定义一个 API 调用模式到权限的映射
// 实际应用中需要更全面的映射和更复杂的分析
fn get_permission_patterns() -> Vec<(Regex, String)> {
    let patterns = vec![
        (r"getLocation", "android.permission.ACCESS_FINE_LOCATION"),
        (r"readContacts", "android.permission.READ_CONTACTS"),
        (r"openCamera", "android.permission.CAMERA"),
        (r"writeExternalStorage", "android.permission.WRITE_EXTERNAL_STORAGE"),
        // 添加更多模式和对应的权限
        // 例如，对于 Rust Tauri 调用安卓 API 的模式
        (r#"tauri::plugin::android::invoke\(\s*"getLocation""#, "android.permission.ACCESS_FINE_LOCATION"),
        (r#"tauri::plugin::android::invoke\(\s*"readContacts""#, "android.permission.READ_CONTACTS"),
        (r#"tauri::plugin::android::invoke\(\s*"openCamera""#, "android.permission.CAMERA"),
        (r#"tauri::plugin::android::invoke\(\s*"writeExternalStorage""#, "android.permission.WRITE_EXTERNAL_STORAGE"),
        // 对于 TypeScript/JavaScript 调用 Tauri 命令的模式，如果这些命令内部调用了需要权限的安卓 API
        // 这部分需要根据实际的 Tauri 命令设计来确定模式
        (r"invoke\(\s*'get_location'", "android.permission.ACCESS_FINE_LOCATION"),
        (r"invoke\(\s*'read_contacts'", "android.permission.READ_CONTACTS"),
        (r"invoke\(\s*'open_camera'", "android.permission.CAMERA"),
        (r"invoke\(\s*'write_external_storage'", "android.permission.WRITE_EXTERNAL_STORAGE"),
    ];
    patterns.into_iter()
        .map(|(pattern, permission)| (Regex::new(pattern).unwrap(), permission.to_string()))
        .collect()
}

pub fn analyze_source_code(source_code_paths: &Vec<String>, file_extensions: &Vec<String>) -> Result<HashSet<String>, Box<dyn std::error::Error>> {
    let mut identified_permissions_set = HashSet::new();
    let permission_patterns = get_permission_patterns();

    for dir_path_str in source_code_paths {
        let dir_path = Path::new(&dir_path_str);
        if !dir_path.is_dir() {
            eprintln!("Warning: Source code path is not a directory: {}", dir_path_str);
            continue;
        }

        for entry in walkdir::WalkDir::new(dir_path) {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if let Some(ext_str) = extension.to_str() {
                        if file_extensions.contains(&ext_str.to_string()) {
                            let file_content = fs::read_to_string(path)?;
                            for (pattern, permission) in &permission_patterns {
                                if pattern.is_match(&file_content) {
                                    identified_permissions_set.insert(permission.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(identified_permissions_set)
}

// 需要添加 walkdir 依赖到 Cargo.toml
// [dependencies]
// walkdir = "2.3.2"
// regex = "1.5.4" // 确保 regex 版本兼容

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_analyze_source_code() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn use_location() {{ tauri::plugin::android::invoke(\"getLocation\", ...); }}")?;

        let file2_path = dir.path().join("file2.kt");
        let mut file2 = std::fs::File::create(&file2_path)?;
        writeln!(file2, "fun openCamera() {{ /* camera code */ }}")?;

        let file3_path = dir.path().join("file3.java");
        let mut file3 = std::fs::File::create(&file3_path)?;
        writeln!(file3, "void readContacts() {{ /* contacts code */ }}")?;

        let file4_path = dir.path().join("file4.txt"); // Should be ignored
        let mut file4 = std::fs::File::create(&file4_path)?;
        writeln!(file4, "some text")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string(), "kt".to_string(), "java".to_string()];

        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;

        assert_eq!(permissions.len(), 3);
        assert!(permissions.contains(&"android.permission.ACCESS_FINE_LOCATION".to_string()));
        assert!(permissions.contains(&"android.permission.CAMERA".to_string()));
        assert!(permissions.contains(&"android.permission.READ_CONTACTS".to_string()));

        Ok(())
    }

    #[test]
    fn test_analyze_source_code_no_match() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn some_function() {{ /* some code */ }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];

        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;

        assert_eq!(permissions.len(), 0);

        Ok(())
    }

    #[test]
    fn test_analyze_source_code_empty_paths() -> Result<(), Box<dyn std::error::Error>> {
        let source_code_paths = Vec::new();
        let file_extensions = vec!["rs".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;
        assert_eq!(permissions.len(), 0);
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_empty_extensions() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn use_location() {{ getLocation(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = Vec::new(); // Empty extensions
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;
        assert_eq!(permissions.len(), 0); // No files should be processed
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_non_existent_path() -> Result<(), Box<dyn std::error::Error>> {
        let source_code_paths = vec!["/path/to/non/existent/dir".to_string()];
        let file_extensions = vec!["rs".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;
        assert_eq!(permissions.len(), 0); // Should skip and not error
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_path_is_file() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file_path = dir.path().join("i_am_a_file.rs");
        std::fs::File::create(&file_path)?; // Create the file

        // Path is a file, not a directory
        let source_code_paths = vec![file_path.to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;
        assert_eq!(permissions.len(), 0); // Should skip and not error, or only process if logic changes
        Ok(())
    }
    
    #[test]
    fn test_analyze_source_code_extension_case_sensitivity() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.RS"); // Uppercase extension
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn use_location() {{ getLocation(); }}")?;
    
        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        // If file_extensions is "rs", "file1.RS" should not be matched if case-sensitive.
        // Current implementation seems case-sensitive for extensions.
        let file_extensions_lowercase = vec!["rs".to_string()];
        let permissions_lowercase = analyze_source_code(&source_code_paths, &file_extensions_lowercase)?;
        assert_eq!(permissions_lowercase.len(), 0, "Should not match with 'rs' if file is '.RS'");

        let file_extensions_uppercase = vec!["RS".to_string()];
        let permissions_uppercase = analyze_source_code(&source_code_paths, &file_extensions_uppercase)?;
        assert_eq!(permissions_uppercase.len(), 1, "Should match with 'RS' if file is '.RS'");
        assert!(permissions_uppercase.contains("android.permission.ACCESS_FINE_LOCATION"));
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_with_tauri_invoke_patterns() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, r#"
            fn tauri_calls() {{
                tauri::plugin::android::invoke("getLocation", ...);
                tauri::plugin::android::invoke( "openCamera" , ...);
            }}
        "#)?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;

        assert_eq!(permissions.len(), 2);
        assert!(permissions.contains("android.permission.ACCESS_FINE_LOCATION"));
        assert!(permissions.contains("android.permission.CAMERA"));
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_with_frontend_invoke_patterns() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file1_path = dir.path().join("file1.js");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, r#"
            function frontend_calls() {{
                invoke('read_contacts');
                invoke ( 'write_external_storage' , {{ }});
            }}
        "#)?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["js".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;

        assert_eq!(permissions.len(), 2);
        assert!(permissions.contains("android.permission.READ_CONTACTS"));
        assert!(permissions.contains("android.permission.WRITE_EXTERNAL_STORAGE"));
        Ok(())
    }
    
    #[test]
    fn test_analyze_source_code_subdirectory_scan() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let subdir = dir.path().join("subdir");
        fs::create_dir(&subdir)?;

        let file1_path = subdir.join("file_in_subdir.java");
        let mut file1 = fs::File::create(&file1_path)?;
        writeln!(file1, "class MyClass {{ void specialOperation() {{ writeExternalStorage(); }} }}")?;
        
        let file2_path = dir.path().join("file_in_root.kt");
        let mut file2 = fs::File::create(&file2_path)?;
        writeln!(file2, "fun anotherFunction() {{ openCamera(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["java".to_string(), "kt".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;

        assert_eq!(permissions.len(), 2);
        assert!(permissions.contains("android.permission.WRITE_EXTERNAL_STORAGE"));
        assert!(permissions.contains("android.permission.CAMERA"));
        Ok(())
    }

    #[test]
    fn test_analyze_source_code_file_without_permissions() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let file_path = dir.path().join("no_permissions.rs");
        let mut file = fs::File::create(file_path)?;
        writeln!(file, "fn main() {{ println!(\"Hello, world!\"); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let permissions = analyze_source_code(&source_code_paths, &file_extensions)?;
        assert!(permissions.is_empty(), "Expected no permissions to be found");
        Ok(())
    }
}