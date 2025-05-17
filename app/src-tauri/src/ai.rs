// src/ai.rs
// Add this line to import types from the new module
mod types;
use types::{AiSettings, ApiConfig, PromptCollection, PromptNode, PromptVersion};

use reqwest::header::{HeaderValue, AUTHORIZATION};
use std::collections::HashMap;
use serde_json;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;
use uuid::Uuid; // Still needed for add_api_config to generate new IDs

// --- Struct definitions and impl Default for AiSettings are REMOVED from here ---

#[tauri::command]
pub async fn save_ai_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    settings: AiSettings, // Uses imported AiSettings
) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.json")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    let settings_value = serde_json::to_value(settings) // Uses imported AiSettings
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set("settings".to_string(), settings_value);

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<AiSettings, String> { // Returns imported AiSettings
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.json")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store
        .reload()
        .map_err(|e| format!("Failed to reload store: {}", e))?;

    let loaded_settings_value = store.get("settings");

    match loaded_settings_value {
        Some(value) => serde_json::from_value::<AiSettings>(value.clone()) // Deserializes to imported AiSettings
            .map_err(|e| format!("Failed to deserialize settings: {}", e)),
        None => {
            println!("No existing AI settings found, returning default.");
            Ok(AiSettings::default()) // Uses imported AiSettings::default()
        }
    }
}

#[tauri::command]
pub async fn get_all_api_configs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ApiConfig>, String> { // Returns Vec of imported ApiConfig
    let settings = load_ai_settings(app).await?;
    Ok(settings.api_configs)
}

#[tauri::command]
pub async fn add_api_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    mut new_config: ApiConfig, // Uses imported ApiConfig
) -> Result<(), String> {
    let mut settings = load_ai_settings(app.clone()).await?;

    if new_config.id.is_empty() {
        new_config.id = Uuid::new_v4().to_string();
    } else {
        if settings.api_configs.iter().any(|c| c.id == new_config.id) {
            return Err(format!(
                "API Configuration with ID '{}' already exists.",
                new_config.id
            ));
        }
    }

    if settings
        .api_configs
        .iter()
        .any(|c| c.name == new_config.name)
    {
        return Err(format!(
            "API Configuration with name '{}' already exists.",
            new_config.name
        ));
    }

    settings.api_configs.push(new_config);
    save_ai_settings(app, settings).await
}

#[tauri::command]
pub async fn edit_api_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    updated_config: ApiConfig, // Uses imported ApiConfig
) -> Result<(), String> {
    let original_settings = load_ai_settings(app.clone()).await?;

    let name_exists = original_settings
        .api_configs
        .iter()
        .any(|config| config.id != updated_config.id && config.name == updated_config.name);

    if name_exists {
        return Err(format!(
            "Another API Configuration with name '{}' already exists.",
            updated_config.name
        ));
    }
    let mut mutable_settings = original_settings;

    if let Some(config_to_update) = mutable_settings
        .api_configs
        .iter_mut()
        .find(|c| c.id == updated_config.id)
    {
        *config_to_update = updated_config;
        save_ai_settings(app, mutable_settings).await
    } else {
        Err(format!(
            "API Configuration with ID '{}' not found for update.",
            updated_config.id // Use updated_config.id for the error message consistency
        ))
    }
}

#[tauri::command]
pub async fn delete_api_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config_id: String,
) -> Result<(), String> {
    let mut settings = load_ai_settings(app.clone()).await?;
    let initial_len = settings.api_configs.len();
    settings.api_configs.retain(|c| c.id != config_id);

    if settings.api_configs.len() == initial_len {
        return Err(format!(
            "API Configuration with ID '{}' not found.",
            config_id
        ));
    }

    if settings.active_config_id.as_deref() == Some(&config_id) {
        settings.active_config_id = if settings.api_configs.is_empty() {
            None
        } else {
            Some(settings.api_configs[0].id.clone())
        };
    }

    save_ai_settings(app, settings).await
}

