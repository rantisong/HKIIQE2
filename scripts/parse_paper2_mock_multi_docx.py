#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 试卷二 四份 mock Word（mock_1 ~ mock_4.docx）
每份：第一部分题目，第二部分答案与解释表格。合并为一份 JSON，id 重新编码。
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
    """解析题目区：从 編號 題目 后到 模擬試題答案"""
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
        m = re.match(r'^(\d+)(?:\s{2,}|)(.+)$', line)
        if m and len(m.group(2).strip()) > 2:
            num = int(m.group(1))
            content = m.group(2).strip()
            i += 1
            opts = {}
            while i < end and len(opts) < 4:
                L = paras[i]
                mobj = re.match(r'^([A-D])\s*(.*)$', L)
                if mobj:
                    opts[mobj.group(1)] = mobj.group(2).strip()
                    i += 1
                elif not opts and content and not re.match(r'^\d+\s', L):
                    content += ' ' + L
                    i += 1
                else:
                    break
            if len(opts) == 4:
                questions.append((num, content, opts))
            continue
        i += 1
    return questions


def parse_answers_and_explanations(paras):
    """
    解析答案区表格：編號 | 答案 | explanation
    每行：数字、A-D、explanation（可跨多行，直到下一个数字行）
    将 explanation 列的全部内容放入 explanation 字段
    """
    answers = []
    explanations = []
    in_answer = False
    i = 0
    while i < len(paras):
        p = paras[i]
        if '模擬試題答案' in p:
            in_answer = True
            i += 1
            continue
        if not in_answer:
            i += 1
            continue
        # 跳过表头
        if p.strip() in ('編號', '答案', 'explanation', '參考章節'):
            i += 1
            continue
        # 表格行：数字 -> 答案 -> explanation(s)
        if re.match(r'^\d+$', p.strip()):
            ans = ''
            expl_parts = []
            i += 1
            if i < len(paras) and re.match(r'^[A-D]$', paras[i].strip()):
                ans = paras[i].strip().upper()
                i += 1
            # 收集 explanation 列的全部内容，直到下一题编号
            while i < len(paras):
                nxt = paras[i]
                if re.match(r'^\d+$', nxt.strip()):
                    break
                if nxt.strip() and nxt.strip() not in ('編號', '答案', 'explanation'):
                    expl_parts.append(nxt.strip())
                i += 1
            expl = ' '.join(expl_parts) if expl_parts else ''
            answers.append(ans)
            explanations.append(expl)
            continue
        # 兼容旧格式：答案選 X ... 參考章節...
        m = re.search(r'答案選\s*([A-D])', p, re.I)
        if m:
            answers.append(m.group(1).upper())
            expl = p.strip()
            if i + 1 < len(paras) and not re.match(r'^\d+$', paras[i + 1].strip()) and not re.match(r'^[A-D]$', paras[i + 1].strip()):
                expl += ' ' + paras[i + 1].strip()
                i += 1
            explanations.append(expl)
        i += 1
    return answers, explanations


def parse_one_docx(docx_path):
    """解析单个 docx，返回 [(content, options, correctAnswer, explanation), ...]"""
    paras = extract_paragraphs(docx_path)
    questions = parse_questions(paras)
    answers, explanations = parse_answers_and_explanations(paras)
    answers = answers[:len(questions)]
    explanations = explanations[:len(questions)]
    out = []
    for idx, (num, content, opts) in enumerate(questions):
        ans = answers[idx] if idx < len(answers) else 'A'
        expl = explanations[idx] if idx < len(explanations) else ''
        out.append({
            'content': content,
            'options': opts,
            'correctAnswer': ans,
            'explanation': expl
        })
    return out


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    docx_dir = '/Users/lanyangyang/Desktop/papers/试卷二'
    if len(sys.argv) > 1:
        docx_dir = os.path.dirname(sys.argv[1]) or docx_dir
    files = [
        os.path.join(docx_dir, '试卷二：mock_1.docx'),
        os.path.join(docx_dir, '试卷二：mock_2.docx'),
        os.path.join(docx_dir, '试卷二：mock_3.docx'),
        os.path.join(docx_dir, '试卷二：mock_4.docx'),
    ]
    all_questions = []
    for path in files:
        if not os.path.isfile(path):
            print('跳过（不存在）:', path, file=sys.stderr)
            continue
        rows = parse_one_docx(path)
        all_questions.extend(rows)
        print('  %s: %d 题' % (os.path.basename(path), len(rows)))
    # 重新编码 id
    for idx, q in enumerate(all_questions):
        q['id'] = str(idx + 1)
        q['type'] = 'single'
        q['score'] = 10
    out_path = os.path.join(base_dir, 'docs', '试卷二mock_import.json')
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
    print('合并共 %d 题 -> %s' % (len(all_questions), out_path))
    return out_path


if __name__ == '__main__':
    main()
