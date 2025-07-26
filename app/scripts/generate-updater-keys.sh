#!/bin/bash

#
#  此脚本用于为 Tauri 更新程序生成签名密钥。
#
#  用法:
#  ./scripts/generate-updater-keys.sh
#
#  功能:
#  1. 在项目根目录的 ./.keys 文件夹中生成密钥文件。
#  2. 如果 .keys 目录已存在，会提示用户确认是否覆盖。
#  3. 从 ./.keys/tauri.pub 文件中提取公钥。
#  4. 在终端输出私钥内容和公钥字符串，并提供设置说明。
#  5. 提醒用户将 .keys 目录添加到 .gitignore 中。
#

# 设置颜色变量以便输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 密钥目录
KEYS_DIR="./.keys"

# 检查 .keys 目录是否存在
if [ -d "$KEYS_DIR" ]; then
    echo -e "${YELLOW}警告: 密钥目录 '$KEYS_DIR' 已存在。${NC}"
    read -p "您想覆盖它吗？这将删除并重新生成所有密钥。[y/N] " -n 1 -r
    echo # 移动到新行
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "操作已取消。"
        exit 1
    fi
    echo "正在删除旧的密钥目录..."
    rm -rf "$KEYS_DIR"
fi

# 生成密钥
echo "正在生成新的 Tauri 更新程序密钥..."
pnpm tauri signer generate -w "$KEYS_DIR" --force

# 检查密钥是否成功生成
if [ ! -f "$KEYS_DIR/tauri.key" ] || [ ! -f "$KEYS_DIR/tauri.pub" ]; then
    echo -e "${RED}错误: 密钥生成失败。请确保已安装 Tauri CLI 并正确配置。${NC}"
    exit 1
fi

# 读取私钥和公钥
PRIVATE_KEY=$(cat "$KEYS_DIR/tauri.key")
PUBLIC_KEY=$(cat "$KEYS_DIR/tauri.pub")

# 清晰地输出说明
echo -e "\n${GREEN}===============================================================${NC}"
echo -e "${GREEN}           Tauri 更新程序密钥已成功生成！                  ${NC}"
echo -e "${GREEN}===============================================================${NC}\n"

# 私钥说明
echo -e "${YELLOW}1. 私钥 (TAURI_PRIVATE_KEY):${NC}"
echo "请将以下私钥内容设置为名为 'TAURI_PRIVATE_KEY' 的环境变量或 CI/CD 机密。"
echo "这是您的私钥，请务必保密！"
echo -e "${GREEN}-------------------- 私钥内容 --------------------${NC}"
echo "$PRIVATE_KEY"
echo -e "${GREEN}----------------------------------------------------${NC}\n"

# 公钥说明
echo -e "${YELLOW}2. 公钥 (updater.pubkey):${NC}"
echo "请将以下公钥字符串复制到 'src-tauri/tauri.conf.json' 文件的 'updater.pubkey' 字段中。"
echo -e "${GREEN}-------------------- 公钥内容 --------------------${NC}"
echo "$PUBLIC_KEY"
echo -e "${GREEN}----------------------------------------------------${NC}\n"

# 安全警告
echo -e "${RED}!!!!!!!!!!!!!!!!!!!! 安全警告 !!!!!!!!!!!!!!!!!!!!${NC}"
echo -e "${RED}不要将 '$KEYS_DIR' 目录或您的私钥提交到版本控制 (Git) 中。${NC}"
echo "为防止意外提交，请确保您的 '.gitignore' 文件中包含以下行："
echo -e "\n${GREEN}.keys${NC}\n"

echo "脚本执行完毕。"
