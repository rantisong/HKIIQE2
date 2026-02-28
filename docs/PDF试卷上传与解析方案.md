# PDF 试卷上传与解析方案（设计稿）

## 一、试卷类型与业务含义

| 类型         | 说明                     | 典型来源     | 使用方式                     |
|--------------|--------------------------|--------------|------------------------------|
| **模拟题库** | 按科目（卷一～卷五）的题池 | 各科汇总 PDF | 随机抽取 N 题组成一次模拟考   |
| **每月真题** | 某次真实考试的完整试卷   | 当月/历史真题 PDF | 固定题目，整份试卷作答 |

---

## 二、云存储目录规范（微信云开发）

建议在云存储中按类型、科目、时间划分，便于管理和触发解析：

```
papers/
├── mock/                    # 模拟题库（按科目）
│   ├── 01-保险原理及实务.pdf
│   ├── 02-一般保险.pdf
│   ├── 03-长期保险.pdf
│   ├── 04-强制性公积金计划.pdf
│   └── 05-投资相连长期保险.pdf
└── real/                    # 每月考试真题
    ├── 2026-02.pdf
    ├── 2026-01.pdf
    └── 2025-12.pdf
```

- **模拟题库**：每个 PDF 对应一个科目，解析后得到该科目的「题库」（一大份题目列表）。
- **每月真题**：每个 PDF 对应一份完整试卷，解析后得到一份「试卷」（题目数量固定、顺序固定）。

上传方式可以是：
- 微信开发者工具 → 云开发 → 云存储 → 手动上传；
- 或小程序内管理员页面上传（需鉴权）。

---

## 三、小程序/数据库中的数据格式

模拟题与真题**分集合存储**，互不混用。

### 3.1 集合：`mock_bank`（模拟题库）

仅存模拟题，按科目一条记录（subjectId 01～05），用于随机抽题：

| 字段             | 类型   | 说明 |
|------------------|--------|------|
| `_id`            | string | 自动生成 |
| `subjectId`      | string | 如 `"01"`～`"05"`，对应卷一～卷五 |
| `name` / `fullName` | string | 展示名称、全称 |
| `questionCount`  | number | 单次随机抽题数量（如 75） |
| `durationMinutes`| number | 考试时长（分钟） |
| `questions`      | array  | 该科目题池，随机抽题时不写入真题集合 |
| `updatedAt`      | Date   | 更新时间 |

### 3.2 集合：`real_papers`（真题列表）

每次导入真题产生一条记录，仅存真题：

| 字段             | 类型   | 说明 |
|------------------|--------|------|
| `_id`            | string | 自动生成 |
| `name` / `fullName` / `title` | string | 试卷名称、标题 |
| `questionCount`  | number | 题目数量 |
| `durationMinutes`| number | 考试时长（分钟） |
| `questions`      | array  | 该份真题的题目列表（固定顺序） |
| `createdAt` / `updatedAt` | Date | 创建/更新时间 |

- **随机模拟**：从 `mock_bank` 按科目取题池，前端随机抽取 N 题，**不在 `real_papers` 中新建任何记录**。
- **真题列表**：仅来自用户导入，每次导入在 `real_papers` 中新增或覆盖一条。

### 3.3 题目结构：`questions[]`

与现有 `database-schema.json` 及考试页使用的格式对齐。**选项在数据库中用对象存储**，与现有 MOCK_QUESTIONS 的 `options` 一致，便于考试页 `Object.entries(q.options)` 使用：

```json
{
  "id": "q1",
  "type": "single",
  "content": "题目题干文本",
  "options": {
    "A": "选项A文本",
    "B": "选项B文本",
    "C": "选项C文本",
    "D": "选项D文本"
  },
  "correctAnswer": "B",
  "explanation": "答案解析（可选）",
  "score": 10
}
```

- **单选**：`type: "single"`，`correctAnswer` 为 `"A"`～`"D"` 之一。
- **多选**：`type: "multiple"`，`correctAnswer` 为 `"A,B"` 或 `"A,B,C"` 等，解析时需按逗号拆分。
- 若 PDF 中无解析，`explanation` 可留空或默认空字符串。

解析脚本/云函数的输出需转换为上述结构后再写入 `papers.questions`。

---

## 四、PDF 解析与写入流程

### 4.1 解析方式选型

| 方案 | 优点 | 缺点 | 建议 |
|------|------|------|------|
| **A. 云函数内解析** | 全在云端，与存储同环境 | 需在云函数中集成 PDF 库（如 pdf-parse），依赖与包体积较大；PDF 版式各异，通用解析不稳定 | 适合 PDF 版式**高度统一**且可约定模板时 |
| **B. 线下解析 + JSON 上传** | 解析逻辑可复杂、可人工校对；格式完全可控 | 需本地脚本或工具；多一步「导出 JSON」 | 推荐：先保证数据正确，再考虑自动化 |
| **C. 混合** | 真题用 A，题库用 B 等 | 维护两套流程 | 可按阶段采用：先 B 跑通，再对固定版式 PDF 试 A |

**建议**：  
- **第一阶段**：采用 **B**。约定「小程序/系统」使用的试卷与题目格式（即第三节），由你在本地用 Python/Node 等从 PDF 解析出 JSON，再通过「上传 JSON 到云存储 + 云函数写入 DB」或「管理后台上传 JSON」写入 `papers`。  
- **第二阶段**：若 PDF 版式固定（例如同一模板的真题），再在云函数内用 **A** 做「从 PDF 直接解析并写入 DB」的自动化。

