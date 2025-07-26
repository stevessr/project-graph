# 模型上下文协议 (MCP) 服务器开发指南

本文档为开发者提供了一份关于如何从零开始设置、实现和部署**模型上下文协议 (MCP) 服务器**的综合指南。我们将遵循模块化的方法，涵盖从环境准备到最终部署的整个过程。

---

## 概述

模型上下文协议 (MCP) 是一套标准，旨在让语言模型（如 Claude）能够与外部工具和服务进行安全、可靠的交互。通过实现一个 MCP 服务器，您可以将自定义功能（例如，查询数据库、调用内部 API 或与硬件交互）暴露给模型，从而极大地扩展其能力。

本指南将分为四个核心模块：

1.  **环境准备与项目设置**: 初始化您的开发环境和项目骨架。
2.  **MCP 服务器核心**: 构建服务器的核心逻辑和生命周期管理。
3.  **工具定义与实现**: 创建并注册具体的工具供模型使用。
4.  **部署与配置**: 使您的服务器可被客户端（如 Claude 桌面应用）发现和调用。

---

## 模块 1：环境准备与项目设置

本模块将指导您完成初始化 MCP 服务器项目所需的第一步。一个良好的开端是成功的一半。

### `Setup.initializeProject`

此函数用于创建一个全新的 MCP 服务器项目，并根据您选择的语言配置好必要的依赖和文件结构。

#### 伪代码参考

```pseudocode
function Setup.initializeProject(projectName, language):
  // 1. 创建项目目录
  CREATE_DIRECTORY(f"./{projectName}")
  CHANGE_DIRECTORY(f"./{projectName}")

  // 2. 根据语言初始化
  SWITCH language:
    CASE "python":
      RUN_COMMAND("uv init")
      RUN_COMMAND("uv venv")
      RUN_COMMAND("uv add 'mcp[cli]' httpx")
      CREATE_FILE(f"{projectName}.py")
    CASE "typescript":
      RUN_COMMAND("npm init -y")
      RUN_COMMAND("npm install @modelcontextprotocol/sdk zod")
      RUN_COMMAND("npm install -D @types/node typescript")
      CREATE_DIRECTORY("src")
      CREATE_FILE("src/index.ts")
    // ...

  // 3. 初始化 Git 仓库
  RUN_COMMAND("git init")
  CREATE_FILE(".gitignore")
end function
```

### 实现步骤

#### 1. 创建项目目录

首先，为您的项目选择一个名称（例如 `weather-server`）并创建一个目录。

```bash
mkdir weather-server
cd weather-server
```

#### 2. 根据语言初始化项目

##### Python 示例

对于 Python 项目，我们推荐使用 `uv` 作为包和虚拟环境管理器。

```bash
# 初始化项目并创建虚拟环境
uv init
uv venv

# 激活虚拟环境 (Windows)
.venv\Scripts\activate

# 激活虚拟环境 (macOS/Linux)
source .venv/bin/activate

# 安装 MCP Python SDK 和 httpx 用于 API 请求
uv add "mcp[cli]" httpx

# 创建主应用文件
touch weather_server.py
```

##### TypeScript 示例

对于 TypeScript 项目，我们使用 `npm` 进行初始化。

```bash
# 初始化 Node.js 项目
npm init -y

# 安装 MCP TypeScript SDK 和 Zod 用于模式验证
npm install @modelcontextprotocol/sdk zod

# 安装开发依赖
npm install -D @types/node typescript

# 创建源代码目录和主文件
mkdir src
touch src/index.ts

# 建议配置 tsconfig.json 和 package.json 的 "scripts"
```

#### 3. 初始化 Git

最后，初始化 Git 仓库以进行版本控制。

```bash
git init
echo ".venv/\nnode_modules/\n*.pyc" > .gitignore
```

---

## 模块 2：MCP 服务器核心

本模块定义了 MCP 服务器的核心结构和行为。`CoreServer` 类是所有功能的基础。

### `CoreServer` 类

这个类管理服务器的状态，包括注册的工具，并处理来自客户端的请求。

#### 伪代码参考

