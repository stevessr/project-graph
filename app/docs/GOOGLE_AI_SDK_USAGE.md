# Google Gemini JS SDK 使用指南

本文档提供了 Google Gemini JS SDK 的详细使用说明，帮助开发者快速将其集成到自己的 JavaScript/TypeScript 项目中。

## 1. 概述

Google Gemini JS SDK (`@google/generative-ai`) 提供了一系列便捷的 API，用于与 Google 的大型语言模型（如 Gemini Pro）进行交互。主要功能包括：

- 生成文本内容
- 进行多轮对话（聊天）
- 创建文本嵌入 (Embeddings)
- 支持流式响应

## 2. 安装

通过 npm 或 yarn 安装 SDK：

```bash
npm install @google/generative-ai
```

或者

```bash
yarn add @google/generative-ai
```

## 3. 初始化

首先，你需要从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取你的 API 密钥。

然后，使用 API 密钥初始化 `GoogleGenerativeAI` 实例。

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

// 从环境变量或安全存储中获取 API 密钥
const API_KEY = "YOUR_API_KEY";

const genAI = new GoogleGenerativeAI(API_KEY);
```

## 4. 核心用法

### 4.1 生成文本 (Generate Content)

对于一次性的文本生成请求，可以使用 `getGenerativeModel` 获取模型实例，然后调用 `generateContent` 方法。

```javascript
async function run() {
  // 选择模型
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = "请写一首关于宇宙的短诗。";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  console.log(text);
}

run();
```

#### 流式生成

如果需要处理较长的响应，或者希望更快地向用户展示结果，可以使用流式生成。

```javascript
async function streamRun() {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = "请讲述一个关于人工智能的简短故事。";

  const result = await model.generateContentStream(prompt);

  let text = "";
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    console.log(chunkText);
    text += chunkText;
  }

  console.log("--- 最终结果 ---");
  console.log(text);
}

streamRun();
```

### 4.2 多轮对话 (Chat)

对于需要上下文的多轮对话，可以使用 `startChat` 方法。

```javascript
async function chatRun() {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: "你好，我有一些关于编程的问题。",
      },
      {
        role: "model",
        parts: "你好！很乐意帮助你。请问你想问什么？",
      },
    ],
    generationConfig: {
      maxOutputTokens: 100,
    },
  });

  const msg = "JavaScript 中的 `Promise.all` 是做什么用的？";
  console.log(`用户: ${msg}`);

  const result = await chat.sendMessage(msg);
  const response = await result.response;
  const text = response.text();

  console.log(`模型: ${text}`);
}

chatRun();
```

### 4.3 文本嵌入 (Embedding)

文本嵌入用于将文本转换为高维向量，可用于语义搜索、聚类等任务。

```javascript
async function embeddingRun() {
  // 注意：嵌入使用的模型是 embedding-001
  const model = genAI.getGenerativeModel({ model: "embedding-001" });

  const text = "你好，世界！";

  const result = await model.embedContent(text);
  const embedding = result.embedding;

  console.log(embedding.values);
  console.log(`向量维度: ${embedding.values.length}`);
}

embeddingRun();
```

## 5. 内置工具 (Built-in Tools)

Gemini 模型可以使用内置工具来执行代码或进行网络搜索，从而回答更复杂的问题。这使得模型能够访问实时信息并执行计算。

目前支持的两个主要内置工具是：

- `codeInterpreter`: 允许模型执行 Python 代码来解决计算问题、分析数据等。
- `googleSearch`: 让模型能够通过 Google 搜索获取和处理来自网络的信息。

要启用这些工具，你需要在调用 `getGenerativeModel` 时，通过 `tools` 参数进行配置。

### 代码示例

下面的示例展示了如何启用 `codeInterpreter` 和 `googleSearch`，并提出一个需要结合使用这两个工具的问题。

```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";

async function runWithTools() {
  const genAI = new GoogleGenerativeAI("YOUR_API_KEY");

  // 启用代码解释器和 Google 搜索工具
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    tools: [
      {
        googleSearch: {}, // 启用 Google 搜索
      },
      {
        codeInterpreter: {}, // 启用代码解释器
      },
    ],
  });

  const prompt = "Google 搜索去年的S&P 500指数回报率，并用代码计算其月平均值。";
  console.log(`用户: ${prompt}`);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  console.log(`模型: ${text}`);

  // 模型可能会返回工具调用请求，SDK 会自动处理并返回最终结果。
  // 你也可以检查 result.response.functionCalls 来查看具体的工具调用过程。
}

runWithTools();
```

在这个示例中：

1.  我们通过 `tools` 数组配置了 `googleSearch` 和 `codeInterpreter`。我们传递空对象 `{}` 来启用默认配置。
2.  我们提出的问题需要模型首先搜索数据（S&P 500 回报率），然后执行代码来计算平均值。
3.  Gemini SDK 会自动处理工具调用流程。它会先识别需要使用的工具，执行它们（例如，进行搜索或运行代码），并将工具的输出反馈给模型，最终生成一个综合的答案。

## 6. 错误处理

在使用 SDK 时，建议使用 `try...catch` 块来捕获可能发生的 API 错误或网络问题。

```javascript
async function safeRun() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = "一个有效的提示";
    const result = await model.generateContent(prompt);
    // ...处理结果
  } catch (error) {
    console.error("请求失败:", error);
  }
}
```

## 7. 总结

Google Gemini JS SDK 提供了一个强大而简洁的接口，可以轻松地将生成式 AI 功能集成到你的应用中。通过本文档的指引，你应该能够顺利地开始你的项目。更多高级用法和配置，请参考官方文档。
