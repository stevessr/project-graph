#!/usr/bin/env bash
# 统计当前目录下所有 .tsx 文件行数的统计信息（sum / avg / min / max）
# 用法:
#   ./count_tsx_lines.sh
#   ./count_tsx_lines.sh -x node_modules -x dist
#
# 设计说明（WHY 而非 WHAT）：
# - 使用 -print0 + read -d '' 防止空格/特殊字符文件名破坏循环
# - 不直接用 wc 汇总的 total 行，避免解析风险
# - 提供 -x 排除目录以避免 node_modules 等巨量无关文件
# - 使用 bc 保留平均值两位小数；bc 不存在时报 fallback（整数除法）

set -euo pipefail

declare -a EXCLUDES=()

print_help() {
  cat <<'EOF'
统计当前目录（递归）所有 .tsx 文件的行数 (sum / avg / min / max)

选项:
  -x <dir>   排除目录 (可多次使用)，匹配相对路径前缀。例如: -x node_modules -x dist
  -h         显示本帮助

示例:
  ./count_tsx_lines.sh
  ./count_tsx_lines.sh -x node_modules -x dist -x build
EOF
}

# 解析参数
while getopts ":x:h" opt; do
  case "$opt" in
    x)
      # 去掉可能的末尾斜杠
      ex="${OPTARG%/}"
      EXCLUDES+=("$ex")
      ;;
    h)
      print_help
      exit 0
      ;;
    \?)
      echo "未知选项: -$OPTARG" >&2
      exit 2
      ;;
    :)
      echo "选项 -$OPTARG 需要一个参数" >&2
      exit 2
      ;;
  esac
done
shift $((OPTIND - 1))

# 构造排除参数（使用 -not -path './dir/*'）
# 注意：如果目录不存在也不会报错
exclude_args=()
for d in "${EXCLUDES[@]}"; do
  # 统一相对路径前缀
  exclude_args+=( -not -path "./${d}" -not -path "./${d}/*" )
done

# 收集文件列表
declare -a FILES=()
while IFS= read -r -d '' f; do
  FILES+=("$f")
done < <(find . -type f -name '*.tsx' "${exclude_args[@]}" -print0)

file_count=${#FILES[@]}
if [[ $file_count -eq 0 ]]; then
  echo "No .tsx files found (after exclusions)."
  exit 0
fi

sum=0
min=
max=
# 也可输出每个文件行数，按需开启
# printf "%s\t%s\n" "Lines" "File"

for f in "${FILES[@]}"; do
  # 使用重定向避免 wc 输出文件名，性能更好
  if ! lines=$(wc -l < "$f"); then
    echo "读取文件失败: $f" >&2
    exit 1
  fi
  # printf "%s\t%s\n" "$lines" "$f"
  sum=$((sum + lines))
  if [[ -z "${min}" || lines -lt min ]]; then
    min=$lines
  fi
  if [[ -z "${max}" || lines -gt max ]]; then
    max=$lines
  fi
done

# 平均值，优先使用 bc 保留两位
if command -v bc >/dev/null 2>&1; then
  avg=$(echo "scale=2; $sum / $file_count" | bc)
else
  # fallback：整数除法
  avg=$((sum / file_count))
fi

echo "Files: $file_count"
echo "Sum  : $sum"
echo "Min  : $min"
echo "Max  : $max"
echo "Avg  : $avg"

# 额外：如需按行数排序列出前/后若干文件，可追加：
# for f in "${FILES[@]}"; do echo "$(wc -l < "$f")"$'\t'"$f"; done | sort -n | head
