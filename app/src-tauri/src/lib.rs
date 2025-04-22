use std::env;
use std::io::Read;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use base64::engine::general_purpose;
use base64::Engine;

use tauri::{Manager, AppHandle, State};
use tauri::Runtime;
use tauri::Url;
#[cfg(desktop)]
use tauri_plugin_updater::UpdaterExt;

use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use futures_util::StreamExt;
use warp::{Filter, Reply, http::StatusCode};
use warp::sse::Event;
use serde::{Deserialize, Serialize};

// Basic MCP structures (simplified for demonstration)
#[derive(Debug, Deserialize)]
struct McpRequest {
    method: String,
    #[serde(default)]
    params: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct McpResponse<T> {
    result: Option<T>,
    error: Option<McpError>,
}

#[derive(Debug, Serialize)]
struct McpError {
    code: i32,
    message: String,
}

#[derive(Debug, Serialize)]
struct Resource {
    uri: String,
    name: String,
    #[serde(rename = "mimeType")]
    mime_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
}

#[derive(Debug, Serialize)]
struct ResourceContent {
    uri: String,
    #[serde(rename = "mimeType")]
    mime_type: String,
    text: String,
}

#[derive(Debug, Serialize)]
struct ListResourcesResult {
    resources: Vec<Resource>,
}

#[derive(Debug, Serialize)]
struct ReadResourceResult {
    contents: Vec<ResourceContent>,
}


/// 判断文件是否存在
#[tauri::command]
fn exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

/// 读取文件，返回字符串
#[tauri::command]
fn read_text_file(path: String) -> String {
    let mut file = std::fs::File::open(path).unwrap();
    let mut contents = String::new();
    file.read_to_string(&mut contents).unwrap();
    contents
}

/// 读取文件，返回base64
#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    Ok(general_purpose::STANDARD
        .encode(&std::fs::read(path).map_err(|e| format!("无法读取文件: {}", e))?))
}

/// 写入文件
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// 写入文件，base64字符串
#[tauri::command]
fn write_file_base64(content: String, path: String) -> Result<(), String> {
    std::fs::write(
        &path,
        &general_purpose::STANDARD
            .decode(content)
            .map_err(|e| format!("解码失败: {}", e))?,
    )
    .map_err(|e| {
        eprintln!("写入文件失败: {}", e);
        return e.to_string();
    })?;
    Ok(())
}

#[tauri::command]
fn create_folder(path: String) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn write_stdout(content: String) {
    println!("{}", content);
}

#[tauri::command]
fn write_stderr(content: String) {
    eprintln!("{}", content);
}

#[tauri::command]
fn exit(code: i32) {
    std::process::exit(code);
}

#[cfg(desktop)]
#[tauri::command]
async fn set_update_channel<R: Runtime>(
    app: tauri::AppHandle<R>,
    channel: String,
) -> Result<(), tauri_plugin_updater::Error> {
    println!("Setting update channel to {}", channel);
    app.updater_builder()
        .endpoints(vec![Url::parse(
            format!(
            "https://github.com/LiRenTech/project-graph/releases/{channel}/download/latest.json"
        )
            .as_str(),
        )?])?
        .build()?
        .check()
        .await?;
    Ok(())
}

// Add a new command to update project graph state
#[tauri::command]
fn update_project_graph_state(state_json: String, tx: tauri::State<Arc<Mutex<broadcast::Sender<String>>>>) -> Result<(), String> {
    if let Err(e) = tx.lock().unwrap().send(state_json) {
        eprintln!("Failed to send project graph state via SSE: {}", e);
        Err(e.to_string())
    } else {
        Ok(())
    }
}

// Tauri command to handle MCP edit_node calls from the frontend
#[tauri::command]
async fn handle_mcp_edit_node<R: Runtime>(app: AppHandle<R>, uuid: String, updates: serde_json::Value) -> Result<(), String> {
    eprintln!("Received edit_node request from MCP for UUID: {}", uuid);
    eprintln!("Updates: {}", serde_json::to_string_pretty(&updates).unwrap_or_default());

    // Emit an event to the frontend to handle the node update
    app.emit_all("mcp-edit-node", serde_json::json!({
        "uuid": uuid,
        "updates": updates
    }))
    .map_err(|e| format!("Failed to emit mcp-edit-node event: {}", e))?;

    Ok(())
}

