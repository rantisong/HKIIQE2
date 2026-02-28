#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 mock 题库 JSON 导出为 Excel，便于手动修正题干等数据。
修正后可运行 excel_to_mock_json.py 转回 JSON 导入。
"""
import json
import sys
import os

def export_to_excel(json_path, excel_path=None):
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.isfile(json_path):
        json_path = os.path.join(base, 'docs', json_path)
    if not os.path.isfile(json_path):
        raise FileNotFoundError('JSON 文件不存在: ' + json_path)
    excel_path = excel_path or json_path.replace('.json', '.xlsx')
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    questions = data.get('questions', [])
    rows = []
    for q in questions:
        opts = q.get('options', {})
        rows.append({
            'id': q.get('id', ''),
            'content': q.get('content', ''),
            'option_A': opts.get('A', ''),
            'option_B': opts.get('B', ''),
            'option_C': opts.get('C', ''),
            'option_D': opts.get('D', ''),
            'correctAnswer': q.get('correctAnswer', ''),
            'explanation': q.get('explanation', ''),
        })
    import pandas as pd
    df = pd.DataFrame(rows)
    df.to_excel(excel_path, index=False, engine='openpyxl')
    print('已导出 %d 题 -> %s' % (len(rows), excel_path))
    return excel_path

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else '试卷四mock_import.json'
    export_to_excel(name)
