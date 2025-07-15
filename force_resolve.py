#!/usr/bin/env python3
"""
强制解决Git冲突工具
使用不同策略快速解决所有冲突
"""

import subprocess
import sys
import argparse
from pathlib import Path

def run_command(cmd, check=True):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout, e.stderr

def get_conflict_files():
    """获取所有冲突文件"""
    success, stdout, stderr = run_command("git status --porcelain")
    if not success:
        return []
    
    conflict_files = []
    for line in stdout.strip().split('\n'):
        if line and line[:2] in ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']:
            conflict_files.append(line[3:])
    
    return conflict_files

def resolve_with_strategy(files, strategy):
    """使用指定策略解决冲突"""
    resolved = 0
    failed = 0
    
    for file_path in files:
        print(f"解决 {file_path} (策略: {strategy})")
        
        if strategy == "ours":
            success, _, _ = run_command(f"git checkout --ours '{file_path}'")
        elif strategy == "theirs":
            success, _, _ = run_command(f"git checkout --theirs '{file_path}'")
        elif strategy == "remove":
            # 删除文件
            success, _, _ = run_command(f"git rm '{file_path}'")
        else:
            print(f"未知策略: {strategy}")
            continue
        
        if success:
            # 添加到暂存区
            run_command(f"git add '{file_path}'", check=False)
            resolved += 1
            print(f"✅ 已解决: {file_path}")
        else:
            failed += 1
            print(f"❌ 失败: {file_path}")
    
    return resolved, failed

def smart_resolve_all():
    """智能解决所有冲突"""
    conflict_files = get_conflict_files()
    
    if not conflict_files:
        print("没有发现冲突文件")
        return
    
    print(f"发现 {len(conflict_files)} 个冲突文件")
    
    # 分类处理不同类型的文件
    package_files = [f for f in conflict_files if f.endswith('package.json')]
    cargo_files = [f for f in conflict_files if 'Cargo.' in f]
    config_files = [f for f in conflict_files if f.endswith(('.json', '.yml', '.yaml', '.toml'))]
    deleted_files = []
    code_files = []
    
    # 检查删除的文件
    for file_path in conflict_files:
        success, stdout, _ = run_command(f"git status --porcelain '{file_path}'")
        if success and 'deleted by us' in stdout:
            deleted_files.append(file_path)
        elif file_path not in package_files + cargo_files + config_files:
            code_files.append(file_path)
    
    total_resolved = 0
    total_failed = 0
    
    # 处理删除的文件
    if deleted_files:
        print(f"\n处理 {len(deleted_files)} 个删除的文件...")
        resolved, failed = resolve_with_strategy(deleted_files, "remove")
        total_resolved += resolved
        total_failed += failed
    
    # 处理package.json文件
    if package_files:
        print(f"\n处理 {len(package_files)} 个package.json文件...")
        resolved, failed = resolve_with_strategy(package_files, "ours")
        total_resolved += resolved
        total_failed += failed
    
    # 处理Cargo文件
    if cargo_files:
        print(f"\n处理 {len(cargo_files)} 个Cargo文件...")
        resolved, failed = resolve_with_strategy(cargo_files, "ours")
        total_resolved += resolved
        total_failed += failed
    
    # 处理配置文件
    if config_files:
        print(f"\n处理 {len(config_files)} 个配置文件...")
        resolved, failed = resolve_with_strategy(config_files, "ours")
        total_resolved += resolved
        total_failed += failed
    
    # 处理代码文件
    if code_files:
        print(f"\n处理 {len(code_files)} 个代码文件...")
        resolved, failed = resolve_with_strategy(code_files, "ours")
        total_resolved += resolved
        total_failed += failed
    
    print(f"\n总结:")
    print(f"✅ 成功解决: {total_resolved} 个冲突")
    print(f"❌ 解决失败: {total_failed} 个冲突")
    
    if total_failed == 0:
        print("\n🎉 所有冲突已解决！")
        print("运行以下命令完成合并:")
        print("git commit -m 'Resolve merge conflicts'")
    else:
        print("\n还有冲突需要手动解决，运行 'git status' 查看")

def force_resolve_all(strategy="ours"):
    """强制解决所有冲突"""
    conflict_files = get_conflict_files()
    
    if not conflict_files:
        print("没有发现冲突文件")
        return
    
    print(f"使用 {strategy} 策略强制解决 {len(conflict_files)} 个冲突...")
    
    resolved, failed = resolve_with_strategy(conflict_files, strategy)
    
    print(f"\n结果:")
    print(f"✅ 成功解决: {resolved} 个冲突")
    print(f"❌ 解决失败: {failed} 个冲突")
    
    if failed == 0:
        print("\n🎉 所有冲突已解决！")
        print("运行以下命令完成合并:")
        print("git commit -m 'Resolve merge conflicts'")

def main():
    parser = argparse.ArgumentParser(description='强制解决Git冲突工具')
    parser.add_argument(
        'strategy',
        nargs='?',
        default='smart',
        choices=['smart', 'ours', 'theirs', 'force-ours', 'force-theirs'],
        help='解决策略'
    )
    
    args = parser.parse_args()
    
    # 检查Git仓库
    success, _, _ = run_command("git rev-parse --git-dir")
    if not success:
        print("错误: 当前目录不是Git仓库")
        sys.exit(1)
    
    if args.strategy == 'smart':
        smart_resolve_all()
    elif args.strategy.startswith('force-'):
        strategy = args.strategy.replace('force-', '')
        force_resolve_all(strategy)
    else:
        force_resolve_all(args.strategy)

if __name__ == '__main__':
    main()
