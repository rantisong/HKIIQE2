#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 试卷四 mock PDF（科目四：强积金）
规则：
- mockQ 表格：No.=id, Question=content, Option 1=A, Option 2=B, Option 3=C, Option 4=D, Explanation=explanation
- mockA：第一列=题目编号，第二列=答案 -> correctAnswer
"""
import re
import json
import sys
import os


def extract_text(path):
    from pypdf import PdfReader
    r = PdfReader(path)
    lines = []
    for p in r.pages:
        lines.extend((p.extract_text() or '').replace('\r', '').split('\n'))
    return lines


def parse_answers(lines_a):
    """解析 mockA：第一列=编号，第二列=答案。格式 Q1. A, Q2. D, ..."""
    answers = {}
    for L in lines_a:
        m = re.match(r'Q(\d+)\.\s*([A-D])', L.strip(), re.I)
        if m:
            answers[int(m.group(1))] = m.group(2).upper()
    return answers


def parse_options(opts_str):
    """从选项字符串解析 4 个选项。Option 1->A, Option 2->B, Option 3->C, Option 4->D"""
    opts_str = opts_str.strip()
    if not opts_str:
        return None
    # 移除末尾的 explanation（CH... / 附錄...）
    opts_str = re.sub(r'\s*(?:CH\.?\s*[\d.()a-zA-Z]*|附錄[^\s]*)\s*$', '', opts_str).strip()
    # i, ii 风格
    m = re.search(
        r'(i\s*,\s*ii)\s+(i\s*,\s*iii)\s+(i\s*,\s*ii\s*,\s*iii)\s+(i\s*,\s*ii\s*,\s*iii\s*,\s*iv)',
        opts_str, re.I
    )
    if m:
        return list(m.groups())
    # 双空格分割
    parts = re.split(r'\s{2,}', opts_str)
    if len(parts) >= 4:
        return [p.strip() for p in parts[-4:]]
    # 单空格
    tokens = opts_str.split()
    if len(tokens) == 4:
        return tokens
    # i ii ii, iii ii, iv 风格
    merged = []
    i = 0
    while i < len(tokens):
        if i + 1 < len(tokens) and tokens[i].endswith(','):
            merged.append(tokens[i] + ' ' + tokens[i + 1])
            i += 2
        else:
            merged.append(tokens[i])
            i += 1
    if len(merged) == 4:
        return merged
    # 过滤 explanation 残留后取最后 4 个
    def is_explanation(t):
        return (re.match(r'^CH\.?\s*[\d.]*$', t) or re.match(r'^附錄', t) or
                (re.match(r'^[\d.()a-zA-Z]+$', t) and len(t) < 15))
    valid = [t for t in tokens if not is_explanation(t)]
    if len(valid) >= 4:
        return valid[-4:]
    if len(tokens) >= 4:
        return tokens[-4:]
    return None


def extract_explanation(block_text):
    """从 block 末尾提取 Explanation 列"""
    m = re.search(r'\s+((?:CH\.?\s*[\d.()a-zA-Z]*|附錄[^\s]*))\s*$', block_text)
    return m.group(1).strip() if m else ''


def parse_question_block(block_text):
    """
    解析 mockQ 表格行：No. Title Question Option 1 Option 2 Option 3 Option 4 Explanation
    返回 (no, question, opts, explanation)
    """
    explanation = extract_explanation(block_text)
    # 先移除 explanation 便于解析
    block_clean = re.sub(r'\s*(?:CH\.?\s*[\d.()a-zA-Z]*|附錄[^\s]*)\s*$', '', block_text).strip()
    # 移除开头的 "ChapterRef_Date "（如 5_26012021）
    block_clean = re.sub(r'^[\w\d_]+[\s]*', '', block_clean).strip()
    # Question：到 ？?：: 为止
    m = re.search(r'^(.+?[？?：:])\s*(.*)$', block_clean, re.DOTALL)
    if not m:
        return None, None, explanation
    question = m.group(1).strip()
    opts_str = m.group(2).strip()
    opts = parse_options(opts_str)
    return question, opts, explanation


def main():
    try:
        from pypdf import PdfReader
    except ImportError:
        print('请安装: pip install pypdf', file=sys.stderr)
        sys.exit(1)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    default_q = '/Users/lanyangyang/Desktop/papers/试卷四/试卷四：mockQ.pdf'
    default_a = '/Users/lanyangyang/Desktop/papers/试卷四/试卷四：mockA.pdf'
    path_q = sys.argv[1] if len(sys.argv) > 1 else default_q
    path_a = sys.argv[2] if len(sys.argv) > 2 else default_a
    out_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(base, 'docs', '试卷四mock_import.json')
    if not os.path.isfile(path_q):
        print('题目文件不存在:', path_q, file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(path_a):
        print('答案文件不存在:', path_a, file=sys.stderr)
        sys.exit(1)
    lines_q = extract_text(path_q)
    lines_a = extract_text(path_a)
    answers = parse_answers(lines_a)
    # 题目块：以 "N Paper 4 Chapter" 开头，N 即为 No.
    starts = []
    for i, L in enumerate(lines_q):
        m = re.match(r'^(\d+)\s+Paper\s+4\s+Chapter', L.strip())
        if m:
            starts.append((i, int(m.group(1))))
    all_questions = []
    for idx, (line_idx, no) in enumerate(starts):
        j = starts[idx + 1][0] if idx + 1 < len(starts) else len(lines_q)
        block = ' '.join(lines_q[line_idx + 1:j])
        question, opts, explanation = parse_question_block(block)
        if not question:
            continue
        # correctAnswer 从 mockA 获取，mockA 第一列=题目编号(no)，第二列=答案
        correct_answer = answers.get(no, 'A')
        # Option 1=A, Option 2=B, Option 3=C, Option 4=D
        if opts and len(opts) == 4:
            opts_obj = {'A': opts[0], 'B': opts[1], 'C': opts[2], 'D': opts[3]}
        else:
            opts_obj = {'A': '选项A', 'B': '选项B', 'C': '选项C', 'D': '选项D'}
        all_questions.append({
            'id': str(no),
            'type': 'single',
            'content': question,
            'options': opts_obj,
            'correctAnswer': correct_answer,
            'explanation': explanation or '',
            'score': 10
        })
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    out = {
        'paperType': 'mock',
        'subjectId': '04',
        'name': '卷四',
        'fullName': '强积金',
        'questionCount': len(all_questions),
        'durationMinutes': 120,
        'questions': all_questions
    }
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('Parsed %d questions -> %s' % (len(all_questions), out_path))
    return out_path


if __name__ == '__main__':
    main()
