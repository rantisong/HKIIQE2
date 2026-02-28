#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 试卷二 mock Word（试卷二：mock.docx）
题目与答案在同一文档，答案区含「答案選 X」或「N」「X」格式。需正确匹配题目与答案。
"""
import re
import json
import sys
import os
import zipfile
import xml.etree.ElementTree as ET


def extract_paragraphs(docx_path):
    """从 docx 提取段落文本"""
    with zipfile.ZipFile(docx_path, 'r') as z:
        xml_content = z.read('word/document.xml').decode('utf-8')

    def get_para_text(p):
        texts = []
        for t in p.iter():
            if t.tag.endswith('}t') and t.text:
                texts.append(t.text)
        return ''.join(texts).strip()

    root = ET.fromstring(xml_content)
    paras = []
    for p in root.iter():
        if p.tag.endswith('}p'):
            t = get_para_text(p)
            if t:
                paras.append(t)
    return paras


def parse_questions(paras):
    """解析题目区：编号 + 题干 + A/B/C/D 选项"""
    # 题目区：从「編號 題目」后到第一个「模擬試題答案」
    start = 0
    for i, p in enumerate(paras):
        if '編號' in p and '題目' in p:
            start = i + 1
            break
    end = len(paras)
    for i, p in enumerate(paras):
        if '模擬試題答案' in p and i > start:
            end = i
            break

    questions = []
    i = start
    while i < end:
        line = paras[i]
        # 匹配 "N          question" 或 "N         question"
        m = re.match(r'^(\d+)\s{2,}(.+)$', line)
        if m:
            num = int(m.group(1))
            content = m.group(2).strip()
            opts = {}
            # 下一行可能是 A，或题干续行
            i += 1
            while i < end:
                L = paras[i]
                if re.match(r'^[A-D]\s+', L):
                    for letter in ['A', 'B', 'C', 'D']:
                        if re.match(r'^' + letter + r'\s+', L):
                            opts[letter] = re.sub(r'^[A-D]\s*', '', L).strip()
                            i += 1
                            break
                    if len(opts) == 4:
                        break
                elif re.match(r'^[A-D]\s*$', L) and i + 1 < end:
                    letter = L.strip()
                    opts[letter] = paras[i + 1].strip()
                    i += 2
                else:
                    # 题干续行
                    if not re.match(r'^\d+\s', L) and content and not opts:
                        content += ' ' + L
                        i += 1
                    else:
                        break
            if len(opts) == 4:
                questions.append((num, content, opts))
            i -= 1  # 回退，下一轮会 +1
        i += 1
    return questions


def parse_questions_v2(paras):
    """解析题目：逐行扫描，遇到 N + 空格 + 题干 则开始一题，随后 4 行 A/B/C/D"""
    start = 0
    for i, p in enumerate(paras):
        if '編號' in p and '題目' in p:
            start = i + 1
            break
    end = len(paras)
    for i, p in enumerate(paras):
        if '模擬試題答案' in p and i > start:
            end = i
            break

    questions = []
    i = start
    while i < end:
        line = paras[i]
        # 匹配 "N  content" (2+ spaces) 或 "Ncontent" (如 10有些)
        m = re.match(r'^(\d+)(?:\s{2,}|)(.+)$', line)
        if m and len(m.group(2).strip()) > 2:
            num = int(m.group(1))
            content = m.group(2).strip()
            i += 1
            opts = {}
            # 收集 A B C D，允许题干续行
            while i < end and len(opts) < 4:
                L = paras[i]
                mobj = re.match(r'^([A-D])\s*(.*)$', L)
                if mobj:
                    opts[mobj.group(1)] = mobj.group(2).strip()
                    i += 1
                elif not opts and content and not re.match(r'^\d+\s', L):
                    # 题干续行
                    content += ' ' + L
                    i += 1
                else:
                    break
            if len(opts) == 4:
                questions.append((num, content, opts))
            continue
        i += 1
    return questions


def parse_answers(paras):
    """解析答案区：仅提取「答案選 X」，按出现顺序，确保与题目一一对应"""
    answers = []
    in_answer = False
    for p in paras:
        if '模擬試題答案' in p:
            in_answer = True
            continue
        if not in_answer:
            continue
        m = re.search(r'答案選\s*([A-D])', p, re.I)
        if m:
            answers.append(m.group(1).upper())
    return answers


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else '/Users/lanyangyang/Desktop/papers/试卷二/试卷二：mock.docx'
    if not os.path.isfile(path):
        print('文件不存在:', path, file=sys.stderr)
        sys.exit(1)
    paras = extract_paragraphs(path)
    questions = parse_questions_v2(paras)
    answers = parse_answers(paras)
    # 按顺序匹配：题目 i 对应 答案 i，只取前 len(questions) 个答案
    answers = answers[:len(questions)]
    all_questions = []
    for idx, (num, content, opts) in enumerate(questions):
        ans = answers[idx] if idx < len(answers) else 'A'
        all_questions.append({
            'id': str(num),
            'type': 'single',
            'content': content,
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
    print('Parsed %d questions, %d answers -> %s' % (len(questions), len(answers), out_path))
    return out_path


if __name__ == '__main__':
    main()