### 4.2 推荐实施流程（以 B 为主）

1. **约定 PDF 与解析规则**  
   - 模拟题库：每个科目一个 PDF，内部结构尽量统一（如：题号、题干、A/B/C/D、答案区）。  
   - 每月真题：每份 PDF 一份试卷，结构一致。  
   - 可先做 1～2 份样例 PDF，写出解析规则或脚本，输出为第三节的 `questions` 数组（及 `name`、`fullName`、`questionCount`、`durationMinutes` 等）。

2. **云存储**  
   - 按第二节规范上传：  
     - 模拟题库 → `papers/mock/xx-科目名.pdf`  
     - 真题 → `papers/real/YYYY-MM.pdf`  
   - 若采用 B，可同时上传解析好的 JSON（如 `papers/mock/01-保险原理及实务.json`），便于云函数只做「读 JSON → 写 DB」。

3. **云函数：解析或导入**  
   - **若用 B（JSON 导入）**：  
     - 云函数 `paper_importFromJson`：入参为云存储 fileId（或 JSON 内容），校验格式后写入/更新 `papers`（含 `paperType`、`subjectId`、`questions` 等）。  
   - **若用 A（PDF 直解）**：  
     - 云函数内下载 PDF，用 pdf-parse 等提取文本，再按约定规则拆成题目、选项、答案，转成上述 `questions` 结构后写入 `papers`。  
   - 写入时统一补充：`createdAt`、`updatedAt`，可选 `sourceFileId`。

4. **去重与覆盖策略**  
   - **模拟题库**：按 `paperType === 'mock'` + `subjectId` 唯一，新导入时**覆盖**同科目旧数据（或先查再 update）。  
   - **每月真题**：按 `paperType === 'real'` + 名称/时间唯一（如 `name: '2026年2月真题'`），新导入覆盖或新增由你定。

5. **小程序端**  
   - 练习页/试卷选择页：  
     - 模拟考试：从 `papers` 中取 `paperType === 'mock'`，按 `subjectId` 与现有「卷一～卷五」对应；做题时按该文档的 `questions` 随机抽 `questionCount` 题。  
   - 真题：取 `paperType === 'real'` 列表，进入某份试卷后直接使用该文档的 `questions` 顺序做题。  
   - 现有「考试科目」「试卷选择」等接口需支持按 `paperType`、`category` 筛选（若当前未区分，可在此方案实施时一并加上）。

---

## 五、与现有逻辑的衔接

- **练习页**：当前使用本地 `PAPERS`（卷一～卷五）展示科目；可改为从云 `getPaperList` 拉取 `paperType === 'mock'` 的列表，无数据时仍回退到本地 `PAPERS`。  
- **试卷选择页**：  
  - 当前科目（来自 `selectedPaper`）下，可展示：  
    - 一条「随机抽题练习」（用该科目 mock 题库）；  
    - 列表为「每月真题」（`paperType === 'real'`，可按时间排序）。  
- **考试页/答题页**：题目结构已按「题干 + options 对象 + correctAnswer」使用，只要写入 `papers.questions` 的格式与第三节一致，即可复用现有答题与提交逻辑。  
- **统计**：继续使用现有「完成次数、通过次数、通过率」逻辑，无需因 PDF 来源而改动。

---

## 六、实施步骤小结（供你确认后执行）

1. **确认数据格式**：确认第三节的 `papers` 文档结构及 `questions[]` 格式（含 `options` 为对象、`correctAnswer` 单选/多选约定）与现有前端、云函数一致，并补充 `paperType`、`subjectId` 等字段。  
2. **确认解析方式**：先采用「线下解析 PDF → 生成 JSON」，再上传 JSON 到云存储并由云函数导入 DB；是否后续做「云函数直解 PDF」可第二阶段再定。  
3. **云存储**：在云开发控制台创建 `papers/mock`、`papers/real`，并约定命名规则（如上）。  
4. **云函数**：新增 `paper_importFromJson`（及可选 `paper_importFromPdf`），实现「读 JSON/PDF → 校验 → 写入/更新 papers」。  
5. **小程序**：  
   - 拉取试卷列表时按 `paperType`、`subjectId` 区分模拟题库与真题；  
   - 模拟考试从对应 mock 文档的 `questions` 中随机抽题；真题直接使用对应 real 文档的 `questions`。  

---

## 七、实施完成说明（已实施）

1. **云函数 `paper_importFromJson`**：已创建，支持 `fileId`（云存储 JSON 文件 ID）或 `content`（直接传入 JSON 对象）两种方式导入。
2. **云函数 `exam_getPaperList`**：已扩展支持 `paperType`、`subjectId` 筛选。
3. **小程序**：练习页、试卷选择页、考试页已按新流程改造，支持云端模拟题库与真题。
4. **示例 JSON**：`docs/试卷JSON导入示例.json`、`docs/真题JSON导入示例.json`。

**导入方式**：在微信开发者工具中调用云函数 `paper_importFromJson`，传入：
- `content`：试卷 JSON 对象（推荐，可直接粘贴）
- 或 `fileId`：云存储中 JSON 文件的 fileID
