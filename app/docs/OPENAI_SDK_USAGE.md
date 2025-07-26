# OpenAI Node.js SDK 用法总结

本文档旨在提供 OpenAI Node.js SDK 的核心用法摘要，帮助开发者快速上手。

## 1. 安装

通过 npm, yarn, 或 pnpm 安装 SDK:

```bash
npm install openai
# or
yarn add openai
# or
pnpm add openai
```

## 2. 初始化

使用你的 API 密钥初始化客户端。建议通过环境变量管理密钥，而不是硬编码在代码中。

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 默认为 process.env.OPENAI_API_KEY
});
```

## 3. 核心功能示例

### 3.1 创建聊天补全 (Chat Completion)

这是与 GPT-3.5 或 GPT-4 等模型交互最常见的方式。

```javascript
async function main() {
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "你好，请用中文简单介绍一下自己。" }],
    model: "gpt-4o",
  });

  console.log(chatCompletion.choices[0].message.content);
}

main();
```

### 3.2 使用流式响应 (Streaming)

对于需要实时返回结果的场景，流式响应非常有用。

```javascript
async function streamExample() {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "写一首关于编程的短诗" }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

streamExample();
```

### 3.3 创建图像 (Image Generation)

使用 DALL·E 模型生成图像。

```javascript
async function imageGeneration() {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: "一只可爱的柯基犬在写代码，数字艺术风格",
    n: 1,
    size: "1024x1024",
  });

  console.log("图片URL:", response.data[0].url);
}

imageGeneration();
```

## 4. 错误处理

SDK 会在 API 请求失败时抛出特定类型的错误。建议使用 `try...catch` 块来处理这些异常。

```javascript
import { OpenAI } from "openai";

const openai = new OpenAI();

async function handleErrors() {
  try {
    await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Say this is a test" }],
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error("API Error:", error.status, error.name, error.headers);
    } else {
      console.error("Non-API Error:", error);
    }
  }
}

handleErrors();
```

通过捕获 `OpenAI.APIError`，你可以更精确地处理认证失败、速率限制、无效请求等问题。

### API 响应结构 (Response Structure)

理解 Chat Completion API 的响应结构对于有效解析和使用模型返回的数据至关重要。

以下是一个典型的响应对象及其关键字段的解释：

- `id`: `string` - 本次请求的唯一标识符，可用于日志记录和追踪。
- `object`: `string` - 对象类型，对于聊天补全，其值通常是 `chat.completion`。
- `created`: `number` - 请求创建时的 Unix 时间戳（秒）。
- `model`: `string` - 本次请求所使用的模型，例如 `gpt-4o`。
- `choices`: `array` - 一个包含补全结果的数组。通常情况下，除非在请求中指定 `n > 1`，否则该数组只包含一个元素。
  - `choices[0].message`: 包含了模型生成的消息对象。
    - `role`: 角色，通常为 `assistant`。
    - `content`: 模型生成的核心回复内容。
  - `choices[0].finish_reason`: `string` - 补全结束的原因，例如 `stop`（正常结束）或 `length`（达到最大长度）。
- `usage`: `object` - 一个包含本次请求 token 使用情况的对象。
  - `prompt_tokens`: `number` - 输入提示中的 token 数量。
  - `completion_tokens`: `number` - 模型生成的回复中的 token 数量。
  - `total_tokens`: `number` - `prompt_tokens` 和 `completion_tokens` 的总和。

#### JSON 响应示例

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4o-2024-05-13",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是一个由 OpenAI 训练的大型语言模型。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}
```
