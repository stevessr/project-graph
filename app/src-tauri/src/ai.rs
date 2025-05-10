use reqwest::header::{HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json; // Used for serde_json::Value and to_value/from_value
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;
use std::collections::HashMap; // 引入 HashMap
use std::time::{SystemTime, UNIX_EPOCH}; // 引入时间相关模块
use log::error; // Add logging


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
    pub custom_prompts: Option<String>,
    pub include_parent_node_info: Option<bool>, // Add new field
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
            custom_prompts: Some(String::new()),
            include_parent_node_info: Some(true), // Default to true
        }
    }
}

#[tauri::command]
pub async fn save_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>, settings: AiSettings) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| {
            error!("Failed to build store for saving settings: {}", e);
            "Failed to initialize settings storage.".to_string()
        })?;

    store.reload()
         .map_err(|e| {
             error!("Failed to reload store before saving settings: {}", e);
             "Failed to load existing settings.".to_string()
         })?;

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| {
            error!("Failed to serialize settings: {}", e);
            "Failed to process settings data.".to_string()
        })?;

    store.set("settings".to_string(), settings_value);

    store.save()
         .map_err(|e| {
             error!("Failed to save settings: {}", e);
             "Failed to save settings.".to_string()
         })?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<AiSettings, String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| {
            error!("Failed to build store for loading settings: {}", e);
            "Failed to initialize settings storage.".to_string()
        })?;

    store.reload()
         .map_err(|e| {
             error!("Failed to reload store before loading settings: {}", e);
             "Failed to load settings.".to_string()
         })?;

    let loaded_settings_value = store.get("settings");

    match loaded_settings_value {
        Some(value) => {
            let mut settings: AiSettings = serde_json::from_value::<AiSettings>(value.clone())
                .map_err(|e| {
                    error!("Failed to deserialize settings: {}", e);
                    "Failed to process settings data.".to_string()
                })?;
            
            // Ensure include_parent_node_info has a default value if not present in the file
            if settings.include_parent_node_info.is_none() {
                settings.include_parent_node_info = Some(true);
            }

            Ok(settings)
        }
        None => {
            println!("No existing AI settings found, returning default.");
            Ok(AiSettings::default())
        }
    }
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
pub async fn update_prompt_version<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    prompt_name: String,
    timestamp: i64,
    content: PromptNode,
) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store.reload()
         .map_err(|e| format!("Failed to reload store before update: {}", e))?;

    let mut settings: AiSettings = match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
        None => AiSettings::default(),
    };

    if let Some(collections) = settings.prompt_collections.as_mut() {
        if let Some(collection) = collections.get_mut(&prompt_name) {
            // Find the version to update by timestamp
            if let Some(version) = collection.versions.iter_mut().find(|v| v.timestamp == timestamp) {
                version.content = content;
            } else {
                return Err(format!("Version with timestamp {} not found for prompt '{}'", timestamp, prompt_name));
            }
        } else {
            return Err(format!("Prompt collection '{}' not found", prompt_name));
        }
    } else {
        return Err("Prompt collections not initialized".to_string());
    }

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings after update: {}", e))?;

    store.set("settings".to_string(), settings_value);

    store.save()
         .map_err(|e| format!("Failed to save store after update: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn fetch_ai_models<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>, // Parameter kept but marked unused if not needed
    url: String,
    api_key: Option<String>
) -> Result<serde_json::Value, String> {

    log::info!("Fetching AI models from: {}", url); // Add logging for the URL

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
                    error!("Invalid API key format for Authorization header: {}", e);
                    return Err("Invalid API key format.".to_string());
                }
            }
        }
    }

    let response = request_builder
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send request to '{}': {}", url, e);
            "Failed to connect to the AI service.".to_string()
        })?;

    if !response.status().is_success() {
        let status = response.status();
        // Try to get error body text, provide fallback message
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
         error!("Request to '{}' failed with status {}: {}", url, status, error_body);
         return Err(format!("Request failed with status {}.", status));
    }

    let json_response = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| {
            error!("Failed to parse JSON response from '{}': {}", url, e);
            "Failed to process response from AI service.".to_string()
        })?;

    Ok(json_response)
}