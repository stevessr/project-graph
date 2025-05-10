use std::collections::HashSet;

mod manifest_parser;
mod code_analyzer;

pub use manifest_parser::parse_manifest;
pub use code_analyzer::analyze_source_code;

pub fn compare_permissions(declared_permissions: &Vec<String>, used_permissions: &HashSet<String>) -> Vec<String> {
    let declared_set: HashSet<String> = declared_permissions.iter().cloned().collect();
    let missing_permissions: Vec<String> = used_permissions.difference(&declared_set).cloned().collect();
    missing_permissions
}

pub fn scan_android_permissions(manifest_path: &str, source_code_paths: &Vec<String>, file_extensions: &Vec<String>) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    // 1. 解析 Manifest 文件，获取声明的权限
    let manifest_content = std::fs::read_to_string(manifest_path)?;
    let declared_permissions = parse_manifest(&manifest_content)?;

    // 2. 分析源代码，识别使用的权限
    let used_permissions = analyze_source_code(source_code_paths, file_extensions)?;

    // 3. 比较声明的权限和使用的权限
    let missing_permissions = compare_permissions(&declared_permissions, &used_permissions);

    // 4. 返回潜在缺失的权限列表
    Ok(missing_permissions)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_compare_permissions() {
        let declared = vec!["perm1".to_string(), "perm2".to_string()];
        let used: HashSet<String> = vec!["perm2".to_string(), "perm3".to_string(), "perm4".to_string()].into_iter().collect();
        let missing = compare_permissions(&declared, &used);
        assert_eq!(missing.len(), 2);
        assert!(missing.contains(&"perm3".to_string()));
        assert!(missing.contains(&"perm4".to_string()));
    }

    #[test]
    fn test_scan_android_permissions() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;

        // Create dummy AndroidManifest.xml
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
                <uses-permission android:name="android.permission.READ_CONTACTS" />
                <application></application>
            </manifest>
        "#)?;

        // Create dummy source files
        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn use_location() {{ tauri::plugin::android::invoke(\"getLocation\", ...); }}")?;

        let file2_path = dir.path().join("file2.kt");
        let mut file2 = std::fs::File::create(&file2_path)?;
        writeln!(file2, "fun openCamera() {{ /* camera code */ }}")?;

        let file3_path = dir.path().join("file3.java");
        let mut file3 = std::fs::File::create(&file3_path)?;
        writeln!(file3, "void readContacts() {{ /* contacts code */ }}")?; // This permission is declared

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string(), "kt".to_string(), "java".to_string()];

        let missing_permissions = scan_android_permissions(
            manifest_path.to_str().unwrap(),
            &source_code_paths,
            &file_extensions
        )?;

        assert_eq!(missing_permissions.len(), 2);
        assert!(missing_permissions.contains(&"android.permission.ACCESS_FINE_LOCATION".to_string()));
        assert!(missing_permissions.contains(&"android.permission.CAMERA".to_string()));
        assert!(!missing_permissions.contains(&"android.permission.READ_CONTACTS".to_string())); // Should not be missing

        Ok(())
    }

    #[test]
    fn test_scan_android_permissions_empty_source_paths() -> Result<(), Box<dyn std::error::Error>> {
        let manifest_dir = tempdir()?;
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
            </manifest>
        "#)?;

        let source_code_paths = Vec::new(); // Empty source paths
        let file_extensions = vec!["rs".to_string()];

        let missing_permissions = scan_android_permissions(
            manifest_path.to_str().unwrap(),
            &source_code_paths,
            &file_extensions
        )?;
        // analyze_source_code with empty paths should return an empty set of used permissions.
        // So, no permissions should be reported as missing if none are used.
        assert!(missing_permissions.is_empty());
        Ok(())
    }

    #[test]
    fn test_scan_android_permissions_manifest_not_found() {
        let source_code_paths = vec!["dummy_path".to_string()];
        let file_extensions = vec!["rs".to_string()];
        let result = scan_android_permissions(
            "/path/to/non/existent/AndroidManifest.xml",
            &source_code_paths,
            &file_extensions
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_scan_android_permissions_empty_manifest_content() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;

        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, "")?; // Empty manifest

        let file1_path = dir.path().join("file1.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn uses_camera() {{ openCamera(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];

        let missing_permissions = scan_android_permissions(
            manifest_path.to_str().unwrap(),
            &source_code_paths,
            &file_extensions
        )?;
        // Declared permissions will be empty. Used permission is CAMERA. So CAMERA should be missing.
        assert_eq!(missing_permissions.len(), 1);
        assert!(missing_permissions.contains(&"android.permission.CAMERA".to_string()));
        Ok(())
    }

    #[test]
    fn test_scan_android_permissions_no_declared_some_used() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"<manifest xmlns:android="http://schemas.android.com/apk/res/android"></manifest>"#)?; // No permissions declared

        let file1_path = dir.path().join("code.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn main() {{ readContacts(); getLocation(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let missing_permissions = scan_android_permissions(manifest_path.to_str().unwrap(), &source_code_paths, &file_extensions)?;
        
        assert_eq!(missing_permissions.len(), 2);
        assert!(missing_permissions.contains(&"android.permission.READ_CONTACTS".to_string()));
        assert!(missing_permissions.contains(&"android.permission.ACCESS_FINE_LOCATION".to_string()));
        Ok(())
    }

    #[test]
    fn test_scan_android_permissions_declared_none_used() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
                <uses-permission android:name="android.permission.CAMERA" />
            </manifest>
        "#)?;

        let file1_path = dir.path().join("code.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn main() {{ println!(\"Hello\"); }}")?; // No permissions used

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let missing_permissions = scan_android_permissions(manifest_path.to_str().unwrap(), &source_code_paths, &file_extensions)?;
        
        assert!(missing_permissions.is_empty());
        Ok(())
    }

    #[test]
    fn test_scan_android_permissions_all_used_are_declared() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.CAMERA" />
                <uses-permission android:name="android.permission.READ_CONTACTS" />
            </manifest>
        "#)?;

        let file1_path = dir.path().join("code.rs");
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn main() {{ openCamera(); readContacts(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = vec!["rs".to_string()];
        let missing_permissions = scan_android_permissions(manifest_path.to_str().unwrap(), &source_code_paths, &file_extensions)?;
        
        assert!(missing_permissions.is_empty());
        Ok(())
    }
    
    #[test]
    fn test_scan_android_permissions_empty_file_extensions() -> Result<(), Box<dyn std::error::Error>> {
        let dir = tempdir()?;
        let manifest_dir = tempdir()?;
        let manifest_path = manifest_dir.path().join("AndroidManifest.xml");
        let mut manifest_file = std::fs::File::create(&manifest_path)?;
        writeln!(manifest_file, r#"
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
            </manifest>
        "#)?;

        let file1_path = dir.path().join("code.rs"); // This file uses CAMERA
        let mut file1 = std::fs::File::create(&file1_path)?;
        writeln!(file1, "fn main() {{ openCamera(); }}")?;

        let source_code_paths = vec![dir.path().to_str().unwrap().to_string()];
        let file_extensions = Vec::new(); // Empty file extensions

        let missing_permissions = scan_android_permissions(manifest_path.to_str().unwrap(), &source_code_paths, &file_extensions)?;
        // analyze_source_code should return empty set for used permissions.
        // So, no permissions should be reported missing.
        assert!(missing_permissions.is_empty());
        Ok(())
    }
}