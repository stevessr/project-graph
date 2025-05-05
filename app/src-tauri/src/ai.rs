use reqwest::header::{HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json; // Used for serde_json::Value and to_value/from_value
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;
use std::collections::HashMap; // 引入 HashMap
use std::time::{SystemTime, UNIX_EPOCH}; // 引入时间相关模块

// Define struct for structured prompt nodes
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptNode {
    pub text: String,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub node_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>, // Change to serde_json::Value
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<PromptNode>>,
}

// Define struct for a specific version of a prompt
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptVersion {
    pub content: PromptNode, // 保留 PromptNode 以支持结构化提示词
    pub timestamp: i64,      // 使用 Unix 时间戳 (毫秒) 记录修改时间
    // 可选：未来可以添加如版本说明等字段
}

// Define struct for a collection of prompt versions
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PromptCollection {
    pub name: String, // 提示词的名称，用于标识和显示
    pub versions: Vec<PromptVersion>, // 存储该提示词的所有版本
    // 可选：可以增加一个字段标记当前活动版本
}


// Define AiSettings struct ONCE
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSettings {
    pub api_endpoint: Option<String>,
    pub api_key: Option<String>,
    pub selected_model: Option<String>,
    // 新增字段，用于存储版本化的提示词
    pub prompt_collections: Option<HashMap<String, PromptCollection>>,
    pub api_type: Option<String>, // Add api_type
    pub summary_prompt: Option<String>, // Add field for custom summary prompt
    // 旧的 custom_prompts 字段需要考虑移除或迁移
    #[serde(skip_serializing_if = "Option::is_none")] // 暂时保留旧字段以便数据迁移，但不序列化
    pub custom_prompts: Option<Vec<PromptNode>>,
}

impl Default for AiSettings {
    fn default() -> Self {
        AiSettings {
            api_endpoint: None,
            api_key: None,
            selected_model: None,
            // 初始化 prompt_collections 为空的 HashMap
            prompt_collections: Some(HashMap::new()),
            api_type: None,
            summary_prompt: None,
            custom_prompts: None, // 旧字段默认值
        }
    }
}

#[tauri::command]
pub async fn save_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>, settings: AiSettings) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store.reload()
         .map_err(|e| format!("Failed to reload store before saving: {}", e))?;

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set("settings".to_string(), settings_value);

    store.save()
         .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<AiSettings, String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store.reload()
         .map_err(|e| format!("Failed to reload store: {}", e))?;

    // CORRECTED LINE: Directly use the Option returned by get()
    let loaded_settings_value = store.get("settings");

    match loaded_settings_value {
        // Added .cloned() here because from_value takes ownership, and we might need
        // the value again in the Err branch for the second deserialization attempt.
        Some(value) => {
            // Attempt to deserialize into the new structure
            match serde_json::from_value::<AiSettings>(value.clone()) { // Clone value here
                Ok(mut settings) => {
                    // Check for old format and migrate if necessary
                    // Check if old field exists AND new field is None or empty
                    if settings.custom_prompts.is_some() && (settings.prompt_collections.is_none() || settings.prompt_collections.as_ref().map_or(true, |m| m.is_empty())) {
                        println!("Attempting migration from custom_prompts..."); // Log migration attempt
                        let mut new_collections = settings.prompt_collections.unwrap_or_else(HashMap::new); // Start with existing or new map

                        if let Some(old_prompts) = settings.custom_prompts.take() { // Take ownership
                            for (i, prompt_node) in old_prompts.into_iter().enumerate() {
                                let prompt_name = format!("Migrated Prompt {}", i + 1); // Default name
                                // Ensure migrated prompts don't overwrite existing ones with the same default name
                                let unique_prompt_name = if new_collections.contains_key(&prompt_name) {
                                    format!("{} ({})", prompt_name, SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis())
                                } else {
                                    prompt_name
                                };

                                let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
                                    .map_err(|e| format!("Failed to get timestamp: {}", e))?
                                    .as_millis() as i64;

                                let version = PromptVersion {
                                    content: prompt_node,
                                    timestamp,
                                };

                                let collection = PromptCollection {
                                    name: unique_prompt_name.clone(),
                                    versions: vec![version],
                                };
                                new_collections.insert(unique_prompt_name, collection);
                            }
                        }
                        settings.prompt_collections = Some(new_collections);
                        // Ensure the old field is None after migration attempt
                        settings.custom_prompts = None;


                        // Save the migrated settings immediately
                        println!("Saving migrated settings..."); // Log save attempt
                        let migrated_settings_value = serde_json::to_value(&settings)
                            .map_err(|e| format!("Failed to serialize migrated settings: {}", e))?;
                        store.set("settings".to_string(), migrated_settings_value);
                        if let Err(save_err) = store.save() {
                             // Log the error but potentially continue with the migrated settings in memory
                             eprintln!("Failed to save migrated settings immediately: {}", save_err);
                             // Consider if you should return an error here or just log it.
                             // Returning error might be safer:
                             // return Err(format!("Failed to save migrated settings: {}", save_err));
                        } else {
                             println!("Successfully saved migrated settings."); // Log success
                        }

                    } else if settings.custom_prompts.is_some() {
                        // If prompt_collections already exists and has data, just remove the old field
                        settings.custom_prompts = None;
                         // Optionally save immediately to remove the redundant field from storage
                        println!("Removing redundant custom_prompts field from settings...");
                        let updated_settings_value = serde_json::to_value(&settings)
                            .map_err(|e| format!("Failed to serialize settings after removing redundant field: {}", e))?;
                        store.set("settings".to_string(), updated_settings_value);
                        if let Err(save_err) = store.save() {
                             eprintln!("Failed to save settings after removing redundant field: {}", save_err);
                             // Decide how to handle this error (log, return Err, etc.)
                        } else {
                             println!("Successfully saved settings after removing redundant field.");
                        }
                    }
                    Ok(settings)
                }
                Err(e) => {
                     // If deserialization to new structure fails, try old structure for migration
                    println!("Deserialization into AiSettings failed ({}), attempting fallback to OldAiSettings...", e); // Log fallback attempt
                    match serde_json::from_value::<OldAiSettings>(value) { // Use the original 'value' here
                         Ok(old_settings) => {
                            println!("Successfully deserialized into OldAiSettings, proceeding with migration..."); // Log success
                            let mut new_collections = HashMap::new();
                            if let Some(old_prompts) = old_settings.custom_prompts {
                                for (i, prompt_node) in old_prompts.into_iter().enumerate() {
                                    let prompt_name = format!("Migrated Prompt {}", i + 1);
                                     // Check for uniqueness again, though less likely in fresh migration
                                     let unique_prompt_name = if new_collections.contains_key(&prompt_name) {
                                        format!("{} ({})", prompt_name, SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis())
                                    } else {
                                        prompt_name
                                    };

                                    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
                                        .map_err(|e| format!("Failed to get timestamp: {}", e))?
                                        .as_millis() as i64;

                                    let version = PromptVersion {
                                        content: prompt_node,
                                        timestamp,
                                    };

                                    let collection = PromptCollection {
                                        name: unique_prompt_name.clone(),
                                        versions: vec![version],
                                    };
                                    new_collections.insert(unique_prompt_name, collection);
                                }
                            }

                            let migrated_settings = AiSettings {
                                api_endpoint: old_settings.api_endpoint,
                                api_key: old_settings.api_key,
                                selected_model: old_settings.selected_model,
                                prompt_collections: Some(new_collections),
                                api_type: old_settings.api_type,
                                summary_prompt: old_settings.summary_prompt,
                                custom_prompts: None, // Ensure old field is None in new structure
                            };

                            // Save the migrated settings
                            println!("Saving migrated settings from OldAiSettings fallback..."); // Log save
                            let migrated_settings_value = serde_json::to_value(&migrated_settings)
                                .map_err(|e| format!("Failed to serialize migrated settings (from old format): {}", e))?;
                            store.set("settings".to_string(), migrated_settings_value);
                             if let Err(save_err) = store.save() {
                                eprintln!("Failed to save migrated settings (from old format): {}", save_err);
                                // Decide how to handle this error
                                // return Err(format!("Failed to save migrated settings (from old format): {}", save_err));
                             } else {
                                 println!("Successfully saved migrated settings from old format."); // Log success
                             }

                            Ok(migrated_settings)
                         }
                         Err(migrate_err) => {
                            // If both deserialization attempts fail, return the original error
                             eprintln!("Fallback deserialization into OldAiSettings also failed: {}", migrate_err); // Log final failure
                            Err(format!("Failed to deserialize settings. New format error: [{}]. Old format error: [{}]", e, migrate_err))
                         }
                    }
                }
            }
        }
        None => {
            println!("No existing AI settings found, returning default."); // Log default case
            Ok(AiSettings::default()) // Return default if no settings found
        }
    }
}

