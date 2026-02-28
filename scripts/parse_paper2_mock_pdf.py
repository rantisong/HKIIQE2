#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 试卷二 mock PDF（卷二：一般保险模拟试题）
结构：题目与答案分开。题目区：编号 + 选项 A/B/C/D，题干在选项块之后成批出现。答案区：编号 答案 参考章节
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

def parse_question_section(lines, start, end):
    """提取选项块 (num, opts) 和题干行。题干可能跨行，以：或？结尾的为独立题干。"""
    blocks = []
    text_lines = []
    i = start
    while i < end:
        L = lines[i].strip()
        if re.match(r'^\d+$', L):
            num = int(L)
            opts = {}
            for letter in ['A', 'B', 'C', 'D']:
                i += 1
                if i < end and re.match(r'^[A-D]\s', lines[i].strip()):
                    opts[letter] = re.sub(r'^[A-D]\s*', '', lines[i].strip())
            if len(opts) == 4:
                blocks.append((num, opts))
        else:
            if L and not re.match(r'^編號', L) and not re.match(r'^第[一二三四五六七八九十]+章', L) and not re.match(r'^卷二\s', L):
                text_lines.append(L)
        i += 1
    merged = []
    buf = []
    for line in text_lines:
        if buf and re.match(r'^[這種該此其是而或及以與\(]', line) and not re.match(r'.*[：？?。]$', buf[-1]):
            buf.append(line)
        else:
            if buf:
                merged.append(' '.join(buf))
                buf = []
            buf = [line]
    if buf:
        merged.append(' '.join(buf))
    texts = merged[:len(blocks)]
    opts_by_num = {n: o for n, o in blocks}
    texts_by_num = {}
    for j, (n, _) in enumerate(blocks):
        if j < len(texts):
            texts_by_num[n] = texts[j]
        else:
            texts_by_num[n] = f'题目 {n}'
    return blocks, texts_by_num

def parse_answer_section(lines, start, end):
    answers = {}
    i = start
    while i < end:
        L = lines[i].strip()
        m = re.match(r'^(\d+)\s+([A-D])\s', L)
        if m:
            num, ans = int(m.group(1)), m.group(2)
            answers[num] = ans
        i += 1
    return answers

def main():
    try:
        from pypdf import PdfReader
    except ImportError:
        print('请安装: pip install pypdf', file=sys.stderr)
        sys.exit(1)
    path = sys.argv[1] if len(sys.argv) > 1 else '/Users/lanyangyang/Desktop/papers/试卷二/试卷二：mock.pdf'
    if not os.path.isfile(path):
        print('文件不存在:', path, file=sys.stderr)
        sys.exit(1)
    lines = extract_text(path)
    ans_headers = [i for i, L in enumerate(lines) if '編號' in L and '答案' in L and '參考章節' in L]
    ch_headers = [i for i, L in enumerate(lines) if re.match(r'^第[一二三四五六七八九十]+章', L.strip()) and i < ans_headers[0]]
    ch_headers = [0] + sorted(ch_headers)
    all_questions = []
    global_idx = 0
    for ch_i, ch_start in enumerate(ch_headers):
        ch_end = ch_headers[ch_i + 1] if ch_i + 1 < len(ch_headers) else ans_headers[0]
        ans_idx = ch_i - 1
        if ans_idx < 0:
            continue
        ans_start = ans_headers[ans_idx] + 1
        ans_end = ans_headers[ans_idx + 1] if ans_idx + 1 < len(ans_headers) else len(lines)
        blocks, texts_by_num = parse_question_section(lines, ch_start, ch_end)
        answers = parse_answer_section(lines, ans_start, ans_end)
        for num, opts in blocks:
            global_idx += 1
            text = texts_by_num.get(num, f'题目 {num}')
            ans = answers.get(num, 'A')
            all_questions.append({
                'id': f'q{global_idx}',
                'type': 'single',
                'content': text,
                'options': opts,
                'correctAnswer': ans,
                'explanation': '',
                'score': 10
            })
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(base_dir, 'docs', '试卷二mock_import.json')
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    out = {
        'paperType': 'mock',
        'subjectId': '02',
        'name': '卷二',
        'fullName': '一般保险',
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
