#!/usr/bin/env python3
"""
智能Git冲突自动合并工具
支持多种文件类型的智能合并策略
"""

import os
import re
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import argparse

class ConflictResolver:
    def __init__(self, strategy: str = "smart"):
        self.strategy = strategy
        self.resolved_count = 0
        self.failed_count = 0
        
    def log(self, level: str, message: str):
        """彩色日志输出"""
        colors = {
            'INFO': '\033[0;34m',
            'SUCCESS': '\033[0;32m', 
            'WARNING': '\033[1;33m',
            'ERROR': '\033[0;31m',
            'NC': '\033[0m'
        }
        print(f"{colors.get(level, '')}{level}{colors['NC']}: {message}")
    
    def get_conflict_files(self) -> List[str]:
        """获取所有冲突文件"""
        try:
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True, text=True, check=True
            )
            
            conflict_files = []
            for line in result.stdout.strip().split('\n'):
                if line and line[:2] in ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']:
                    conflict_files.append(line[3:])
            
            return conflict_files
        except subprocess.CalledProcessError:
            self.log('ERROR', '无法获取Git状态')
            return []
    
    def resolve_package_json(self, file_path: str) -> bool:
        """智能解决package.json冲突"""
        self.log('INFO', f'智能合并 {file_path}...')
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 解析冲突块
            conflicts = self._parse_conflicts(content)
            if not conflicts:
                return False
            
            # 合并package.json依赖
            resolved_content = content
            for conflict in reversed(conflicts):  # 从后往前处理，避免位置偏移
                merged_section = self._merge_package_dependencies(
                    conflict['ours'], conflict['theirs']
                )
                resolved_content = (
                    resolved_content[:conflict['start']] + 
                    merged_section + 
                    resolved_content[conflict['end']:]
                )
            
            # 验证JSON格式
            try:
                json.loads(resolved_content)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(resolved_content)
                self.log('SUCCESS', f'成功合并 {file_path}')
                return True
            except json.JSONDecodeError:
                self.log('ERROR', f'{file_path} 合并后JSON格式无效')
                return False
                
        except Exception as e:
            self.log('ERROR', f'处理 {file_path} 时出错: {e}')
            return False
    
    def _parse_conflicts(self, content: str) -> List[Dict]:
        """解析冲突标记"""
        conflicts = []
        pattern = r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+'
        
        for match in re.finditer(pattern, content, re.DOTALL):
            conflicts.append({
                'start': match.start(),
                'end': match.end(),
                'ours': match.group(1),
                'theirs': match.group(2)
            })
        
        return conflicts
    
    def _merge_package_dependencies(self, ours: str, theirs: str) -> str:
        """合并package.json依赖项"""
        try:
            # 尝试解析为依赖对象
            ours_deps = self._parse_dependencies(ours)
            theirs_deps = self._parse_dependencies(theirs)
            
            if ours_deps is None or theirs_deps is None:
                # 解析失败，使用简单策略
                return ours
            
            # 合并依赖，优先使用更新的版本
            merged = {}
            all_keys = set(ours_deps.keys()) | set(theirs_deps.keys())
            
            for key in sorted(all_keys):
                ours_version = ours_deps.get(key)
                theirs_version = theirs_deps.get(key)
                
                if ours_version and theirs_version:
                    # 选择更新的版本
                    merged[key] = self._choose_newer_version(ours_version, theirs_version)
                else:
                    # 只有一边有，直接使用
                    merged[key] = ours_version or theirs_version
            
            # 转换回字符串格式
            lines = []
            for key, value in merged.items():
                lines.append(f'    "{key}": "{value}"')
            
            return ',\n'.join(lines)
            
        except Exception:
            # 出错时返回ours版本
            return ours
    
    def _parse_dependencies(self, deps_str: str) -> Optional[Dict[str, str]]:
        """解析依赖字符串为字典"""
        try:
            # 添加大括号使其成为有效JSON
            json_str = '{' + deps_str + '}'
            return json.loads(json_str)
        except:
            return None
    
    def _choose_newer_version(self, v1: str, v2: str) -> str:
        """选择更新的版本号"""
        # 简单的版本比较，实际项目中可能需要更复杂的逻辑
        def version_key(v):
            # 移除前缀符号并转换为数字元组
            clean_v = re.sub(r'^[~^]', '', v)
            try:
                return tuple(map(int, clean_v.split('.')))
            except:
                return (0, 0, 0)
        
        if version_key(v1) >= version_key(v2):
            return v1
        else:
            return v2
    
    def resolve_cargo_file(self, file_path: str) -> bool:
        """解决Cargo.toml/Cargo.lock冲突"""
        self.log('INFO', f'解决 {file_path} 冲突...')
        
        try:
            # 对于Cargo文件，通常使用ours策略更安全
            subprocess.run(['git', 'checkout', '--ours', file_path], check=True)
            subprocess.run(['git', 'add', file_path], check=True)
            self.log('SUCCESS', f'使用ours策略解决 {file_path}')
            return True
        except subprocess.CalledProcessError:
            self.log('ERROR', f'无法解决 {file_path}')
            return False
    
    def resolve_code_file(self, file_path: str) -> bool:
        """解决代码文件冲突"""
        self.log('INFO', f'解决 {file_path} 冲突，策略: {self.strategy}')
        
        try:
            if self.strategy == "smart":
                return self._smart_resolve(file_path)
            elif self.strategy == "ours":
                subprocess.run(['git', 'checkout', '--ours', file_path], check=True)
            elif self.strategy == "theirs":
                subprocess.run(['git', 'checkout', '--theirs', file_path], check=True)
            elif self.strategy == "union":
                # 尝试union合并
                result = subprocess.run(
                    ['git', 'merge-file', '--union', file_path, file_path, file_path],
                    capture_output=True
                )
                if result.returncode != 0:
                    # union失败，回退到ours
                    subprocess.run(['git', 'checkout', '--ours', file_path], check=True)
            
            subprocess.run(['git', 'add', file_path], check=True)
            self.log('SUCCESS', f'解决 {file_path}')
            return True
            
        except subprocess.CalledProcessError:
            self.log('ERROR', f'无法解决 {file_path}')
            return False
    
    def _smart_resolve(self, file_path: str) -> bool:
        """智能解决冲突"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            conflicts = self._parse_conflicts(content)
            if not conflicts:
                return True
            
            resolved_content = content
            for conflict in reversed(conflicts):
                merged_section = self._smart_merge_conflict(
                    conflict['ours'], conflict['theirs']
                )
                resolved_content = (
                    resolved_content[:conflict['start']] + 
                    merged_section + 
                    resolved_content[conflict['end']:]
                )
            
            # 检查是否还有冲突标记
            if not re.search(r'<<<<<<< HEAD|=======|>>>>>>> ', resolved_content):
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(resolved_content)
                return True
            
            return False
            
        except Exception:
            return False
    
    def _smart_merge_conflict(self, ours: str, theirs: str) -> str:
        """智能合并单个冲突块"""
        # 如果一边为空，选择非空的
        if not ours.strip():
            return theirs
        if not theirs.strip():
            return ours
        
        # 如果内容相同，返回任意一个
        if ours.strip() == theirs.strip():
            return ours
        
        # 如果是简单的添加操作（行数较少），尝试合并
        ours_lines = ours.split('\n')
        theirs_lines = theirs.split('\n')
        
        if len(ours_lines) <= 3 and len(theirs_lines) <= 3:
            # 简单合并
            return ours + '\n' + theirs
        
        # 默认保留ours
        return ours
    
    def resolve_all_conflicts(self) -> Tuple[int, int]:
        """解决所有冲突"""
        conflict_files = self.get_conflict_files()
        
        if not conflict_files:
            self.log('INFO', '没有发现冲突文件')
            return 0, 0
        
        self.log('INFO', f'发现 {len(conflict_files)} 个冲突文件')
        
        for file_path in conflict_files:
            self.log('INFO', f'处理文件: {file_path}')
            
            success = False
            if file_path.endswith('package.json'):
                success = self.resolve_package_json(file_path)
            elif file_path.endswith(('Cargo.toml', 'Cargo.lock')):
                success = self.resolve_cargo_file(file_path)
            elif file_path.endswith(('.json', '.yml', '.yaml')):
                # 配置文件使用保守策略
                success = self.resolve_code_file(file_path)
            else:
                success = self.resolve_code_file(file_path)
            
            if success:
                self.resolved_count += 1
            else:
                self.failed_count += 1
        
        return self.resolved_count, self.failed_count

def main():
    parser = argparse.ArgumentParser(description='智能Git冲突自动合并工具')
    parser.add_argument(
        'strategy', 
        nargs='?', 
        default='smart',
        choices=['smart', 'ours', 'theirs', 'union'],
        help='合并策略 (默认: smart)'
    )
    
    args = parser.parse_args()
    
    # 检查是否在Git仓库中
    try:
        subprocess.run(['git', 'rev-parse', '--git-dir'], 
                      capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("错误: 当前目录不是Git仓库")
        sys.exit(1)
    
    resolver = ConflictResolver(args.strategy)
    resolved, failed = resolver.resolve_all_conflicts()
    
    print(f"\n结果:")
    print(f"✅ 成功解决: {resolved} 个冲突")
    if failed > 0:
        print(f"❌ 需要手动解决: {failed} 个冲突")
        print("运行 'git status' 查看剩余冲突")
    else:
        print("🎉 所有冲突已解决！运行 'git commit' 完成合并")

if __name__ == '__main__':
    main()