```pseudocode
class CoreServer(name, transportType):
  // 属性
  name (string)
  transport (enum: "stdio", "http")
  tools (map)

  // 构造函数
  constructor(name, transportType):
    // ...

  // 注册工具
  function registerTool(toolDefinition, executionHandler):
    // ...

  // 启动监听
  function listen():
    // ...

  // 处理工具调用
  function handleToolCall(payload):
    // ...
end class
```

### 实现要点

#### 构造与属性

服务器在初始化时应有一个唯一的名称和指定的通信方式（通常是 `stdio` 用于本地客户端）。

```python
# python 示例 (weather_server.py)
from mcp import CoreServer

# 初始化服务器
# "weather-server" 是我们为客户端配置中使用的名称
server = CoreServer(name="weather-server", transport="stdio")
```

```typescript
// typescript 示例 (src/index.ts)
import { CoreServer } from '@modelcontextprotocol/sdk';

// 初始化服务器
const server = new CoreServer({
  name: 'weather-server',
  transport: 'stdio',
});
```

#### 工具注册 (`registerTool`)

`registerTool` 方法允许您向服务器添加新功能。它需要两部分：工具的定义（元数据）和执行该工具的逻辑（处理函数）。

```python
# python 示例
def my_tool_handler(args):
  # ... tool logic here ...
  return {"result": "success"}

server.register_tool(
  tool_definition={
    "name": "my_tool",
    "description": "A sample tool."
    # input_schema can be added here
  },
  execution_handler=my_tool_handler
)
```

#### 监听循环 (`listen`)

`listen()` 方法是服务器的入口点。一旦调用，它将开始监听并响应来自客户端的请求，例如 `initialize`（客户端请求服务器能力）和 `callTool`（客户端请求执行工具）。

```python
# python 示例
if __name__ == "__main__":
  # ... (工具注册代码)
  server.listen()
```

---

## 模块 3：工具定义与实现

工具是 MCP 的核心。本模块将展示如何定义一个工具的模式 (schema) 并实现其功能。

### `createWeatherTool`

我们将以创建一个获取天气预报的工具为例。

#### 伪代码参考

```pseudocode
function ToolImplementation.createWeatherTool(server):
  // 1. 定义输入模式
  forecastSchema = { ... }

  // 2. 定义工具
  forecastTool = { name, description, inputSchema }

  // 3. 实现执行逻辑
  function executeForecast(args):
    // 调用外部 API
    // 格式化并返回结果

  // 4. 注册工具
  server.registerTool(forecastTool, executeForecast)
end function
```

### 实现步骤

#### 1. 定义输入模式和工具

模式清晰地定义了工具需要哪些输入。我们将使用 `zod`（在 TypeScript 中）或 Python 的字典来定义。

```python
# python 示例 (weather_server.py)
import httpx

# 1 & 2. 定义工具和模式
forecast_tool_def = {
  "name": "get_forecast",
  "description": "根据经纬度获取天气预报。",
  "input_schema": {
    "type": "object",
    "properties": {
      "latitude": {"type": "number", "description": "地理纬度"},
      "longitude": {"type": "number", "description": "地理经度"}
    },
    "required": ["latitude", "longitude"]
  }
}

# 3. 实现执行逻辑
def execute_forecast(args):
  lat = args['latitude']
  lon = args['longitude']
  
  try:
    # 调用外部天气 API
    response = httpx.get(f"https://api.weather.gov/points/{lat},{lon}")
    response.raise_for_status()
    forecast_url = response.json()["properties"]["forecast"]
    
    forecast_response = httpx.get(forecast_url)
    forecast_response.raise_for_status()
    
    first_period = forecast_response.json()["properties"]["periods"][0]
    detailed_forecast = first_period["detailedForecast"]

    # 格式化并返回结果
    return {"content": [{"type": "text", "text": detailed_forecast}]}
  except Exception as e:
    return {"error": f"API request failed: {e}"}

# 4. 注册工具
server.register_tool(
  tool_definition=forecast_tool_def,
  execution_handler=execute_forecast
)
```

---

## 模块 4：部署与配置

一旦服务器和工具实现完毕，最后一步是让客户端应用（如 Claude 桌面版）知道如何启动它。

### `Deployment.configureClient`

此过程涉及修改客户端的配置文件，添加一个指向您的 MCP 服务器的新条目。

#### 伪代码参考

