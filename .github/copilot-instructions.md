## 项目背景

Github 仓库: `graphif/project-graph`

Project Graph 是一个图形化思维桌面工具和知识管理系统，支持节点连接、图形渲染和自动布局等功能，基于 Tauri + React (TypeScript) 技术栈构建。它旨在提供一个高效、直观的方式来组织和管理个人知识。

## 技术栈

- 框架：React (TypeScript) + Tauri (Rust)
- 构建工具：Vite + pnpm (monorepo) + turborepo
- 图形渲染：Canvas 2D
- UI：shadcn/ui + 自研子窗口组件
- 状态管理：Jotai

## 项目结构

### Tauri 桌面应用和前端

- 前端 Vite 项目: `/app`
- Rust 代码: `/app/src-tauri`

### Fumadocs 文档

- Next.js 项目: `/docs`
- 文档内容: `/docs/content/docs`

### 工具库

在 `/packages` 目录下，包含多个工具库

## 注意事项

本项目采用严格的代码规范和类型检查，工具库都要有测试用例

如果出现选择 `空间换时间` 还是 `时间换空间` 的问题，优先选择 `时间换空间`，即使用更多的时间来减小导出的文件大小

每一个「服务」（使用 `@service` 装饰器的类）都要在 `/docs/content/docs/core/services` 目录下有对应的文档

## RFC

用户指的任务是指 RFC

用户指的 RFC 通常在仓库 Issues 中，名称以 `RFC:` 开头

用户不能完成和自己系统无关的任务，例如用户使用 Linux，不能完成 Mac 上才有的任务

如果用户问还有哪些任务没完成，得给每一个任务一个编号，并且按照重要性和实现难度综合排序，方便用户让你在 RFC 中勾选标记为 `已完成`

## Commit Message

使用 gitmoji
