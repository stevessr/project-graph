# Tauri 构建错误修复计划

## 问题描述

根据提供的构建错误日志，项目在构建过程中遇到了多个错误，主要集中在 `app/src-tauri/src/lib.rs` 文件中对 `tauri-plugin-http` 和 `tauri-plugin-store` 插件的使用。

主要错误包括：

- `tauri-plugin-store` 的 `StoreBuilder::new` 参数错误和 `build()` 返回的 `Result` 未正确处理，导致无法调用 `load`, `insert`, `save` 等方法。
- `tauri-plugin-http` 的 `Http` struct 是私有的，无法直接通过 `get_plugin` 获取，需要使用相应的扩展 trait。
- 存在未使用的导入 `tauri::State` 和 `tauri::Manager`。

## 详细计划

1.  **修改 `app/src-tauri/src/lib.rs` 文件。**
2.  **移除未使用的导入:** 删除第 121 行的 `use tauri::State;`。
3.  **导入 HTTP 扩展 trait:** 在文件顶部（例如在其他 `use` 语句之后）添加 `use tauri_plugin_http::HttpExt;`。
4.  **修正 `save_ai_settings` 函数中的 `tauri-plugin-store` 用法:**
    - 将第 144 行 `let mut store = StoreBuilder::new(".ai_settings.dat").build(app.clone());` 修改为正确构建 Store 并处理 Result 的代码。例如：
      ```rust
      let mut store = StoreBuilder::new(app.clone(), ".ai_settings.dat").build().map_err(|e| e.to_string())?;
      ```
    - 调整后续的 `store.load()`、`store.insert()` 和 `store.save()` 调用，确保它们是在获取到 `Store` 实例后调用的。
5.  **修正 `load_ai_settings` 函数中的 `tauri-plugin-store` 用法:**
    - 将第 153 行 `let mut store = StoreBuilder::new(".ai_settings.dat").build(app.clone());` 修改为正确构建 Store 并处理 Result 的代码。例如：
      ```rust
      let mut store = StoreBuilder::new(app.clone(), ".ai_settings.dat").build().map_err(|e| e.to_string())?;
      ```
    - 调整后续的 `store.load()` 和 `store.get()` 调用，确保它们是在获取到 `Store` 实例后调用的。
6.  **修正 `fetch_ai_models` 函数中的 `tauri-plugin-http` 用法:**
    - 将第 163 行 `let client = app.get_plugin::<tauri_plugin_http::Http<R>>().map_err(|e| e.to_string())?.client();` 修改为使用 `http()` 扩展方法获取客户端：`let client = app.http().map_err(|e| e.to_string())?.client();`。
7.  **代码审查:** 在应用修改后，仔细检查代码，确保所有错误都已解决，并且代码逻辑正确。

## 计划图示

```mermaid
graph TD
    A[收到构建错误日志和代码] --> B{分析错误和代码};
    B --> C[识别 Store 插件错误];
    B --> D[识别 Http 插件错误];
    B --> E[识别未使用导入];
    C --> F[StoreBuilder::new 参数错误];
    C --> G[build() 返回 Result 未处理];
    D --> H[尝试获取私有 struct Http];
    D --> I[需要导入 HttpExt trait];
    F & G --> J[修正 Store 初始化和方法调用];
    H & I --> K[修正 Http 客户端获取];
    E --> L[移除未使用导入];
    J & K & L --> M[生成修复计划];
    M --> N[向用户展示计划];
    N --> O{用户确认计划?};
    O -- 是 --> P[询问是否写入 Markdown];
    P -- 是/否 --> Q[切换到 Code 模式执行];
    O -- 否 --> M;
```
