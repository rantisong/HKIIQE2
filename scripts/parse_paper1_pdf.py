#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""解析 试卷一 mock PDF，输出可导入系统的 JSON。"""
import re
import json
import sys

def parse_pdf_text(text):
    lines = text.split('\n')
    questions = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # 題號行: ". 1 1.1" 或 ". 10 1.2.3"
        m = re.match(r'^\.\s+(\d+)\s+([\d.]*)', line.strip())
        if not m:
            i += 1
            continue
        num = m.group(1)
        section = m.group(2).strip()
        i += 1
        # 题干：直到出现 a)
        q_lines = []
        while i < len(lines):
            L = lines[i].strip()
            if re.match(r'^a\)', L):
                break
            if L:
                q_lines.append(L)
            i += 1
        question_text = '\n'.join(q_lines).strip()
        if not question_text:
            i += 1
            continue
        # 选项 a) b) c) d)（仅取紧接在 a) b) c) d) 后的那一行，避免把解释并入选项）
        opts = {}
        for letter in ['a', 'b', 'c', 'd']:
            if i >= len(lines):
                break
            L = lines[i].strip()
            if re.match(r'^' + letter + r'\)', L):
                val = re.sub(r'^[a-d]\)\s*', '', L).strip()
                i += 1
                opts[letter.upper()] = val
        if len(opts) != 4:
            i += 1
            continue
        # 解释：直到单独一行 A/B/C/D
        expl_lines = []
        while i < len(lines):
            L = lines[i].strip()
            if re.match(r'^[A-D]\s*$', L) and len(L) <= 2:
                answer = L[0]
                i += 1
                break
            if L and not re.match(r'^\.\s+\d+', L):
                expl_lines.append(L)
            i += 1
        else:
            answer = None
        explanation = '\n'.join(expl_lines).strip() if expl_lines else ''
        if not answer:
            continue
        questions.append({
            'id': 'q' + num,
            'type': 'single',
            'content': question_text,
            'options': opts,
            'correctAnswer': answer,
            'explanation': explanation[:500] if explanation else '',
            'score': 10
        })
    return questions

def main():
    try:
        from pypdf import PdfReader
    except ImportError:
        print('请安装: pip install pypdf', file=sys.stderr)
        sys.exit(1)
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else '/Users/lanyangyang/Desktop/papers/试卷一mock.pdf'
    reader = PdfReader(pdf_path)
    full_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
    questions = parse_pdf_text(full_text)
    # 卷一模拟题库：题目可多于 75，系统随机抽 75 题
    out = {
        'paperType': 'mock',
        'subjectId': '01',
        'name': '卷一',
        'fullName': '保险原理及实务',
        'questionCount': 75,
        'durationMinutes': 120,
        'questions': questions
    }
    import os
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(base, 'docs', '试卷一mock_import.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Parsed %d questions -> %s' % (len(questions), out_path))
    return out_path

if __name__ == '__main__':
    main()
