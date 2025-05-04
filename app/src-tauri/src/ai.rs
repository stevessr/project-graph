use reqwest::header::{HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json; // Used for serde_json::Value and to_value/from_value
use tauri::Manager;
use tauri_plugin_store::StoreBuilder;

// Define AiSettings struct ONCE
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

// Define AiSettings struct ONCE
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSettings {
    pub api_endpoint: Option<String>,
    pub api_key: Option<String>,
    pub selected_model: Option<String>,
    // Change custom_prompts to store structured nodes
    pub custom_prompts: Option<Vec<PromptNode>>,
    pub api_type: Option<String>, // Add api_type
    pub summary_prompt: Option<String>, // Add field for custom summary prompt
}

impl Default for AiSettings {
    fn default() -> Self {
        AiSettings {
            api_endpoint: None,
            api_key: None,
            selected_model: None,
            // Provide a default structured prompt
            custom_prompts: Some(vec![
                PromptNode {
                    text: "请根据输入的文本，生成 3-5 个相关的拓展词汇或短语。".to_string(),
                    node_type: Some("instruction".to_string()),
                    params: None,
                    children: None,
                }
            ]),
            api_type: None, // Add default for api_type
            summary_prompt: None, // Add default for summary_prompt
        }
    }
}

#[tauri::command]
pub async fn save_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>, settings: AiSettings) -> Result<(), String> {
    // Use app.app_handle() if needed, otherwise app is fine
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    // It's good practice to reload before saving in case the file was modified externally,
    // though less critical than before loading. Optional, but can prevent race conditions.
    store.reload()
         .map_err(|e| format!("Failed to reload store before saving: {}", e))?;

    let settings_value = serde_json::to_value(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    // Call store.set directly, assuming the compiler is correct FOR NOW that it returns ()
    // We are losing the specific error checking for the 'set' operation itself here.
    store.set("settings".to_string(), settings_value);

    // Now, attempt to save the store. If 'set' caused an invalid state
    // that prevents saving, this 'save' call should fail.
    store.save()
         .map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_settings<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<AiSettings, String> {
    // Use app.app_handle() if needed, otherwise app is fine
    #[allow(unused_mut)]
    let mut store = StoreBuilder::new(app.app_handle(), ".ai_settings.dat")
        .build()
        .map_err(|e| format!("Failed to build store: {}", e))?;

    // Use reload() as it's the correct method now
    store.reload()
         .map_err(|e| format!("Failed to reload store: {}", e))?; // Handle potential reload error

    match store.get("settings") {
        Some(value) => serde_json::from_value(value.clone()) // Clone value before deserializing
            .map_err(|e| format!("Failed to deserialize settings: {}", e)),
        None => Ok(AiSettings::default()), // Return default if no settings found
    }
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