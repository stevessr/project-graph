# 管理 Tauri 更新程序签名密钥

## 1. 简介

为 Tauri 应用程序的更新过程使用签名密钥是保障安全性的关键一步。通过对更新包进行数字签名，我们可以确保用户接收到的更新是真实可信的，并且在传输过程中没有被篡改。这可以有效防止恶意行为者分发包含有害代码的伪造更新。

## 2. 生成密钥对

Tauri CLI 提供了一个便捷的命令来生成更新签名所需的密钥对（公钥和私钥）。

**步骤:**

1.  打开你的终端或命令行工具。
2.  运行以下命令：

    ```bash
    tauri signer generate -w ~/.tauri/keys
    ```

    - `-w ~/.tauri/keys` 参数指定了密钥文件的生成位置。你可以根据需要更改此路径。

3.  执行命令后，你会在指定目录下找到两个文件：
    - `tauri.key` (私钥)
    - `tauri.pub` (公钥)

**密钥说明:**

- **私钥 (`tauri.key`)**: 这是你的机密密钥，用于对更新包进行签名。**绝不能公开或泄露此文件。**
- **公钥 (`tauri.pub`)**: 这是公开的密钥，你的应用程序将用它来验证更新签名的真实性。

## 3. 密钥管理

正确的密钥管理对于保障更新流程的安全至关重要。

### 私钥 (`TAURI_PRIVATE_KEY`)

私钥必须严格保密。如果私钥泄露，任何人都可以用它来签署并分发恶意更新。

- **存储**: 将私钥的内容作为机密（Secret）存储在你的 CI/CD 环境中。例如，在 GitHub Actions 中，你可以创建一个名为 `TAURI_PRIVATE_KEY` 的 repository secret。
- **警告**: **切勿将私钥文件 (`tauri.key`) 或其内容直接提交到版本控制系统（如 Git）中。**

### 公钥 (`updater.pubkey`)

公钥需要配置在你的 Tauri 应用程序中，以便它能够验证更新。

1.  打开你的公钥文件 (`tauri.pub`)，并复制其中的全部内容。
2.  打开 `src-tauri/tauri.conf.json` 文件。
3.  找到 `updater` 对象，并将你复制的公钥内容粘贴到 `pubkey` 字段中。

## 4. 配置示例

以下是 `src-tauri/tauri.conf.json` 文件中 `updater` 部分的配置示例：

```json
{
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "my-app",
    "version": "0.1.0"
  },
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": ["https://your-update-server.com/updates.json"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_CONTENT_HERE"
    }
  }
}
```

**注意**: 请将 `"YOUR_PUBLIC_KEY_CONTENT_HERE"` 替换为你自己的公钥内容。

## 5. 安全提示

- **始终保护你的私钥**：私钥的安全性是整个更新机制的基石。确保只有授权的构建服务器或开发人员才能访问它。
- **定期轮换密钥**：在可能的情况下，定期生成新的密钥对并更新你的配置，以降低长期密钥泄露的风险。
