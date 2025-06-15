/// <reference types="vitest/config" />

import generouted from "@generouted/react-router/plugin";
import ViteYaml from "@modyfi/vite-plugin-yaml";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import { compression } from "vite-plugin-compression2";
import { constants } from "zlib";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    tailwindcss(),
    // 将svg文件作为react组件导入
    // import Icon from "./icon.svg?react"
    svgr(),
    // 解析yaml文件，作为js对象导入
    // import config from "./config.yaml"
    ViteYaml(),
    // 使用swc的react插件
    react({
      tsDecorators: true,
      // plugins: [["@swc-jotai/react-refresh", {}]],
    }),
    // 自动生成路由文件
    generouted(),
    // Gzip压缩 (默认)
    compression({
      algorithm: "gzip",
      exclude: [/\.(br|gz|zst)$/, /\.(png|jpg|jpeg|gif|svg|ico|webp)$/],
      threshold: 1024, // 只压缩大于1KB的文件
      compressionOptions: {
        level: 9, // 最高压缩级别
      },
    }),
    // Brotli压缩 (更好的压缩率)
    compression({
      algorithm: "brotliCompress",
      exclude: [/\.(br|gz|zst)$/, /\.(png|jpg|jpeg|gif|svg|ico|webp)$/],
      threshold: 1024,
      compressionOptions: {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11, // 最高质量
          [constants.BROTLI_PARAM_SIZE_HINT]: 0,
        },
      },
    }),
  ],

  // region Tauri
  // 不清屏，方便看rust报错
  clearScreen: false,
  // tauri需要固定的端口
  server: {
    port: 1420,
    //host: ["0.0.0.0", "127.0.0.1"],
    // 端口冲突时直接报错，不尝试下一个可用端口
    strictPort: true,
    host: host || "0.0.0.0",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 不监控src-tauri目录的更改
      ignored: ["**/src-tauri/**"],
    },
  },
  // endregion

  build: {
    // Increase chunk size warning limit to 1.5MB (1500 kB) for complex applications
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: ["@tauri-apps/api"],
      output: {
        // Manual chunking to optimize bundle size
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes("node_modules")) {
            // React ecosystem
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) {
              return "vendor-react";
            }

            // AI and API related libraries
            if (id.includes("openai") || id.includes("@octokit/rest")) {
              return "vendor-ai";
            }

            // Heavy UI libraries
            if (id.includes("vditor") || id.includes("driver.js") || id.includes("lucide-react")) {
              return "vendor-ui";
            }

            // Markdown and text processing
            if (id.includes("markdown-it") || id.includes("yaml")) {
              return "vendor-text";
            }

            // Utilities and data processing
            if (
              id.includes("lodash") ||
              id.includes("decimal.js") ||
              id.includes("msgpackr") ||
              id.includes("zod") ||
              id.includes("uuid")
            ) {
              return "vendor-utils";
            }

            // Tauri plugins
            if (id.includes("@tauri-apps/plugin") || id.includes("tauri-plugin-gamepad-api")) {
              return "vendor-tauri";
            }

            // State management and internationalization
            if (id.includes("zustand") || id.includes("jotai") || id.includes("i18next")) {
              return "vendor-state";
            }

            // Crypto and other heavy libraries
            if (id.includes("bcrypt") || id.includes("canvas")) {
              return "vendor-crypto";
            }

            // Headless UI and styling
            if (id.includes("@headlessui/react") || id.includes("@marsidev/react-turnstile")) {
              return "vendor-headless";
            }

            // All other node_modules
            return "vendor-misc";
          }

          // Application code chunking
          // Core rendering engine
          if (id.includes("/core/render/")) {
            return "core-render";
          }

          // Stage management system
          if (id.includes("/core/stage/")) {
            return "core-stage";
          }

          // Service layer
          if (id.includes("/core/service/")) {
            return "core-service";
          }

          // AI related modules
          if (id.includes("/core/ai/") || id.includes("/services/aiApiService")) {
            return "core-ai";
          }

          // Plugin system
          if (id.includes("/core/plugin/")) {
            return "core-plugin";
          }

          // Pages (route-based splitting)
          if (id.includes("/pages/settings/")) {
            return "pages-settings";
          }

          // Logic nodes (mentioned in memories)
          if (id.includes("/logic/")) {
            return "logic-nodes";
          }

          // MCP (Model Context Protocol) modules
          if (id.includes("/mcp/")) {
            return "mcp-modules";
          }

          // Utilities
          if (id.includes("/utils/")) {
            return "app-utils";
          }

          // Components
          if (id.includes("/components/")) {
            return "app-components";
          }
        },
      },
    },
  },

  // 2024年10月3日发现 pnpm build 会报错，
  // Top-level await is not available in the configured target environment
  // 添加下面的配置解决了
  // 2024/10/05 main.tsx去掉了顶层await，所以不需要这个配置
  // build: {
  //   target: "esnext",
  // },

  // 环境变量前缀
  // 只有名字以LR_开头的环境变量才会被注入到前端
  // import.meta.env.LR_xxx
  envPrefix: "LR_",

  test: {
    environment: "jsdom",
    globals: true, // To make mocks available globally easily
    setupFiles: ["./vitest.setup.ts", "./tests/setup.ts"], // Optional: for global mocks
    include: ["./tests/**/*.test.{ts,tsx}"],
    env: {
      LR_VITEST: "true",
    },
  },
}));
