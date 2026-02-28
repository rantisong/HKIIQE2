#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 Excel 题库转换为 mock 导入 JSON 格式。
支持列：id, content, A/B/C/D（或 option_A~D）, correctAnswer, explanation
用法: python3 excel_to_mock_json.py <excel路径> [输出json路径]
"""
import json
import sys
import os


def clean(s):
    if s is None or (hasattr(s, '__float__') and str(s) == 'nan'):
        return ''
    t = str(s).strip()
    return t.replace('\\n', ' ').replace('\n', ' ')


def excel_to_json(excel_path, json_path=None, subject_id='04', name='卷四', full_name='强积金'):
    if not os.path.isfile(excel_path):
        raise FileNotFoundError('Excel 文件不存在: ' + excel_path)
    import pandas as pd
    df = pd.read_excel(excel_path, engine='openpyxl')
    # 支持 A/B/C/D 或 option_A~D 列名
    def get_opt(row, key):
        return clean(row.get(key) or row.get(f'option_{key}', ''))
    questions = []
    for _, row in df.iterrows():
        content = clean(row.get('content') or row.get('text', ''))
        if not content:
            continue
        opts = {
            'A': get_opt(row, 'A') or '选项A',
            'B': get_opt(row, 'B') or '选项B',
            'C': get_opt(row, 'C') or '选项C',
            'D': get_opt(row, 'D') or '选项D',
        }
        correct = str(row.get('correctAnswer', '')).strip().upper() or 'A'
        questions.append({
            'id': str(row.get('id', '')),
            'type': 'single',
            'content': content,
            'options': opts,
            'correctAnswer': correct,
            'explanation': clean(row.get('explanation', '')),
            'score': 10
        })
    out = {
        'paperType': 'mock',
        'subjectId': subject_id,
        'name': name,
        'fullName': full_name,
        'questionCount': len(questions),
        'durationMinutes': 120,
        'questions': questions
    }
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = json_path or os.path.join(base, 'docs', '试卷四mock_import.json')
    os.makedirs(os.path.dirname(json_path) or '.', exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('已转换 %d 题 -> %s' % (len(questions), json_path))
    return json_path


if __name__ == '__main__':
    excel = sys.argv[1] if len(sys.argv) > 1 else '/Users/lanyangyang/Desktop/papers/试卷四/试卷四：mockQ.xlsx'
    out = sys.argv[2] if len(sys.argv) > 2 else None
    excel_to_json(excel, out)
