# 后端开发者指南 (Tauri)

本文档旨在为开发者提供关于 `Project Graph` 应用后端（基于 [Tauri](https://tauri.app/) 和 Rust）的详细指南。它解释了后端的结构、核心概念以及如何与前端进行交互。

## 1. `src-tauri` 目录概览

[`src-tauri`](../src-tauri/:0) 目录是整个 Tauri 应用的 Rust 后端部分。它负责处理原生操作系统交互、文件系统访问、重量级计算以及所有无法在浏览器环境中高效完成的任务。

以下是该目录下的关键文件和子目录：

- **[`Cargo.toml`](../src-tauri/Cargo.toml:0)**: 这是 Rust 项目的清单文件。它定义了项目的元数据（如名称、版本）和所有 Rust 依赖项（称为 "crates"）。所有后端插件和库都在此文件中声明，例如 `tauri` 核心库、`serde` 用于序列化，以及各种 `tauri-plugin-*`。

- **[`tauri.conf.json`](../src-tauri/tauri.conf.json:0)**: Tauri 应用的核心配置文件。它用于配置窗口属性（尺寸、标题、透明度）、构建设置、捆绑参数（如应用图标和文件关联）、以及启用哪些 Tauri 插件及其特定选项。

- **[`src/`](../src-tauri/src:0)**: 存放所有后端 Rust 源代码的目录。
  - **[`main.rs`](../src-tauri/src/main.rs:0)**: Rust 二进制程序的入口点。在本项目中，它的职责非常简单，仅调用 [`project_graph_lib::run()`](../src-tauri/src/lib.rs:21)，将应用的启动和配置委托给库代码。
  - **[`lib.rs`](../src-tauri/src/lib.rs:0)**: 应用后端的核心逻辑所在地。它构建并配置 Tauri 应用实例，包括初始化插件、设置窗口，以及最重要的——注册可以从前端调用的命令。
  - **[`cmd/`](../src-tauri/src/cmd/:0)**: 用于存放所有 Tauri 命令的模块化目录。将不同的命令逻辑分离到不同的文件中（例如 [`device.rs`](../src-tauri/src/cmd/device.rs:0)）有助于保持代码的整洁和可维护性。

- **[`build.rs`](../src-tauri/build.rs:0)**: 一个可选的构建脚本，在编译 Rust 代码之前运行。在本项目中，它调用 `tauri_build::build()`，这是 Tauri 应用准备构建过程的标准做法，无需额外自定义逻辑。

## 2. 命令 (Commands)

命令是 Tauri 架构的核心，它允许前端的 JavaScript 代码安全地调用后端的 Rust 函数。这使得我们可以将复杂的逻辑、系统 API 调用或密集型计算放在后端执行，同时保持前端的轻量和响应迅速。

### 定义一个命令

要将一个 Rust 函数暴露给前端，只需在其上方添加 `#[tauri::command]` 宏。这些函数可以接受参数并返回值，Tauri 会自动处理 Rust 和 JavaScript 之间的数据序列化和反序列化（使用 JSON）。

下面是 [`src-tauri/src/cmd/device.rs`](../src-tauri/src/cmd/device.rs:0) 中 `get_device_id` 命令的简化示例：

```rust
// src-tauri/src/cmd/device.rs

use std::io::Read;

#[tauri::command]
pub fn get_device_id() -> Result<String, String> {
    let os_name = std::env::consts::OS;
    match os_name {
        "windows" => {
            // 实际实现使用 `wmic` 命令获取 UUID
            Ok("a-windows-uuid".to_string())
        }
        "macos" => {
            // 实际实现使用 `system_profiler` 获取序列号
            Ok("a-macos-serial".to_string())
        }
        "linux" => {
            // 实际实现读取 `/etc/machine-id` 文件
            Ok("a-linux-machine-id".to_string())
        }
        _ => Err("Unsupported platform".to_string()),
    }
}
```

> **注意**: 该函数返回一个 `Result<String, String>`，这是一种健壮的错误处理方式。成功时，前端会收到一个包含 `String` 值的 fulfilled Promise；失败时，Promise 会被拒绝并附带错误信息。

### 注册命令

定义好的命令必须在 Tauri 应用构建时进行注册，这样前端才能调用它们。注册是在 [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs:0) 中通过 `.invoke_handler()` 完成的。

`tauri::generate_handler!` 宏会自动收集所有列出的命令函数，并将它们捆绑到一个调用处理器中。

```rust
// src-tauri/src/lib.rs

mod cmd;

// 此处包含其他 use 语句和命令定义

pub fn run() {
    tauri::Builder::default()
        // 此处初始化 tauri-plugin-fs 和 tauri-plugin-store 等插件
        .invoke_handler(tauri::generate_handler![
            cmd::device::get_device_id, // 从 cmd 模块导入
            write_stdout,
            write_stderr,
            exit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 从前端调用命令

在前端，你可以使用 `@tauri-apps/api/core` 中的 `invoke` 函数来调用后端命令。

```javascript
import { invoke } from "@tauri-apps/api/core";

async function fetchDeviceId() {
  try {
    const deviceId = await invoke("get_device_id");
    console.log("Device ID:", deviceId);
  } catch (error) {
    console.error("Failed to get device ID:", error);
  }
}

fetchDeviceId();
```

## 3. 与前端通信

除了命令（前端调用后端），Tauri 还支持后端向前端主动发送消息。

### 事件 (Events)

事件是实现从后端到前端通信的主要方式。后端可以向全局或特定窗口发出带有负载（payload）的事件，而前端可以通过 JavaScript 监听这些事件。

这对于通知前端后台任务的进度、数据的实时更新或发生异步事件等场景非常有用。

**后端触发事件示例:**

```rust
use tauri::Manager;

fn some_rust_function(app_handle: tauri::AppHandle) {
  app_handle.emit("backend-event", "Hello from Rust!").unwrap();
}
```

**前端监听事件示例:**

```javascript
import { listen } from "@tauri-apps/api/event";

const unlisten = await listen("backend-event", (event) => {
  console.log(`Received event:`, event.payload);
});

// 调用 unlisten() 可以停止监听
```

## 4. 构建和依赖

- **依赖管理**: [`Cargo.toml`](../src-tauri/Cargo.toml:0) 是管理所有 Rust 依赖的唯一地方。当你需要添加新的功能（例如一个新的 Tauri 插件或一个用于计算的库），你需要在这里的 `[dependencies]` 部分添加对应的 crate。

- **构建过程**: [`build.rs`](../src-tauri/build.rs:0) 脚本在 `cargo build` 期间运行。对于 Tauri 应用，它主要通过 `tauri_build::build()` 来处理特定于平台的配置和资源准备，确保应用能够正确捆绑。除非有非常特殊的构建需求，否则通常不需要修改此文件。