```pseudocode
function Deployment.configureClient(clientAppName, serverConfig):
  // 1. 找到客户端配置文件
  // 2. 读取配置
  // 3. 构造服务器启动命令
  // 4. 更新配置并写回
end function
```

### 配置步骤

1.  **定位配置文件**:
    *   **macOS**: `~/Library/Application Support/com.anthropic.claude/mcp_servers.json`
    *   **Windows**: `%APPDATA%\com.anthropic.claude\mcp_servers.json`

2.  **更新 `mcp_servers.json`**:
    您需要向此 JSON 文件添加一个新条目。该条目的键是您在 `CoreServer` 中设置的服务器名称 (`weather-server`)。

    *   `command`: 启动虚拟环境中 Python 解释器的绝对路径。
    *   `args`: 传递给命令的参数列表，通常包括您的主脚本文件的绝对路径。

    **示例 (`mcp_servers.json`)**:

    ```json
    {
      "mcpServers": {
        "weather-server": {
          "command": "/path/to/your/project/weather-server/.venv/bin/python",
          "args": [
            "/path/to/your/project/weather-server/weather_server.py"
          ],
          "transport": "stdio"
        }
        // ... 其他服务器
      }
    }
    ```

    **重要提示**:
    *   **请务必使用绝对路径**，因为客户端应用不会在您的项目目录中运行。
    *   在 Windows 上，`command` 路径应指向 `.venv\Scripts\python.exe`。

完成上述步骤后，重新启动 Claude 桌面应用。它将自动发现并加载您的 `weather-server`，使其在工具使用面板中可用。

---

## 附录 A：客户端实现示例 (JavaScript Fetch)

本附录提供了两个使用 JavaScript `fetch` API 与流式数据源交互的客户端示例。第一个示例演示了如何调用一个典型的大语言模型 (LLM) API，而第二个示例则展示了如何与一个流式 MCP (Model Context Protocol) 服务器进行通信。

### 1. LLM API 调用示例

许多现代 LLM API（如 OpenAI API）支持流式响应，允许客户端在完整响应生成之前逐步接收和处理数据。这对于需要实时反馈的应用程序（如聊天机器人）至关重要。

以下是如何使用 `fetch` 调用流式 LLM API 的示例：

```javascript
// LLM API 的端点
const llmApiUrl = 'https://api.example.com/v1/chat/completions';

// 请求体，通常包含模型名称、消息历史和流式传输标志
const requestBody = {
  model: "gpt-4",
  messages: [{ role: "user", content: "给我讲个关于编程的笑话" }],
  stream: true // 启用流式响应
};

// 发起 fetch 请求
fetch(llmApiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY' // 替换为你的 API 密钥
  },
  body: JSON.stringify(requestBody)
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP 错误！状态: ${response.status}`);
  }
  return response.body; // 获取 ReadableStream
})
.then(stream => {
  const reader = stream.getReader();
  const decoder = new TextDecoder(); // 用于将 Uint8Array 解码为文本

  // 递归函数，用于持续读取流中的数据
  function read() {
    reader.read().then(({ done, value }) => {
      if (done) {
        console.log('数据流结束。');
        return;
      }

      // 将接收到的数据块 (Uint8Array) 解码为字符串
      const chunk = decoder.decode(value, { stream: true });
      
      // LLM 流通常以 "data: " 开头，并以换行符分隔 JSON 对象
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonData = line.substring(6);
          if (jsonData.trim() === '[DONE]') {
            console.log('服务器已发送 [DONE] 信号。');
            continue;
          }
          try {
            const parsed = JSON.parse(jsonData);
            // 提取并处理内容
            const content = parsed.choices[0]?.delta?.content || '';
            process.stdout.write(content); // 在控制台实时打印内容
          } catch (error) {
            console.error('解析 JSON 失败:', error);
          }
        }
      }

      // 继续读取下一块数据
      read();
    }).catch(error => {
      console.error('读取数据流时出错:', error);
    });
  }

  read(); // 开始读取
})
.catch(error => {
  console.error('Fetch 请求失败:', error);
});
```

#### 代码解释

1.  **启用流式传输**: 在请求体中设置 `stream: true` 是告知 LLM API 我们希望接收流式响应的关键。
2.  **获取 `ReadableStream`**: `response.body` 返回一个 `ReadableStream` 对象，它允许我们异步地读取响应数据。
3.  **创建 `Reader`**: `stream.getReader()` 创建一个读取器，用于从流中提取数据块。
4.  **循环读取**: `reader.read()` 返回一个 Promise，该 Promise 解析为一个包含 `done` (布尔值) 和 `value` (`Uint8Array`) 的对象。我们在一个循环中调用它，直到 `done` 为 `true`。
5.  **解码和解析**:
    *   `TextDecoder` 用于将 `Uint8Array` 格式的数据块转换为人类可读的字符串。
    *   LLM API 的流式响应通常遵循 Server-Sent Events (SSE) 格式，其中每个消息都以 `data: ` 为前缀。
    *   我们分割收到的数据块，解析每一行中的 JSON，并提取所需的内容（例如，`delta.content`）。

---

### 2. 流式 MCP 调用示例

与 MCP 服务器的流式交互同样依赖于处理 `ReadableStream`。MCP 流通常包含一系列以换行符分隔的 JSON 对象，每个对象都代表一个特定的事件或数据块。

以下是如何使用 `fetch` 与流式 MCP 服务器通信的示例：

```javascript
// MCP 服务器的流式端点
const mcpServerUrl = 'http://localhost:8080/stream-tool';

