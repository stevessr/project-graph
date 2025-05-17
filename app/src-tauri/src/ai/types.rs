// src/types.rs
use serde::{Deserialize, Serialize};
use serde_json; // Used for serde_json::Value
use std::collections::HashMap;
use uuid::Uuid; // Used in AiSettings::default

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

// Define struct for a single API configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiConfig {
    pub id: String,
    pub name: String,
    pub endpoint_url: String,
    pub api_key: String, // API Key - Stored in Tauri's store.
    pub api_type: String,
    pub default_model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

// Define AiSettings struct
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSettings {
    pub api_configs: Vec<ApiConfig>,
    pub active_config_id: Option<String>,
    // Retained fields for prompt management
    pub prompt_collections: Option<HashMap<String, PromptCollection>>,
    pub summary_prompt: Option<String>,
    pub custom_prompts: Option<String>,
}

impl Default for AiSettings {
    fn default() -> Self {
        let default_openai_config = ApiConfig {
            id: Uuid::new_v4().to_string(), // Use Uuid for default as well for consistency if preferred
            // id: "default_openai_config_v1".to_string(), // Or keep specific string ID
            name: "OpenAI".to_string(),
            endpoint_url: "https://api.openai.com/v1".to_string(),
            api_key: "".to_string(),
            api_type: "openai".to_string(),
            default_model: "gpt-3.5-turbo".to_string(),
            notes: Some(
                "This is a default configuration for OpenAI. Please add your API key.".to_string(),
            ),
        };
        let mut default_api_configs = Vec::new();
        default_api_configs.push(default_openai_config);

        let default_active_id = if !default_api_configs.is_empty() {
            Some(default_api_configs[0].id.clone())
        } else {
            None
        };

        AiSettings {
            api_configs: default_api_configs,
            active_config_id: default_active_id,
            prompt_collections: Some(HashMap::new()),
            summary_prompt: None,
            custom_prompts: Some(String::new()),
        }
    }
}