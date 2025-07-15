#!/bin/bash

# 自动合并Git冲突脚本
# 使用方法: ./auto-merge-conflicts.sh [策略]
# 策略选项: ours, theirs, union, smart

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在Git仓库中
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "当前目录不是Git仓库"
        exit 1
    fi
}

# 检查是否有合并冲突
check_merge_conflicts() {
    if ! git status --porcelain | grep -q "^UU\|^AA\|^DD\|^AU\|^UA\|^DU\|^UD"; then
        log_info "没有发现合并冲突"
        return 1
    fi
    return 0
}

# 获取冲突文件列表
get_conflict_files() {
    git status --porcelain | grep "^UU\|^AA\|^DD\|^AU\|^UA\|^DU\|^UD" | cut -c4-
}

# 自动解决package.json冲突
resolve_package_json_conflicts() {
    local file="$1"
    log_info "正在解决 $file 的依赖冲突..."
    
    # 创建临时文件
    local temp_file=$(mktemp)
    
    # 使用Node.js脚本合并package.json
    node -e "
    const fs = require('fs');
    const content = fs.readFileSync('$file', 'utf8');
    
    // 移除冲突标记并合并依赖
    let result = content;
    
    // 处理dependencies冲突
    const depPattern = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> [^\n]+/g;
    
    result = result.replace(depPattern, (match, ours, theirs) => {
        try {
            // 尝试解析为JSON对象
            const oursObj = JSON.parse('{' + ours + '}');
            const theirsObj = JSON.parse('{' + theirs + '}');
            
            // 合并对象，保留较新版本
            const merged = {...theirsObj, ...oursObj};
            
            // 转换回字符串格式
            return Object.entries(merged)
                .map(([key, value]) => '    \"' + key + '\": \"' + value + '\"')
                .join(',\n');
        } catch (e) {
            // 如果解析失败，使用我们的版本
            return ours;
        }
    });
    
    fs.writeFileSync('$temp_file', result);
    " 2>/dev/null || {
        log_warning "Node.js合并失败，使用简单策略"
        # 简单策略：保留HEAD版本
        sed '/<<<<<<< HEAD/,/=======/{/=======/d;}' "$file" | sed '/>>>>>>> /d' > "$temp_file"
    }
    
    # 验证JSON格式
    if node -e "JSON.parse(require('fs').readFileSync('$temp_file', 'utf8'))" 2>/dev/null; then
        mv "$temp_file" "$file"
        log_success "成功解决 $file 冲突"
        return 0
    else
        log_error "$file 合并后格式无效，回退到手动解决"
        rm -f "$temp_file"
        return 1
    fi
}

# 自动解决Cargo.toml冲突
resolve_cargo_toml_conflicts() {
    local file="$1"
    log_info "正在解决 $file 的依赖冲突..."
    
    # 使用union策略合并
    git checkout --ours "$file"
    git add "$file"
    log_success "使用ours策略解决 $file 冲突"
}

# 自动解决代码文件冲突
resolve_code_conflicts() {
    local file="$1"
    local strategy="$2"
    
    log_info "正在解决 $file 冲突，策略: $strategy"
    
    case "$strategy" in
        "ours")
            git checkout --ours "$file"
            ;;
        "theirs")
            git checkout --theirs "$file"
            ;;
        "union")
            git merge-file --union "$file" "$file" "$file" 2>/dev/null || {
                log_warning "union策略失败，使用ours策略"
                git checkout --ours "$file"
            }
            ;;
        "smart")
            # 智能合并：尝试自动解决简单冲突
            if resolve_simple_conflicts "$file"; then
                log_success "智能合并成功"
            else
                log_warning "智能合并失败，使用ours策略"
                git checkout --ours "$file"
            fi
            ;;
        *)
            log_error "未知策略: $strategy"
            return 1
            ;;
    esac
    
    git add "$file"
    log_success "解决 $file 冲突"
}

