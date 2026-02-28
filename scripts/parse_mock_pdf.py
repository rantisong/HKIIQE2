#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""解析任意试卷（卷一～卷五）的 mock PDF，输出可导入 mock_bank 的 JSON。"""
import re
import json
import sys
import os

# 与 constants.js 一致：卷名、全称、题数、时长
SUBJECTS = {
    1: {'name': '卷一', 'fullName': '保险原理及实务', 'questionCount': 75, 'durationMinutes': 120},
    2: {'name': '卷二', 'fullName': '一般保险', 'questionCount': 80, 'durationMinutes': 120},
    3: {'name': '卷三', 'fullName': '长期保险', 'questionCount': 50, 'durationMinutes': 75},
    4: {'name': '卷四', 'fullName': '强制性公积金计划', 'questionCount': 80, 'durationMinutes': 120},
    5: {'name': '卷五', 'fullName': '投资相连长期保险', 'questionCount': 80, 'durationMinutes': 120},
}

def parse_pdf_text(text):
    """题目解析：支持题号 ". 1 1.1" 或 "1." / "1 " 开头；选项 a)b)c)d)；答案 A-D。"""
    lines = text.split('\n')
    questions = []
    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        m = re.match(r'^\.\s+(\d+)\s+([\d.]*)', s)
        if not m:
            m = re.match(r'^(\d+)[\.\s]', s)
        if not m:
            i += 1
            continue
        num = m.group(1)
        i += 1
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
        expl_lines = []
        while i < len(lines):
            L = lines[i].strip()
            if re.match(r'^[A-D]\s*$', L) and len(L) <= 2:
                answer = L[0]
                i += 1
                break
            if L and not re.match(r'^\.\s+\d+', L) and not re.match(r'^\d+[\.\s]', L):
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
    if len(sys.argv) < 2:
        print('用法: python3 parse_mock_pdf.py <mock.pdf> [科目1-5] [输出.json]', file=sys.stderr)
        print('例:  python3 parse_mock_pdf.py 試卷三：mock.pdf 3', file=sys.stderr)
        sys.exit(1)
    pdf_path = os.path.abspath(sys.argv[1])
    if not os.path.isfile(pdf_path):
        print('文件不存在:', pdf_path, file=sys.stderr)
        sys.exit(1)
    subject_num = 3
    if len(sys.argv) > 2:
        try:
            subject_num = int(sys.argv[2])
            if subject_num not in SUBJECTS:
                subject_num = 3
        except ValueError:
            pass
    meta = SUBJECTS[subject_num]
    subject_id = str(subject_num).zfill(2)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_out = os.path.join(base_dir, 'docs', '试卷{}mock_import.json'.format(subject_num))
    out_path = sys.argv[3] if len(sys.argv) > 3 else default_out
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    reader = PdfReader(pdf_path)
    full_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
    questions = parse_pdf_text(full_text)
    out = {
        'paperType': 'mock',
        'subjectId': subject_id,
        'name': meta['name'],
        'fullName': meta['fullName'],
        'questionCount': meta['questionCount'],
        'durationMinutes': meta['durationMinutes'],
        'questions': questions
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Parsed %d questions -> %s (subjectId=%s)' % (len(questions), out_path, subject_id))
    return out_path

if __name__ == '__main__':
    main()
