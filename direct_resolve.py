#!/usr/bin/env python3
"""
直接处理冲突标记的工具
"""

import os
import re
import subprocess
import sys
from pathlib import Path

def get_conflict_files():
    """获取所有冲突文件"""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, check=True)
        
        conflict_files = []
        for line in result.stdout.strip().split('\n'):
            if line and line[:2] in ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']:
                conflict_files.append(line[3:])
        
        return conflict_files
    except:
        return []

def resolve_conflict_markers(file_path, strategy='ours'):
    """直接处理文件中的冲突标记"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 检查是否有冲突标记
        if '<<<<<<< HEAD' not in content:
            return True
        
        print(f"处理 {file_path} 中的冲突标记...")
        
        if strategy == 'ours':
            # 保留HEAD版本，删除其他版本
            # 匹配模式: <<<<<<< HEAD ... ======= ... >>>>>>> branch
            pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>> [^\n]+'
            resolved = re.sub(pattern, r'\1', content, flags=re.DOTALL)
        elif strategy == 'theirs':
            # 保留其他分支版本
            pattern = r'<<<<<<< HEAD\n.*?\n=======\n(.*?)\n>>>>>>> [^\n]+'
            resolved = re.sub(pattern, r'\1', content, flags=re.DOTALL)
        elif strategy == 'union':
            # 合并两个版本
            pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+'
            resolved = re.sub(pattern, r'\1\n\2', content, flags=re.DOTALL)
        else:
            return False
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(resolved)
        
        # 添加到Git
        subprocess.run(['git', 'add', file_path], check=True)
        print(f"✅ 已解决: {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ 处理 {file_path} 失败: {e}")
        return False

def handle_deleted_files():
    """处理被删除的文件"""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, check=True)
        
        deleted_files = []
        for line in result.stdout.strip().split('\n'):
            if 'deleted by us' in line or line.startswith('DU '):
                file_path = line.split()[-1]
                deleted_files.append(file_path)
        
        for file_path in deleted_files:
            print(f"删除文件: {file_path}")
            subprocess.run(['git', 'rm', file_path], check=True)
            print(f"✅ 已删除: {file_path}")
        
        return len(deleted_files)
    except:
        return 0

def resolve_all_conflicts(strategy='ours'):
    """解决所有冲突"""
    print(f"使用策略 '{strategy}' 解决所有冲突...")
    
    # 处理删除的文件
    deleted_count = handle_deleted_files()
    
    # 获取冲突文件
    conflict_files = get_conflict_files()
    
    if not conflict_files:
        print("没有发现冲突文件")
        if deleted_count > 0:
            print(f"已处理 {deleted_count} 个删除的文件")
        return
    
    print(f"发现 {len(conflict_files)} 个冲突文件")
    
    resolved = 0
    failed = 0
    
    for file_path in conflict_files:
        if resolve_conflict_markers(file_path, strategy):
            resolved += 1
        else:
            failed += 1
    
    print(f"\n结果:")
    print(f"✅ 成功解决: {resolved + deleted_count} 个冲突")
    print(f"❌ 解决失败: {failed} 个冲突")
    
    if failed == 0:
        print("\n🎉 所有冲突已解决！")
        print("运行以下命令完成合并:")
        print("git commit -m 'Resolve merge conflicts'")
    else:
        print("\n还有冲突需要手动解决")

def main():
    if len(sys.argv) > 1:
        strategy = sys.argv[1]
    else:
        strategy = 'ours'
    
    if strategy not in ['ours', 'theirs', 'union']:
        print("错误: 策略必须是 'ours', 'theirs', 或 'union'")
        sys.exit(1)
    
    # 检查Git仓库
    try:
        subprocess.run(['git', 'rev-parse', '--git-dir'], 
                      capture_output=True, check=True)
    except:
        print("错误: 当前目录不是Git仓库")
        sys.exit(1)
    
    resolve_all_conflicts(strategy)

if __name__ == '__main__':
    main()
