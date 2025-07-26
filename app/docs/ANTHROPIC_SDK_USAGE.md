# Anthropic JS SDK 使用指南

本文档提供了 Anthropic JS SDK 的详细使用说明，旨在帮助开发者快速集成和使用 Anthropic 的 AI 模型。

## 1. 安装和初始化

### 安装

要开始使用，请通过 npm 或 yarn 安装 SDK：

```bash
npm install @anthropic-ai/sdk
```

或者

```bash
yarn add @anthropic-ai/sdk
```

### 初始化

安装后，您可以在项目中导入并初始化客户端。默认情况下，SDK 会从环境变量 `ANTHROPIC_API_KEY` 中读取 API 密钥。

```javascript
import Anthropic from "@anthropic-ai/sdk";

// 从环境变量 ANTHROPIC_API_KEY 中获取 API 密钥
const client = new Anthropic();
```

您也可以在初始化时手动传入 API 密钥：

```javascript
const client = new Anthropic({
  apiKey: "YOUR_API_KEY",
});
```

## 2. 基本用法

要发送一个简单的消息请求，请使用 `client.messages.create` 方法。

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  try {
    const result = await client.messages.create({
      messages: [
        {
          role: "user",
          content: "你好，Claude！",
        },
      ],
      model: "claude-3-opus-20240229", // 替换为您想使用的模型
      max_tokens: 1024,
    });
    console.dir(result);
  } catch (error) {
    console.error("请求失败:", error);
  }
}

main();
```

## 3. 流式响应

SDK 支持通过流式传输来处理响应，这对于需要实时反馈的应用非常有用。

使用 `client.messages.stream` 方法可以创建一个流，并通过事件监听器处理数据块。

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const stream = client.messages.stream({
    messages: [
      {
        role: "user",
        content: "请用 Rust 语言写一个递归列出目录下所有文件的函数。",
      },
    ],
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
  });

  // 'contentBlock' 事件在内容块完全传输后触发
  stream.on("contentBlock", (content) => {
    console.log("收到的内容块:", content);
  });

  // 'message' 事件在消息完全传输后触发
  stream.on("message", (message) => {
    console.log("完整的消息:", message);
  });

  // 您还可以异步迭代事件流
  for await (const event of stream) {
    // console.log('收到的事件:', event);
  }

  // 获取最终的完整消息
  const finalMessage = await stream.finalMessage();
  console.log("最终消息:", finalMessage);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

## 4. 工具使用 (Tool Use)

SDK 允许您定义和使用外部工具（函数），以便模型能够与外部系统交互。

以下示例展示了如何定义一个 `get_weather` 工具，并让模型使用它。

```javascript
import Anthropic from "@anthropic-ai/sdk";
import assert from "node:assert";

const client = new Anthropic();

async function main() {
  const userMessage = {
    role: "user",
    content: "旧金山现在天气怎么样？",
  };

  const tools = [
    {
      name: "get_weather",
      description: "获取指定地点的天气信息",
      input_schema: {
        type: "object",
        properties: {
          location: { type: "string", description: "城市和州，例如：San Francisco, CA" },
        },
        required: ["location"],
      },
    },
  ];

  // 第一步：发送包含工具定义的消息
  const initialResponse = await client.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [userMessage],
    tools,
  });

  console.log("初次回应:", initialResponse);

  // 检查模型是否决定使用工具
  assert(initialResponse.stop_reason === "tool_use");

  const tool = initialResponse.content.find((content) => content.type === "tool_use");
  assert(tool);

  // 第二步：执行工具并返回结果
  const toolResult = {
    type: "tool_result",
    tool_use_id: tool.id,
    content: "天气晴朗，温度是 73 华氏度。", // 这里是模拟的工具执行结果
  };

  const finalResponse = await client.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1024,
    messages: [
      userMessage,
      { role: initialResponse.role, content: initialResponse.content },
      {
        role: "user",
        content: [toolResult],
      },
    ],
    tools,
  });

  console.log("\n最终回应:");
  console.dir(finalResponse, { depth: 4 });
}

main();
```

## 5. 错误处理

SDK 会在 API 请求失败时抛出错误。建议使用 `try...catch` 块来捕获和处理这些错误。

常见的错误类型包括：

- `AuthenticationError`: API 密钥无效。
- `PermissionDeniedError`: API 密钥无权访问所请求的资源。
- `NotFoundError`: 请求的资源不存在。
- `RateLimitError`: 超出速率限制。
- `APIError`: 其他通用的 API 错误。

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: "INVALID_KEY" }); // 使用无效密钥以触发错误

async function main() {
  try {
    await client.messages.create({
      messages: [{ role: "user", content: "你好" }],
      model: "claude-3-opus-20240229",
      max_tokens: 10,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("API 错误:", error.name);
      console.error("状态码:", error.status);
      console.error("错误详情:", error.message);
    } else {
      console.error("未知错误:", error);
    }
  }
}

main();
```