#[tauri::command]
pub async fn set_active_api_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config_id: String,
) -> Result<(), String> {
    let mut settings = load_ai_settings(app.clone()).await?;

    if !settings.api_configs.iter().any(|c| c.id == config_id) {
        return Err(format!(
            "API Configuration with ID '{}' not found.",
            config_id
        ));
    }

    settings.active_config_id = Some(config_id);
    save_ai_settings(app, settings).await
}

#[tauri::command]
pub async fn get_active_api_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<ApiConfig>, String> { // Returns Option of imported ApiConfig
    let settings = load_ai_settings(app).await?;

    match settings.active_config_id {
        Some(id) => Ok(settings.api_configs.into_iter().find(|c| c.id == id)),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn save_prompt_version<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    prompt_name: String,
    content: PromptNode, // Uses imported PromptNode
) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.json")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store
        .reload()
        .map_err(|e| format!("Failed to reload store before saving: {}", e))?;

    let mut settings: AiSettings = match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
        None => AiSettings::default(),
    };

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get timestamp: {}", e))?
        .as_millis() as i64;

    let new_version = PromptVersion { content, timestamp }; // Uses imported PromptVersion

    let collections = settings.prompt_collections.get_or_insert_with(HashMap::new); // HashMap still needed here as it's used to construct the default

    let collection = collections
        .entry(prompt_name.clone())
        .or_insert_with(|| PromptCollection { // Uses imported PromptCollection
            name: prompt_name,
            versions: Vec::new(),
        });

    collection.versions.push(new_version);

    collection
        .versions
        .sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set("settings".to_string(), settings_value);

    store
        .save()
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
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.json")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store
        .reload()
        .map_err(|e| format!("Failed to reload store before deletion: {}", e))?;

    let mut settings: AiSettings = match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
        None => AiSettings::default(),
    };

    if let Some(collections) = settings.prompt_collections.as_mut() {
        if let Some(collection) = collections.get_mut(&prompt_name) {
            let initial_len = collection.versions.len();
            collection
                .versions
                .retain(|version| version.timestamp != timestamp);

            if collection.versions.len() == initial_len {
                return Err(format!(
                    "Version with timestamp {} not found for prompt '{}'",
                    timestamp, prompt_name
                ));
            }

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

    store
        .save()
        .map_err(|e| format!("Failed to save store after deletion: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn update_prompt_version<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    prompt_name: String,
    timestamp: i64,
    content: PromptNode, // Uses imported PromptNode
) -> Result<(), String> {
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.json")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    store
        .reload()
        .map_err(|e| format!("Failed to reload store before update: {}", e))?;

    let mut settings: AiSettings = match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize settings: {}", e))?,
        None => AiSettings::default(),
    };

    if let Some(collections) = settings.prompt_collections.as_mut() {
        if let Some(collection) = collections.get_mut(&prompt_name) {
            if let Some(version) = collection
                .versions
                .iter_mut()
                .find(|v| v.timestamp == timestamp)
            {
                version.content = content;
            } else {
                return Err(format!(
                    "Version with timestamp {} not found for prompt '{}'",
                    timestamp, prompt_name
                ));
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

    store
        .save()
        .map_err(|e| format!("Failed to save store after update: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn fetch_ai_models<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    url: String,
    api_key: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let mut request_builder = client.get(&url);

    if let Some(key) = api_key {
        if !key.trim().is_empty() {
            let bearer_token = format!("Bearer {}", key);
            match HeaderValue::from_str(&bearer_token) {
                Ok(header_value) => {
                    request_builder = request_builder.header(AUTHORIZATION, header_value);
                }
                Err(e) => {
                    return Err(format!(
                        "Invalid API key format for Authorization header: {}",
                        e
                    ));
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
        let error_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read error body".to_string());
        return Err(format!(
            "Request failed with status {}: {}",
            status, error_body
        ));
    }

    let json_response = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    Ok(json_response)
}

#[tauri::command]
pub async fn reset_ai_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    println!("Resetting AI settings to default.");
    let default_settings = AiSettings::default(); // Uses imported AiSettings::default()
    save_ai_settings(app, default_settings).await
}