// Helper struct for deserializing old settings format during migration
#[derive(Debug, Serialize, Deserialize)]
struct OldAiSettings {
    pub api_endpoint: Option<String>,
    pub api_key: Option<String>,
    pub selected_model: Option<String>,
    pub custom_prompts: Option<Vec<PromptNode>>,
    pub api_type: Option<String>,
    pub summary_prompt: Option<String>,
}


#[tauri::command]
pub async fn save_prompt_version<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    prompt_name: String,
    content: PromptNode,
) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store.reload()
         .map_err(|e| format!("Failed to reload store before saving: {}", e))?;

    let mut settings: AiSettings = match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
        None => AiSettings::default(),
    };

    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get timestamp: {}", e))?
        .as_millis() as i64;

    let new_version = PromptVersion {
        content,
        timestamp,
    };

    let collections = settings.prompt_collections.get_or_insert_with(HashMap::new);

    let collection = collections.entry(prompt_name.clone())
        .or_insert_with(|| PromptCollection {
            name: prompt_name,
            versions: Vec::new(),
        });

    collection.versions.push(new_version);

    // Sort versions by timestamp descending (latest first)
    collection.versions.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set("settings".to_string(), settings_value);

    store.save()
         .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_prompt_version<R: tauri::Runtime>(
   app: tauri::AppHandle<R>,
   prompt_name: String,
   timestamp: i64,
) -> Result<(), String> {
   #[allow(unused_mut)]
   let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
       .build()
       .map_err(|e| format!("Failed to build store: {}", e))?;

   store.reload()
        .map_err(|e| format!("Failed to reload store before deletion: {}", e))?;

   let mut settings: AiSettings = match store.get("settings") {
       Some(value) => serde_json::from_value(value.clone())
           .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
       None => AiSettings::default(),
   };

   if let Some(collections) = settings.prompt_collections.as_mut() {
       if let Some(collection) = collections.get_mut(&prompt_name) {
           // Find the index of the version to remove
           let initial_len = collection.versions.len();
           collection.versions.retain(|version| version.timestamp != timestamp);

           if collection.versions.len() == initial_len {
               // No version was removed, maybe the timestamp didn't match
               return Err(format!("Version with timestamp {} not found for prompt '{}'", timestamp, prompt_name));
           }

           // If the collection is now empty, remove the collection itself
           if collection.versions.is_empty() {
               collections.remove(&prompt_name);
           }
       } else {
           return Err(format!("Prompt collection '{}' not found", prompt_name));
       }
   } else {
       return Err("Prompt collections not initialized".to_string());
   }

   let settings_value = serde_json::to_value(settings)
       .map_err(|e| format!("Failed to serialize settings after deletion: {}", e))?;

   store.set("settings".to_string(), settings_value);

   store.save()
        .map_err(|e| format!("Failed to save store after deletion: {}", e))?;

   Ok(())
}


#[tauri::command]
pub async fn fetch_ai_models<R: tauri::Runtime>(
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