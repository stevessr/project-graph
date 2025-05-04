# 修改 ai.tsx 样式计划

**目标**: 修改 `app/src/pages/settings/ai.tsx` 文件，将原生的 `<input>`, `<select>`, 和 `<textarea>` 元素替换为项目内定义的 `<Input>` 和 `<Select>` 组件，以统一 UI 风格。

**参考组件**:
*   输入框 (`<input>`, `<textarea>`): `app/src/components/Input.tsx`
*   选择框 (`<select>`): `app/src/components/Select.tsx`

**具体步骤**:

1.  **导入组件**: 在 `app/src/pages/settings/ai.tsx` 文件顶部添加导入语句：
    ```typescript
    import Input from "../../components/Input";
    import Select from "../../components/Select";
    ```

2.  **替换 Input 元素**:
    *   将第 188 行的 `<input type="text" ...>` 替换为 `<Input name="api_endpoint" ... />`。
    *   将第 199 行的 `<input type="password" ...>` 替换为 `<Input type="password" name="api_key" ... />`。
    *   传递 `value`, `onChange`, `placeholder` 等必要的 props。移除旧的 `className`。

3.  **替换 Select 元素**:
    *   将第 209 行的 `<select name="api_type" ...>` 替换为 `<Select name="api_type" ... />`。
    *   将第 226 行的 `<select name="selected_model" ...>` 替换为 `<Select name="selected_model" ... />`。
    *   传递 `value`, `onChange` 等必要的 props。
    *   将原 `<option>` 元素转换为 `options` prop 需要的 `{ label: string, value: string }[]` 格式。
        *   API Type:
            ```javascript
            options={[
              // { value: "", label: t("ai.apiConfig.apiType.select"), disabled: true }, // 视 Select 组件能力调整
              { value: "responses", label: "Responses API" },
              { value: "chat", label: "Chat Completions" }
            ]}
            ```
        *   Model:
            ```javascript
            options={[
              { value: "", label: loading ? t("ai.apiConfig.model.loading") : t("ai.apiConfig.model.select") },
              ...availableModels.map(model => ({ label: model, value: model }))
            ]}
            ```
    *   移除旧的 `className`。

4.  **替换 Textarea 元素**:
    *   将第 258 行的 `<textarea name="custom_prompts_string" ...>` 替换为 `<Input multiline name="custom_prompts_string" ... />`。
    *   将第 272 行的 `<textarea name="summary_prompt" ...>` 替换为 `<Input multiline name="summary_prompt" ... />`。
    *   传递 `value`, `onChange`, `rows`, `placeholder` 等必要的 props。移除旧的 `className`。

**可视化**:

```mermaid
graph TD
    subgraph "ai.tsx (当前)"
        A1["<input type='text'> (L188)"]
        A2["<input type='password'> (L199)"]
        A3["<select> (L209)"]
        A4["<select> (L226)"]
        A5["<textarea> (L258)"]
        A6["<textarea> (L272)"]
    end

    subgraph "app/src/components/"
        B1[Input.tsx]
        B2[Select.tsx]
    end

    subgraph "ai.tsx (计划)"
        C1["<Input>"]
        C2["<Input type='password'>"]
        C3["<Select>"]
        C4["<Select>"]
        C5["<Input multiline>"]
        C6["<Input multiline>"]
    end

    A1 --> C1
    A2 --> C2
    A3 --> C3
    A4 --> C4
    A5 --> C5
    A6 --> C6

    C1 -- imports & uses --> B1
    C2 -- imports & uses --> B1
    C3 -- imports & uses --> B2
    C4 -- imports & uses --> B2
    C5 -- imports & uses --> B1
    C6 -- imports & uses --> B1

    style A1 fill:#f9f,stroke:#333,stroke-width:1px
    style A2 fill:#f9f,stroke:#333,stroke-width:1px
    style A3 fill:#f9f,stroke:#333,stroke-width:1px
    style A4 fill:#f9f,stroke:#333,stroke-width:1px
    style A5 fill:#f9f,stroke:#333,stroke-width:1px
    style A6 fill:#f9f,stroke:#333,stroke-width:1px

    style C1 fill:#9cf,stroke:#333,stroke-width:1px
    style C2 fill:#9cf,stroke:#333,stroke-width:1px
    style C3 fill:#9cf,stroke:#333,stroke-width:1px
    style C4 fill:#9cf,stroke:#333,stroke-width:1px
    style C5 fill:#9cf,stroke:#333,stroke-width:1px
    style C6 fill:#9cf,stroke:#333,stroke-width:1px