# 解决简单冲突（智能策略）
resolve_simple_conflicts() {
    local file="$1"
    local temp_file=$(mktemp)
    
    # 检查是否只是简单的添加冲突
    if grep -q "<<<<<<< HEAD" "$file"; then
        # 尝试自动合并非冲突部分
        python3 -c "
import re
import sys

with open('$file', 'r', encoding='utf-8') as f:
    content = f.read()

# 简单策略：如果冲突块很小且看起来是添加操作，尝试合并
def resolve_conflict(match):
    full_match = match.group(0)
    ours = match.group(1)
    theirs = match.group(2)
    
    # 如果一边是空的，选择非空的
    if not ours.strip():
        return theirs
    if not theirs.strip():
        return ours
    
    # 如果内容相似，尝试合并
    if len(ours.split('\n')) <= 5 and len(theirs.split('\n')) <= 5:
        # 简单合并：保留两边的内容
        return ours + '\n' + theirs
    
    # 默认保留我们的版本
    return ours

pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+'
result = re.sub(pattern, resolve_conflict, content, flags=re.DOTALL)

with open('$temp_file', 'w', encoding='utf-8') as f:
    f.write(result)
" 2>/dev/null || return 1
        
        # 检查是否还有冲突标记
        if ! grep -q "<<<<<<< HEAD\|=======\|>>>>>>> " "$temp_file"; then
            mv "$temp_file" "$file"
            return 0
        fi
    fi
    
    rm -f "$temp_file"
    return 1
}

# 主函数
main() {
    local strategy="${1:-smart}"
    
    log_info "开始自动合并Git冲突，策略: $strategy"
    
    # 检查环境
    check_git_repo
    
    if ! check_merge_conflicts; then
        log_success "没有需要解决的冲突"
        exit 0
    fi
    
    # 获取冲突文件
    local conflict_files=($(get_conflict_files))
    log_info "发现 ${#conflict_files[@]} 个冲突文件"
    
    # 逐个解决冲突
    local resolved=0
    local failed=0
    
    for file in "${conflict_files[@]}"; do
        log_info "处理文件: $file"
        
        case "$file" in
            */package.json)
                if resolve_package_json_conflicts "$file"; then
                    git add "$file"
                    ((resolved++))
                else
                    ((failed++))
                fi
                ;;
            */Cargo.toml|*/Cargo.lock)
                resolve_cargo_toml_conflicts "$file"
                ((resolved++))
                ;;
            *.json|*.yml|*.yaml)
                # 对于配置文件，使用保守策略
                resolve_code_conflicts "$file" "ours"
                ((resolved++))
                ;;
            *)
                # 其他文件使用指定策略
                if resolve_code_conflicts "$file" "$strategy"; then
                    ((resolved++))
                else
                    ((failed++))
                fi
                ;;
        esac
    done
    
    # 报告结果
    log_success "成功解决 $resolved 个冲突"
    if [ $failed -gt 0 ]; then
        log_warning "有 $failed 个冲突需要手动解决"
        log_info "运行 'git status' 查看剩余冲突"
    else
        log_success "所有冲突已解决！"
        log_info "运行 'git commit' 完成合并"
    fi
}

# 显示帮助信息
show_help() {
    echo "自动合并Git冲突脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [策略]"
    echo ""
    echo "策略选项:"
    echo "  ours    - 使用当前分支的版本"
    echo "  theirs  - 使用合并分支的版本"
    echo "  union   - 尝试合并两个版本"
    echo "  smart   - 智能合并（默认）"
    echo ""
    echo "示例:"
    echo "  $0 smart    # 使用智能策略"
    echo "  $0 ours     # 使用当前分支版本"
    echo "  $0 theirs   # 使用合并分支版本"
}

# 参数处理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    ""|ours|theirs|union|smart)
        main "$1"
        ;;
    *)
        log_error "无效参数: $1"
        show_help
        exit 1
        ;;
esac