// MCP handler functions
async fn handle_mcp_request<R: Runtime>(
    request: McpRequest,
    tx: Arc<Mutex<broadcast::Sender<String>>>,
    app: AppHandle<R>,
) -> Result<impl Reply, warp::Rejection> {
    match request.method.as_str() {
        "ListResources" => {
            let resources = vec![
                Resource {
                    uri: "project-graph://current-state".to_string(),
                    name: "Current Project Graph State".to_string(),
                    mime_type: "application/json".to_string(),
                    description: Some("The current state of the project graph, including nodes and associations.".to_string()),
                },
            ];
            let response = McpResponse {
                result: Some(ListResourcesResult { resources }),
                error: None,
            };
            Ok(warp::reply::json(&response))
        }
        "ReadResource" => {
            let uri = request.params["uri"].as_str().unwrap_or_default();
            if uri == "project-graph://current-state" {
                // Attempt to get the latest state from the broadcast channel
                let mut rx = tx.lock().unwrap().subscribe();
                match rx.recv().await {
                    Ok(state_json) => {
                        let content = ResourceContent {
                            uri: uri.to_string(),
                            mime_type: "application/json".to_string(),
                            text: state_json,
                        };
                        let response = McpResponse {
                            result: Some(ReadResourceResult { contents: vec![content] }),
                            error: None,
                        };
                        Ok(warp::reply::json(&response))
                    }
                    Err(e) => {
                        eprintln!("Failed to receive state from broadcast channel: {}", e);
                        let response: McpResponse<()> = McpResponse {
                            result: None,
                            error: Some(McpError {
                                code: -1, // Custom error code
                                message: format!("Failed to get current state: {}", e),
                            }),
                        };
                        Ok(warp::reply::with_status(warp::reply::json(&response), StatusCode::INTERNAL_SERVER_ERROR))
                    }
                }
            } else {
                let response: McpResponse<()> = McpResponse {
                    result: None,
                    error: Some(McpError {
                        code: -1, // Custom error code
                        message: format!("Unknown resource URI: {}", uri),
                    }),
                };
                Ok(warp::reply::with_status(warp::reply::json(&response), StatusCode::NOT_FOUND))
            }
        }
        "ListTools" => {
            #[derive(Debug, Serialize)]
            struct Tool {
                name: String,
                description: String,
                #[serde(rename = "inputSchema")]
                input_schema: serde_json::Value,
            }

            #[derive(Debug, Serialize)]
            struct ListToolsResult {
                tools: Vec<Tool>,
            }

            let tools = vec![
                Tool {
                    name: "edit_node".to_string(),
                    description: "Edit properties of a project graph node by UUID".to_string(),
                    input_schema: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "uuid": {
                                "type": "string",
                                "description": "The UUID of the node to edit."
                            },
                            "updates": {
                                "type": "object",
                                "description": "An object containing the properties to update (e.g., {\"text\": \"new text\", \"location\": [10, 20]})."
                            }
                        },
                        "required": ["uuid", "updates"]
                    }),
                },
            ];
            let response = McpResponse {
                result: Some(ListToolsResult { tools }),
                error: None,
            };
            Ok(warp::reply::json(&response))
        }
        "CallTool" => {
            #[derive(Debug, Serialize)]
            struct CallToolResult {
                #[serde(skip_serializing_if = "Option::is_none")]
                content: Option<Vec<ToolContent>>,
                #[serde(rename = "isError", skip_serializing_if = "Option::is_none")]
                is_error: Option<bool>,
            }

            #[derive(Debug, Serialize)]
            struct ToolContent {
                #[serde(rename = "type")]
                content_type: String,
                text: String,
            }

            let tool_name = request.params["name"].as_str().unwrap_or_default();
            if tool_name == "edit_node" {
                let uuid = request.params["arguments"]["uuid"].as_str().unwrap_or_default().to_string();
                let updates = request.params["arguments"]["updates"].clone();

                // Call the Tauri command to handle the node update in the frontend
                match handle_mcp_edit_node(app, uuid.clone(), updates).await {
                    Ok(_) => {
                        let response = McpResponse {
                            result: Some(CallToolResult {
                                content: Some(vec![ToolContent {
                                    content_type: "text".to_string(),
                                    text: format!("Successfully called handle_mcp_edit_node for UUID: {}", uuid),
                                }]),
                                is_error: Some(false),
                            }),
                            error: None,
                        };
                        Ok(warp::reply::json(&response))
                    }
                    Err(e) => {
                        eprintln!("Failed to call handle_mcp_edit_node: {}", e);
                        let response: McpResponse<()> = McpResponse {
                            result: None,
                            error: Some(McpError {
                                code: -1, // Custom error code
                                message: format!("Failed to call handle_mcp_edit_node: {}", e),
                            }),
                        };
                        Ok(warp::reply::with_status(warp::reply::json(&response), StatusCode::INTERNAL_SERVER_ERROR))
                    }
                }

            } else {
                let response: McpResponse<()> = McpResponse {
                    result: None,
                    error: Some(McpError {
                        code: -1, // Custom error code
                        message: format!("Unknown tool: {}", tool_name),
                    }),
                };
                Ok(warp::reply::with_status(warp::reply::json(&response), StatusCode::NOT_FOUND))
            }
        }
        _ => {
            let response: McpResponse<()> = McpResponse {
                result: None,
                error: Some(McpError {
                    code: -1, // Custom error code
                    message: format!("Unknown MCP method: {}", request.method),
                }),
            };
            Ok(warp::reply::with_status(warp::reply::json(&response), StatusCode::BAD_REQUEST))
        }
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 在 Linux 上禁用 DMA-BUF 渲染器
    // 否则无法在 Linux 上运行
    // 相同的bug: https://github.com/tauri-apps/tauri/issues/10702
    // 解决方案来源: https://github.com/clash-verge-rev/clash-verge-rev/blob/ae5b2cfb79423c7e76a281725209b812774367fa/src-tauri/src/lib.rs#L27-L28
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    let (tx, _rx) = broadcast::channel::<String>(16);
    let tx = Arc::new(Mutex::new(tx));

    let tx_clone_sse = Arc::clone(&tx);
    let sse_route = warp::path("events")
        .and(warp::get())
        .map(move || {
            let rx = tx_clone_sse.lock().unwrap().subscribe();
            let stream = BroadcastStream::new(rx).map(|event| {
                let result: Result<Event, warp::Error> = match event {
                    Ok(data) => Ok(Event::default().data(data)),
                    Err(e) => {
                        eprintln!("SSE stream error: {}", e);
                        Err(warp::Error::custom(e))
                    }
                };
                result
            });
            warp::sse::reply(stream)
        });

    let tx_clone_mcp = Arc::clone(&tx);
    let mcp_route = warp::path("mcp")
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::any().map(move || Arc::clone(&tx_clone_mcp)))
        .and(tauri::extract::app_handle()) // Extract AppHandle
        .and_then(handle_mcp_request);


    let routes = sse_route
        .or(mcp_route)
        .with(warp::cors().allow_any_origin());

    let server_handle = tokio::spawn(async move {
        let addr: SocketAddr = ([127, 0, 0, 1], 3000).into();
        eprintln!("SSE/MCP server listening on {}", addr);
        warp::serve(routes).run(addr).await;
    });


    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_cli::init())?;
                app.handle().plugin(tauri_plugin_process::init())?;
                app.handle()
                    .plugin(tauri_plugin_updater::Builder::new().build())?;
            }

            // Pass the sender to the Tauri state
            app.manage(tx);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            exists,
            read_file_base64,
            create_folder,
            write_file_base64,
            write_stdout,
            write_stderr,
            exit,
            #[cfg(desktop)]
            set_update_channel,
            update_project_graph_state, // Register the new command
            handle_mcp_edit_node // Register the new command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Wait for the server to finish (though in a typical Tauri app, this might not be reached)
    let _ = server_handle.join();
}
