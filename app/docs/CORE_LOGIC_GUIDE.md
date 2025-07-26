# 核心逻辑指南 (Core Logic Guide)

本文档旨在详细解释项目的核心逻辑，主要聚焦于 [`src/core`](src/core:0) 目录下的代码结构和设计理念。

## 1. 服务 (Services) - `src/core/service`

[`src/core/service`](src/core/service:0) 目录是应用功能的核心，它将不同的业务逻辑封装在独立的、可重用的服务模块中。这种设计模式有助于实现关注点分离（Separation of Concerns），使得代码更易于维护和扩展。

### 关键服务解析

- **`controlService` (用户输入/控制)**
  - **路径**: [`src/core/service/controlService`](src/core/service/controlService:0)
  - **职责**: 该服务负责处理所有与用户交互相关的逻辑，包括鼠标、键盘事件、快捷键、以及画布的镜头控制和选择工具。它是连接用户操作和应用响应的桥梁。

- **`dataFileService` (文件操作)**
  - **路径**: [`src/core/service/dataFileService`](src/core/service/dataFileService:0)
  - **职责**: 管理项目文件的读取、写入、导出和导入。它抽象了文件系统的具体实现，为上层应用提供统一的文件操作接口。

- **`dataManageService` (数据管理)**
  - **路径**: [`src/core/service/dataManageService`](src/core/service/dataManageService:0)
  - **职责**: 这是数据处理的中心枢纽。它负责管理画布上节点和边的数据模型，处理数据的增删改查、复制粘贴，以及可能的数据协作和搜索功能。

- **`feedbackService` (UI 反馈)**
  - **路径**: [`src/core/service/feedbackService`](src/core/service/feedbackService:0)
  - **职责**: 提供用户操作的即时视觉反馈。例如，当用户悬停在某个对象上时，该服务可能会高亮该对象；或者在执行某个操作后，显示一个短暂的动画效果。这增强了应用的交互性和用户体验。

## 2. 舞台 (Stage) - `src/core/stage`

[`src/core/stage`](src/core/stage:0) 目录定义了应用的核心画布（或称“舞台”）。所有可视化的元素都在这个舞台上进行组织和渲染。

- **`stageManager` (舞台管理器)**
  - **路径**: [`src/core/stage/stageManager`](src/core/stage/stageManager:0)
  - **概念**: `stageManager` 是一个单例或高级控制器，负责管理整个舞台的生命周期和状态。它协调 `stageObject` 的创建、更新和销毁，并处理布局算法、缩放和摄像机视图等全局性事务。

- **`stageObject` (舞台对象)**
  - **路径**: [`src/core/stage/stageObject`](src/core/stage/stageObject:0)
  - **概念**: `stageObject` 是舞台上所有独立元素的基类或抽象。无论是节点（Node）、边（Edge）还是其他图形元素，都继承自 `stageObject`。它定义了对象的基本属性（如位置、大小）和行为（如碰撞检测）。`stageManager` 通过管理一组 `stageObject` 来构建整个可视化场景。

## 3. 插件系统 (Plugin System) - `src/core/plugin`

[`src/core/plugin`](src/core/plugin:0) 目录实现了一套灵活的插件架构，允许开发者在不修改核心代码的情况下扩展应用功能。

### 架构概述

插件系统似乎围绕着动态加载和执行用户脚本构建。这为自定义工具、自动化工作流或集成第三方服务提供了强大的能力。

- **[`PluginWorker.tsx`](src/core/plugin/PluginWorker.tsx:0)**: (推测) 这个组件可能负责在一个隔离的环境（如 Web Worker）中运行插件代码。这可以防止插件代码阻塞主线程，保证了应用的性能和稳定性。
- **[`UserScriptsManager.tsx`](src/core/plugin/UserScriptsManager.tsx:0)**: (推测) 该管理器负责加载、管理和执行用户提供的脚本（即插件）。它可能提供了插件的注册、启用/禁用以及与核心系统通信的接口。
- **创建新插件**: (推测) 创建一个新插件通常涉及编写一个遵循特定 API 的脚本文件，然后通过 `UserScriptsManager` 将其加载到应用中。插件可以通过预定义的钩子（Hooks）或事件来与核心服务和舞台对象进行交互。参考该目录下的 [`README.md`](src/core/plugin/README.md:0) (如果存在) 可以获取更详细的指引。

## 4. 渲染 (Rendering) - `src/core/render`

[`src/core/render`](src/core/render:0) 目录负责将 `stageObject` 实例绘制到屏幕上。它将数据模型与视觉表现解耦，支持多种渲染后端。

### 渲染策略

不同的渲染器适用于不同的场景，这种多策略设计提高了应用的灵活性和性能。

- **`canvas2d`**
  - **路径**: [`src/core/render/canvas2d`](src/core/render/canvas2d:0)
  - **用途**: 使用 HTML5 Canvas 2D API进行渲染。它非常适合需要绘制大量简单形状的场景，性能较高，是动态和交互式图表的主要渲染方式。

- **`domElement`**
  - **路径**: [`src/core/render/domElement`](src/core/render/domElement:0)
  - **用途**: 将舞台对象渲染为标准的 HTML DOM 元素。这种方式便于利用 CSS 进行样式设置和动画处理，并且可以轻松集成现有的 HTML/CSS UI 库。适用于UI面板、信息框等元素。

- **`svg`**
  - **路径**: [`src/core/render/svg`](src/core/render/svg:0)
  - **用途**: 使用可缩放矢量图形 (SVG) 进行渲染。SVG 的优势在于其无限缩放而不失真，非常适合需要高保真度、复杂线条和渐变的图形。每个对象都是一个独立的 DOM 节点，便于事件处理。
