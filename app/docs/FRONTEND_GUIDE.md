# 前端开发指南

欢迎来到项目的前端开发！本文档旨在帮助你快速了解项目结构、核心概念和开发规范。

## 1. 组件 (Components)

### 目录用途

所有可复用的 UI 组件都存放在 [`src/components`](src/components:0) 目录下。这些组件是构成应用界面的基础模块，设计上应保持通用性和独立性。

### 创建新组件

当你需要创建一个新的通用组件时（例如 `Card.tsx`），请遵循以下步骤：

1.  在 [`src/components`](src/components:0) 目录下创建一个新的 `tsx` 文件，例如 `Card.tsx`。
2.  在文件中定义并导出一个 React 组件。建议使用函数式组件和 Hooks。

    ```tsx
    // src/components/Card.tsx
    import React from "react";

    interface CardProps {
      title: string;
      children: React.ReactNode;
    }

    export const Card: React.FC<CardProps> = ({ title, children }) => {
      return (
        <div className="card">
          <h3 className="card-title">{title}</h3>
          <div className="card-content">{children}</div>
        </div>
      );
    };
    ```

3.  （可选）如果组件需要特定样式，请在 [`src/css`](src/css:0) 目录中添加相应的 CSS 规则。
4.  在需要使用该组件的地方导入并使用它。

### 核心组件示例

我们提供了一些基础组件来保证 UI 的一致性：

- **[`Box.tsx`](src/components/Box.tsx:0)**: 一个通用的容器组件，用于布局和包裹其他元素，提供了灵活的样式控制。
- **[`Button.tsx`](src/components/Button.tsx:0)**: 标准按钮组件。它支持不同的变体（如主按钮、次要按钮）和状态（如禁用、加载中）。
- **[`Input.tsx`](src/components/Input.tsx:0)**: 标准化的文本输入框，封装了常用的输入逻辑和样式。
- **[`dialog.tsx`](src/components/dialog.tsx:0)**: 用于创建模态对话框，处理焦点管理和弹出层逻辑。
- **[`Select.tsx`](src/components/Select.tsx:0)**: 标准化的下拉选择框组件。

## 2. 页面 (Pages)

### 目录用途

[`src/pages`](src/pages:0) 目录存放了应用的所有页面级组件。每个子目录或文件通常对应一个特定的应用视图或路由。例如，[`welcome/`](src/pages/welcome:0) 目录下的组件构成了应用的欢迎页面。

### 特殊目录

在 `pages` 目录下，有一些以下划线 `_` 开头的特殊目录，它们用于特定类型的视图：

- **[`_sub_window/`](src/pages/_sub_window:0)**: 用于创建独立的子窗口。例如，[`SettingsWindow/`](src/pages/_sub_window/SettingsWindow:0) 就定义了应用的设置窗口界面。
- **[`_popup_panel/`](src/pages/_popup_panel:0)**: 用于在主窗口之上弹出的面板或视图。
- **[`_fixed_panel/`](src/pages/_fixed_panel:0)**: 用于固定在主界面上的面板，通常用于显示辅助信息。
- **[`_special_day_dialog/`](src/pages/_special_day_dialog:0)**: 用于在特定日期（如节日）显示的特殊对话框。

## 3. 样式 (Styling)

项目的所有全局样式和组件样式都定义在 [`src/css`](src/css:0) 目录中。我们使用纯 CSS 文件来管理样式，以保持简单和直观。

- **全局样式**: 定义了应用的基础样式、变量和主题。
- **组件样式**: 针对特定组件的样式规则，确保其外观和感觉在整个应用中保持一致。

开发新功能或修改现有界面时，请优先复用已有的样式类。如果需要添加新样式，请将其添加到相关的 CSS 文件中。

## 4. 持久化存储 (Persistence)

为了在不同会话间保存用户数据（如设置、状态等），我们提供了一套统一的持久化存储机制。该机制通过一个简单的接口，屏蔽了底层实现的差异。

### 统一的存储接口

获取存储实例的统一入口是 [`createStore(name)`](src/utils/store.tsx:4) 函数。你只需要提供一个唯一的 `name` 来创建或加载一个存储区。

### 跨平台实现

我们的存储机制支持跨平台工作，其底层实现根据运行环境自动切换：

- **Tauri 环境**: 在原生桌面应用中，它使用 [`@tauri-apps/plugin-store`](https://github.com/tauri-apps/plugins-workspace/tree/v1/plugins/store) 插件。这是一个由 Tauri 官方提供的高效、持久的键值存储方案，直接将数据保存在本地文件中。
- **Web 环境**: 在浏览器中，它会回退到使用 `localStorage`。我们通过一个名为 `WebStore` 的自定义类，模拟了与 Tauri `Store` 相同的 `get()`/`set()` 接口，从而确保了在不同环境下的代码一致性。

### 基本用法

以下示例展示了如何使用存储接口来读写数据：

```typescript
import { createStore } from "../utils/store";

// 1. 创建或加载一个名为 'user_settings' 的存储区
const settingsStore = await createStore("user_settings");

// 2. 写入数据
await settingsStore.set("theme", { mode: "dark" });

// 3. 读取数据
const theme = await settingsStore.get("theme");
console.log(theme); // 输出: { mode: 'dark' }

// 4. 删除数据
await settingsStore.delete("theme");
```

## 5. 网络请求 (Networking)

为了统一项目中的网络请求并解决跨平台问题，我们提供了一个通用的 `universalFetch` 函数。

### 统一的 Fetch 接口

`universalFetch` 是项目中进行所有网络请求的推荐方式。它位于 [`'src/utils/fetch.ts'`](src/utils/fetch.ts:0)，用法与标准的 `fetch` API 完全一致。

### 跨平台能力

该函数的核心优势在于其跨平台适应能力。它会自动检测当前的运行环境，并选择最优的实现方式：

- **Web 浏览器**: 在浏览器环境中，它直接使用原生支持的 `window.fetch` 方法。
- **Tauri 桌面应用**: 在 Tauri 环境中，它会切换到使用 [`@tauri-apps/plugin-http`](https://github.com/tauri-apps/plugins-workspace/tree/v1/plugins/http) 的 `fetch` 功能。这有助于绕过 Web 环境中常见的 CORS（跨源资源共享）限制，从而更自由地与外部 API 通信。

### 基本用法

你可以从 [`'src/utils/fetch.ts'`](src/utils/fetch.ts:0) 导入 `universalFetch`，然后像使用标准 `fetch` 一样调用它。

```typescript
import { universalFetch } from "utils/fetch";

async function getUserData() {
  try {
    const response = await universalFetch("https://api.example.com/user/1");
    if (response.ok) {
      const data = await response.json();
      console.log(data);
    } else {
      console.error("Network response was not ok.");
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}
```
