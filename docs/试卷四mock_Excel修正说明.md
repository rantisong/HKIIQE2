# 试卷四 mock 题库 Excel 修正说明

## 当前状态

- **Excel 文件**：`docs/试卷四mock_import.xlsx`
- **题目数量**：847 题
- **列说明**：
  - `id`：题目编号（勿改）
  - `content`：题干（**请在此列修正不完整的题干**）
  - `option_A` ~ `option_D`：选项
  - `correctAnswer`：正确答案
  - `explanation`：参考章节

## 操作步骤

1. 用 Excel 或 WPS 打开 `试卷四mock_import.xlsx`
2. 在 `content` 列中修正不完整的题干
3. 保存 Excel 文件
4. 运行以下命令转回 JSON：
   ```bash
   python3 scripts/excel_to_mock_json.py docs/试卷四mock_import.xlsx
   ```
5. 生成的 `docs/试卷四mock_import.json` 可通过云函数 `paper_importFromJson` 导入

## 注意事项

- 修改时请勿删除或重命名列标题
- `id`、`correctAnswer` 建议保持原样
- 修正完成后请将 Excel 或 JSON 交回，以便进一步处理
