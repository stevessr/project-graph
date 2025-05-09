# 计划：复用重复引入的外部函数

**目标：** 将重复引入的 `invoke` 和 `fetch` 函数提取到共享模块中，并在需要的地方引用。

**背景：**

在文件 `app/src/core/stage/stageManager/concreteMethods/StageGeneratorAI.tsx`、`app/src/pages/settings/ai.tsx`、`app/src/utils/fs.tsx` 和 `app/src/utils/otherApi.tsx` 中，发现 `@tauri-apps/api/core` 的 `invoke` 函数被重复引入和使用。同时，`@tauri-apps/plugin-http` 的 `fetch` 函数在 `StageGeneratorAI.tsx` 和 `ai.tsx` 中被重复引入和使用。为了提高代码复用性和可维护性，决定将这些函数提取到共享模块中。

**计划步骤：**

1.  **创建共享模块文件：** 在 `app/src/utils/` 目录下创建一个新的 TypeScript 文件，例如 `tauriApi.ts`。
2.  **提取并导出函数：** 将 `@tauri-apps/api/core` 的 `invoke` 和 `@tauri-apps/plugin-http` 的 `fetch` 的引入以及相关的类型定义移动到 `tauriApi.ts` 文件中，并将其导出。
3.  **更新引用：**
    *   修改 `app/src/core/stage/stageManager/concreteMethods/StageGeneratorAI.tsx`，将对 `invoke` 和 `fetch` 的直接引用更改为从 `app/src/utils/tauriApi.ts` 模块中引入。
    *   修改 `app/src/pages/settings/ai.tsx`，将对 `invoke` 和 `fetch` 的直接引用更改为从 `app/src/utils/tauriApi.ts` 模块中引入。
    *   修改 `app/src/utils/fs.tsx`，将对 `invoke` 的直接引用更改为从 `app/src/utils/tauriApi.ts` 模块中引入。
    *   修改 `app/src/utils/otherApi.tsx`，将对 `invoke` 的直接引用更改为从 `app/src/utils/tauriApi.ts` 模块中引入。保留对 `getVersion` 的引入。
4.  **验证更改：** 确保修改后的代码能够正常工作，没有引入新的错误。

**可视化计划 (Mermaid 图):**

```mermaid
graph TD
    A[app/src/core/stage/stageManager/concreteMethods/StageGeneratorAI.tsx] --> E[app/src/utils/tauriApi.ts]
    B[app/src/pages/settings/ai.tsx] --> E
    C[app/src/utils/fs.tsx] --> E
    D[app/src/utils/otherApi.tsx] --> E
    E -- 导出 --> invoke
    E -- 导出 --> fetch
    D -- 保留引入 --> getVersion
