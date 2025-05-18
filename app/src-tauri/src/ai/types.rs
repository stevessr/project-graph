// src-tauri/src/types.rs
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
    pub provider: String, // e.g., "openai", "anthropic", "gemini", "local_ai"
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "baseUrl")]
    pub base_url: Option<String>, // Optional
    pub model: Option<String>,
    pub temperature: Option<f32>,
    #[serde(rename = "maxTokens")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

// Define AiSettings struct
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiSettings {
    #[serde(rename = "apiConfigs")]
    pub api_configs: Vec<ApiConfig>,
    #[serde(rename = "activeConfigId")]
    pub active_config_id: Option<String>,
    // Retained fields for prompt management
    #[serde(rename = "promptCollections")]
    pub prompt_collections: Option<HashMap<String, PromptCollection>>,
    #[serde(rename = "summaryPrompt")]
    pub summary_prompt: Option<String>,
    #[serde(rename = "customPrompts")]
    pub custom_prompts: Option<String>,
}

impl Default for AiSettings {
    fn default() -> Self {
        let mut default_api_configs = Vec::new();

        // 1. OpenAI Default
        let default_openai_config = ApiConfig {
            id: Uuid::new_v4().to_string(),
            name: "OpenAI Default".to_string(),
            provider: "openai".to_string(), // Front-end might map this to "chat" provider type if it's generic
            api_key: "".to_string(),        // User must fill this
            base_url: Some("https://api.openai.com/v1".to_string()),
            model: Some("gpt-4o".to_string()), // Updated to a more recent model
            temperature: Some(0.7),
            max_tokens: Some(4096),
            notes: Some("Default configuration for OpenAI. Please add your API key.".to_string()),
        };
        default_api_configs.push(default_openai_config);

        // 2. Anthropic (Claude) Default
        let default_anthropic_config = ApiConfig {
            id: Uuid::new_v4().to_string(),
            name: "Anthropic (Claude) Default".to_string(),
            provider: "anthropic".to_string(),
            api_key: "".to_string(), // User must fill this
            base_url: Some("https://api.anthropic.com/v1".to_string()), // Confirm official endpoint
            model: Some("claude-3-opus-20240229".to_string()),
            temperature: Some(0.7),
            max_tokens: Some(4096), // Anthropic uses 'max_tokens_to_sample', but we keep 'max_tokens' for consistency
            notes: Some(
                "Default configuration for Anthropic Claude. Add API key. Note: Anthropic uses 'max_tokens_to_sample' but this field is 'max_tokens'.".to_string(),
            ),
        };
        default_api_configs.push(default_anthropic_config);

        // 3. Google Gemini Default
        let default_gemini_config = ApiConfig {
            id: Uuid::new_v4().to_string(),
            name: "Google Gemini Default".to_string(),
            provider: "google-gemini".to_string(), // Or "gemini"
            api_key: "".to_string(),               // User must fill this
            base_url: Some("https://generativelanguage.googleapis.com/v1beta".to_string()), // Common endpoint for Gemini API
            model: Some("gemini-1.5-pro-latest".to_string()), // Or "gemini-pro"
            temperature: Some(0.7),
            max_tokens: Some(8192), // Gemini models can have large context windows
            notes: Some(
                "Default configuration for Google Gemini. Add API key via Google AI Studio or GCP."
                    .to_string(),
            ),
        };
        default_api_configs.push(default_gemini_config);

        // 4. Ollama (Local AI) Default
        let default_ollama_config = ApiConfig {
            id: Uuid::new_v4().to_string(),
            name: "Ollama (Local)".to_string(),
            provider: "ollama".to_string(), // Or "local-ai"
            api_key: "ollama".to_string(), // Often not needed or a placeholder
            base_url: Some("http://localhost:11434/v1".to_string()), // Common Ollama OpenAI-compatible endpoint
            model: Some("llama3".to_string()), // Suggest a common model, user should change if needed
            temperature: Some(0.7),
            max_tokens: Some(2048),
            notes: Some(
                "Default for Ollama (running locally). Ensure Ollama server is running and has the specified model downloaded. The API key is often ignored or can be any string.".to_string(),
            ),
        };
        default_api_configs.push(default_ollama_config);

        // 5. Groq Default
        let default_groq_config = ApiConfig {
            id: Uuid::new_v4().to_string(),
            name: "Groq Default".to_string(),
            provider: "groq".to_string(),
            api_key: "".to_string(), // User must fill this
            base_url: Some("https://api.groq.com/openai/v1".to_string()),
            model: Some("llama3-8b-8192".to_string()), // Example model, check Groq for available models
            temperature: Some(0.7),
            max_tokens: Some(8192),
            notes: Some(
                "Default configuration for Groq. Please add your API key from GroqCloud."
                    .to_string(),
            ),
        };
        default_api_configs.push(default_groq_config);

        let default_active_id = if !default_api_configs.is_empty() {
            Some(default_api_configs[0].id.clone()) // OpenAI will be active by default
        } else {
            None
        };

        AiSettings {
            api_configs: default_api_configs,
            active_config_id: default_active_id,
            prompt_collections: Some(HashMap::new()), // Initialize with empty collections
            summary_prompt: Some("Summarize the following text concisely:".to_string()), // A more useful default summary prompt
            custom_prompts: Some(String::new()), // Retain for backward compatibility or simple use cases
        }
    }
}
