# 修改 StageGeneratorAI.tsx 以支持通用 OpenAI 服务器计划

**目标:** 修改 `app/src/core/stage/stageManager/concreteMethods/StageGeneratorAI.tsx` 文件，使其能够连接到通用的 OpenAI 兼容服务器，使用标准的 Chat Completions API。

**当前代码分析:**

- `apiUrl`, `apiKey`, `modelName` 从 `Settings` 服务获取。
- 请求方法为 `POST`，包含 `Content-Type` 和 `Authorization` (Bearer token) 头。
- 硬编码的端点: `/ai/extend_word`。
- 请求体格式: `{ word: string, model: string }`。
- 响应期望格式: `{ words: string[], tokens: number }`。

**修改计划:**

1.  **修改 API 端点:**

    - 将 `endpointUrl` 修改为 `${apiUrl}/v1/chat/completions`。
    - 确保 `apiUrl` 不包含尾随斜杠，或在拼接时处理。

2.  **修改请求体 (Request Body):**

    - 将请求体修改为符合 OpenAI Chat Completions API 的格式，使用 `messages` 数组。
    - `body: JSON.stringify({
  model: modelName,
  messages: [
    { role: "system", content: "你是一个创意助手，请根据用户提供的词语，扩展出 5 个相关的词语或短语，每个占一行，不要包含任何额外的解释或编号。" },
    { role: "user", content: selectedTextNode.text }
  ],
  // 可选: 添加 temperature, max_tokens 等参数
})`

3.  **修改响应处理:**

    - 解析 JSON 响应。
    - 提取 `choices[0].message.content`。
    - 按换行符 `\n` 分割提取到的字符串。
    - 去除首尾空格并过滤掉空字符串，得到 `words` 数组。
    - 从 `usage.total_tokens` 获取 token 消耗信息（如果存在）。
    - 更新成功提示信息。
    - 返回 `words` 数组。

4.  **错误处理:**
    - 在 `if (!response.ok)` 块中，尝试解析响应体为 JSON，提取 OpenAI 错误信息（如果存在），提供更具体的错误提示。

**可视化计划 (Mermaid):**

```mermaid
graph TD
    A[开始: 修改 StageGeneratorAI.tsx] --> B(读取 Settings 获取 apiUrl, apiKey, modelName);
    B --> C{构建请求体 (Chat Completions)};
    C --> D[设置 messages: 系统消息 + 用户消息(选中词)];
    D --> E[设置 model: modelName];
    E --> F{构建请求选项};
    F --> G[设置 method: POST];
    G --> H[设置 headers: Content-Type, Authorization];
    H --> I[设置 body: JSON.stringify(请求体)];
    I --> J{构造完整端点 URL};
    J --> K[endpointUrl = apiUrl + '/v1/chat/completions'];
    K --> L[发送 fetch 请求];
    L --> M{处理响应};
    M -- 成功 (2xx) --> N[解析 JSON 响应];
    N --> O[提取 choices[0].message.content];
    O --> P[按换行符 '\\n' 分割内容];
    P --> Q[过滤空字符串];
    Q --> R[获取单词列表 words];
    R --> S[提取 usage.total_tokens];
    S --> T[显示成功信息 (含 tokens)];
    T --> U[返回 words 数组];
    M -- 失败 (非 2xx) --> V[尝试解析错误 JSON (或文本)];
    V --> W[记录/显示错误信息];
    W --> X[返回 ['error']];
    L -- 捕获异常 --> Y[记录/显示网络或解析错误];
    Y --> X;
    U --> Z[结束: 返回结果给调用者];
    X --> Z;
```
