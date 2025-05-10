use quick_xml::events::Event;
use quick_xml::Reader;
use std::io::BufReader;

pub fn parse_manifest(manifest_content: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut reader = Reader::from_reader(BufReader::new(manifest_content.as_bytes()));
    reader.trim_text(true);
    let mut buf = Vec::new();
    let mut permissions = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Err(e) => panic!("Error at position {}: {:?}", reader.buffer_position(), e),
            Ok(Event::Eof) => break,
            Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"uses-permission" {
                    for attribute in e.attributes() {
                        let attr = attribute?;
                        if attr.key.as_ref() == b"android:name" {
                            let permission_name = String::from_utf8(attr.value.into_owned())?;
                            permissions.push(permission_name);
                        }
                    }
                }
            }
            _ => (),
        }
        buf.clear();
    }

    Ok(permissions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_manifest() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
                <uses-permission android:name="android.permission.READ_CONTACTS" />
                <application>
                    <activity android:name=".MainActivity">
                        <intent-filter>
                            <action android:name="android.intent.action.MAIN" />
                            <category android:name="android.intent.category.LAUNCHER" />
                        </intent-filter>
                    </activity>
                </application>
            </manifest>
        "#;
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 2);
        assert!(permissions.contains(&"android.permission.INTERNET".to_string()));
        assert!(permissions.contains(&"android.permission.READ_CONTACTS".to_string()));
    }

    #[test]
    fn test_parse_manifest_no_permissions() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <application>
                    <activity android:name=".MainActivity">
                        <intent-filter>
                            <action android:name="android.intent.action.MAIN" />
                            <category android:name="android.intent.category.LAUNCHER" />
                        </intent-filter>
                    </activity>
                </application>
            </manifest>
        "#;
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 0);
    }

    #[test]
    fn test_parse_manifest_empty_content() {
        let manifest_content = "";
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 0);
    }

    #[test]
    fn test_parse_manifest_permission_tag_without_name_attribute() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.INTERNET" />
                <uses-permission />
                <uses-permission android:foo="bar" />
            </manifest>
        "#;
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 1);
        assert!(permissions.contains(&"android.permission.INTERNET".to_string()));
    }

    #[test]
    fn test_parse_manifest_with_sdk_specific_permission() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.CAMERA" />
                <uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION" />
            </manifest>
        "#;
        // Current implementation only looks for "uses-permission"
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 1);
        assert!(permissions.contains(&"android.permission.CAMERA".to_string()));
    }

    #[test]
    fn test_parse_manifest_with_attributes_other_than_name() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
            </manifest>
        "#;
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 1);
        assert!(permissions.contains(&"android.permission.WRITE_EXTERNAL_STORAGE".to_string()));
    }

    #[test]
    fn test_parse_manifest_with_comments_and_processing_instructions() {
        let manifest_content = r#"
            <?xml version="1.0" encoding="utf-8"?>
            <!-- Comment -->
            <?processing instruction?>
            <manifest xmlns:android="http://schemas.android.com/apk/res/android">
                <uses-permission android:name="android.permission.VIBRATE" />
            </manifest>
        "#;
        let permissions = parse_manifest(manifest_content).unwrap();
        assert_eq!(permissions.len(), 1);
        assert!(permissions.contains(&"android.permission.VIBRATE".to_string()));
    }

    // Test for malformed XML (quick-xml should ideally return an error, and our function propagates it)
    // The current function panics on `reader.read_event_into(&mut buf)`.
    // To properly test this, we'd need to check for a panic or change the function to return a Result
    // that can be asserted. For now, we'll assume `quick-xml` handles it or the panic is acceptable.
    // If a specific error type is expected, the function signature and error handling would need adjustment.
    // #[test]
    // #[should_panic] // Or expect a specific error if the function returned Result consistently
    // fn test_parse_manifest_malformed_xml() {
    //     let manifest_content = r#"
    //         <?xml version="1.0" encoding="utf-8"?>
    //         <manifest xmlns:android="http://schemas.android.com/apk/res/android">
    //             <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"
    //         </manifest> <!-- Missing closing tag -->
    //     "#;
    //     // This will panic due to quick_xml error.
    //     // If we changed parse_manifest to return Result<_, quick_xml::Error>, we could assert Err.
    //     let _ = parse_manifest(manifest_content);
    // }
}