// 请求体，定义了要使用的工具和参数
const mcpRequestBody = {
  tool: "text-generator",
  arguments: {
    prompt: "详细介绍模型上下文协议（MCP）。"
  }
};

// 用于存储从流中接收的不完整 JSON 字符串
let buffer = '';

// 发起 fetch 请求
fetch(mcpServerUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify(mcpRequestBody)
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP 错误！状态: ${response.status}`);
  }
  return response.body; // 获取 ReadableStream
})
.then(stream => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  function read() {
    reader.read().then(({ done, value }) => {
      if (done) {
        console.log('\nMCP 数据流结束。');
        // 处理缓冲区中剩余的任何数据
        if (buffer.trim()) {
          try {
            const jsonObject = JSON.parse(buffer);
            console.log('接收到最后一个 MCP 对象:', jsonObject);
          } catch (e) {
            console.error('解析缓冲区中剩余的 JSON 失败:', buffer);
          }
        }
        return;
      }

      // 将数据块解码并附加到缓冲区
      buffer += decoder.decode(value, { stream: true });

      // 按换行符分割，处理完整的 JSON 对象
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const jsonString = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 1);

        if (jsonString) {
          try {
            const jsonObject = JSON.parse(jsonString);
            // 在这里处理解析后的 MCP 对象
            // 例如，根据对象的类型执行不同的操作
            if (jsonObject.type === 'content_block') {
              process.stdout.write(jsonObject.text);
            } else if (jsonObject.type === 'tool_result') {
              console.log('\n工具执行完成:', jsonObject.result);
            }
          } catch (error) {
            console.error('解析 MCP JSON 失败:', jsonString, error);
          }
        }
        boundary = buffer.indexOf('\n');
      }

      // 继续读取
      read();
    }).catch(error => {
      console.error('读取 MCP 数据流时出错:', error);
    });
  }

  read(); // 开始读取
})
.catch(error => {
  console.error('MCP Fetch 请求失败:', error);
});
```

#### 代码解释

1.  **请求格式**: MCP 请求通常是一个包含 `tool` 和 `arguments` 的 JSON 对象。
2.  **缓冲区处理**: 与 LLM API 不同，MCP 的 JSON 对象可能在网络数据包之间被分割。为了正确解析，我们使用一个 `buffer` 来累积传入的数据。
3.  **按边界分割**:
    *   我们将解码后的字符串添加到 `buffer` 中。
    *   然后，我们通过查找换行符 (`\n`) 来确定 JSON 对象的边界。
    *   我们循环处理缓冲区，直到找不到更多的完整对象为止。剩余的部分将保留在缓冲区中，与下一个数据块合并。
4.  **解析和处理**: 一旦提取出一个完整的 JSON 字符串，我们就使用 `JSON.parse()` 将其转换为一个对象，然后根据其内容进行处理。

这两个示例展示了处理流式 API 的通用模式，这对于构建响应迅速、数据驱动的现代 Web 应用程序至关重要。