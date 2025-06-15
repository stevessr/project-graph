#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "../dist");

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    console.error(e);
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function analyzeCompression() {
  console.log("\n🗜️  压缩效果分析报告\n");
  console.log("=".repeat(80));

  const files = fs
    .readdirSync(path.join(distDir, "assets"))
    .filter((file) => file.endsWith(".js") && !file.includes(".gz") && !file.includes(".br"))
    .sort((a, b) => {
      const sizeA = getFileSize(path.join(distDir, "assets", a));
      const sizeB = getFileSize(path.join(distDir, "assets", b));
      return sizeB - sizeA;
    });

  let totalOriginal = 0;
  let totalGzip = 0;
  let totalBrotli = 0;

  console.log(
    "文件名".padEnd(35) +
      "原始大小".padEnd(12) +
      "Gzip".padEnd(12) +
      "Brotli".padEnd(12) +
      "Gzip节省".padEnd(12) +
      "Brotli节省",
  );
  console.log("-".repeat(80));

  files.forEach((file) => {
    const originalPath = path.join(distDir, "assets", file);
    const gzipPath = originalPath + ".gz";
    const brotliPath = originalPath + ".br";

    const originalSize = getFileSize(originalPath);
    const gzipSize = getFileSize(gzipPath);
    const brotliSize = getFileSize(brotliPath);

    if (originalSize > 0) {
      totalOriginal += originalSize;
      totalGzip += gzipSize;
      totalBrotli += brotliSize;

      const gzipSavings = (((originalSize - gzipSize) / originalSize) * 100).toFixed(1);
      const brotliSavings = (((originalSize - brotliSize) / originalSize) * 100).toFixed(1);

      const fileName = file.length > 32 ? file.substring(0, 29) + "..." : file;

      console.log(
        fileName.padEnd(35) +
          formatBytes(originalSize).padEnd(12) +
          formatBytes(gzipSize).padEnd(12) +
          formatBytes(brotliSize).padEnd(12) +
          (gzipSavings + "%").padEnd(12) +
          (brotliSavings + "%"),
      );
    }
  });

  console.log("-".repeat(80));

  const totalGzipSavings = (((totalOriginal - totalGzip) / totalOriginal) * 100).toFixed(1);
  const totalBrotliSavings = (((totalOriginal - totalBrotli) / totalOriginal) * 100).toFixed(1);

  console.log(
    "总计".padEnd(35) +
      formatBytes(totalOriginal).padEnd(12) +
      formatBytes(totalGzip).padEnd(12) +
      formatBytes(totalBrotli).padEnd(12) +
      (totalGzipSavings + "%").padEnd(12) +
      (totalBrotliSavings + "%"),
  );

  console.log("\n📊 压缩统计:");
  console.log(`   原始总大小: ${formatBytes(totalOriginal)}`);
  console.log(`   Gzip压缩后: ${formatBytes(totalGzip)} (节省 ${totalGzipSavings}%)`);
  console.log(`   Brotli压缩后: ${formatBytes(totalBrotli)} (节省 ${totalBrotliSavings}%)`);
  console.log(
    `   Brotli相比Gzip额外节省: ${formatBytes(totalGzip - totalBrotli)} (${(((totalGzip - totalBrotli) / totalGzip) * 100).toFixed(1)}%)`,
  );

  // 分析CSS文件
  const cssFiles = fs
    .readdirSync(path.join(distDir, "assets"))
    .filter((file) => file.endsWith(".css") && !file.includes(".gz") && !file.includes(".br"));

  if (cssFiles.length > 0) {
    console.log("\n🎨 CSS文件压缩效果:");
    cssFiles.forEach((file) => {
      const originalPath = path.join(distDir, "assets", file);
      const gzipPath = originalPath + ".gz";
      const brotliPath = originalPath + ".br";

      const originalSize = getFileSize(originalPath);
      const gzipSize = getFileSize(gzipPath);
      const brotliSize = getFileSize(brotliPath);

      const gzipSavings = (((originalSize - gzipSize) / originalSize) * 100).toFixed(1);
      const brotliSavings = (((originalSize - brotliSize) / originalSize) * 100).toFixed(1);

      console.log(
        `   ${file}: ${formatBytes(originalSize)} → Gzip: ${formatBytes(gzipSize)} (${gzipSavings}%) → Brotli: ${formatBytes(brotliSize)} (${brotliSavings}%)`,
      );
    });
  }

  console.log("\n✅ 压缩配置建议:");
  console.log("   - 服务器应优先使用 Brotli 压缩 (Accept-Encoding: br)");
  console.log("   - 对于不支持 Brotli 的客户端，回退到 Gzip");
  console.log("   - 图片文件已被排除在压缩之外 (已经是压缩格式)");
  console.log("   - 小于 1KB 的文件已被排除在压缩之外");
}

// 直接运行此脚本
analyzeCompression();

export { analyzeCompression };
