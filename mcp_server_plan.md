# MCP 服务器创建计划：Project Graph CLI 调用器

## 1. 目标

创建一个本地 (Stdio) MCP 服务器，提供一个工具 (`pg_invoke_cli`) 来调用 `project-graph` Tauri 应用的命令行接口。

## 2. 服务器位置

`D:\ssh\learn\project-graph\project-graph-cli-mcp-server` (将在此目录下创建 Node.js 项目)

## 3. 实现技术

Node.js + TypeScript

## 4. MCP 工具定义 (`pg_invoke_cli`)

- **描述:** 调用 Project Graph 应用的命令行接口来处理思维导图文件。
- **输入参数 (JSON Schema):**
  ```json
  {
    "type": "object",
    "properties": {
      "app_executable_path": {
        "type": "string",
        "description": "Project Graph 应用可执行文件的完整路径 (例如 'C:/Program Files/Project Graph/project-graph.exe')"
      },
      "input_path": {
        "type": "string",
        "description": "要处理的输入思维导图文件的路径 (例如 'docs-pg/my_map.json')"
      },
      "output_path": {
        "type": "string",
        "description": "(可选) 输出文件的路径"
      }
    },
    "required": ["app_executable_path", "input_path"]
  }
  ```
- **操作:** MCP 服务器将执行指定路径 (`app_executable_path`) 的 Tauri 应用，并将 `input_path` 作为第一个参数传递。如果提供了 `output_path`，则会附加 `-o output_path` 参数。
- **输出:** 返回一个包含命令行标准输出和标准错误的对象: `{ "stdout": "string", "stderr": "string" }`。如果执行失败，则返回错误。
- **重要提示:** 每次调用此工具时，都需要提供 Project Graph 应用可执行文件的正确路径。

## 5. 配置步骤

1.  使用 `@modelcontextprotocol/create-server` 初始化 Node.js 项目。
2.  编写实现 `pg_invoke_cli` 工具逻辑的 TypeScript 代码 (使用 `child_process` 模块执行外部命令)。
3.  编译服务器代码 (`npm run build`)。
4.  读取 MCP 配置文件 (`c:\Users\29847\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json`)。
5.  将新服务器 (`project-graph-cli`) 的配置添加到 `mcpServers` 对象中，确保包含 `command` (指向编译后的 `index.js`)、`disabled: false` 和 `alwaysAllow: []`。
6.  写入更新后的配置文件。

## 6. 验证

配置完成后，系统将加载新服务器，`pg_invoke_cli` 工具即可通过 `use_mcp_tool` 使用。

## 7. 架构示意图 (Mermaid)

```mermaid
graph LR
    subgraph MCP System
        A[Roo Agent] -- use_mcp_tool(pg_invoke_cli) --> B(MCP Client)
    end
    subgraph project-graph-cli-mcp-server (Node.js)
        B -- Stdio --> C{MCP Server Logic (index.ts)}
        C -- Executes --> D["Project Graph App Executable (provided path)"]
        D -- Args --> E{CLI Args (input_path, -o output_path)}
        D -- Processes --> F[(Mind Map File (input_path))]
        C -- Returns --> B(stdout/stderr)
    end
```
