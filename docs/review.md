## reviews 表设计方案

### 一、业务背景与定位

- **练习 / 考试模块**
  - 题目来源包括：模拟题（`mock_bank`）和真题（`real_papers`）。
  - 用户在题目页面可进行“收藏”，并在提交答案后记录其作答结果。
  - 收藏状态与“当前用户 + 当前题目”关联。

- **复习模块**
  - 按科目展示当前用户收藏的题目。
  - 需展示：题目完整信息、用户最新一次选择结果、正确答案、解析等。
  - 需要统计：总体收藏数量、各科目收藏数量。

为此，新建 `reviews` 集合，用于承载“用户与题目的收藏关系 + 最新作答快照”。

---

### 二、题目定位规则

在 `reviews` 中，一条记录的业务唯一身份由以下组合确定：

> **`userId + subjectId + sourceType + paperId + questionId`**

- **`userId`**：`users._id`，逻辑用户主键。
- **`subjectId`**：科目编号，字符串形式 `01`～`05`，与 `mock_bank.subjectId`、`real_papers.subjectId` 一致。
- **`sourceType`**：题目来源类型：
  - `'mock'`：模拟题，来自 `mock_bank` 集合；
  - `'real'`：真题，来自 `real_papers` 集合。
- **`paperId`**：
  - 当 `sourceType='real'`：为 `real_papers._id`（真题试卷 ID）；
  - 当 `sourceType='mock'`：固定为 `null`（不参与模拟题查题逻辑，仅参与唯一键组合）。
- **`questionId`**：题目在对应试卷 / 题库内部的 ID，例如 `'q1'`，对应：
  - `mock_bank.questions[*].id`；
  - `real_papers.questions[*].id`。

#### 题目详情回查规则

- 当 `sourceType='mock'`：
  - 使用 `subjectId` 到 `mock_bank` 中定位文档：
    - `mock_bank.where({ subjectId }).limit(1)`；
  - 在其 `questions` 数组中按 `id === questionId` 查找具体题目。

- 当 `sourceType='real'`：
  - 使用 `paperId` 到 `real_papers` 中定位文档：
    - `real_papers.doc(paperId).get()`；
  - 在其 `questions` 数组中按 `id === questionId` 查找具体题目。

---

### 三、与现有集合的字段关系

#### 1. users 集合

- `_id`：用户文档 ID（本方案中的 `userId`）。
- `_openid`：微信 openid，仅用于登录鉴权。
- 其余字段（`inviteCode`、`profile` 等）与本方案无直接耦合。

#### 2. mock_bank 集合（模拟题库）

- `_id`：文档 ID。
- `subjectId`：`01`～`05`，与卷一～卷五对应。
- `name` / `fullName`：卷名与全称。
- `questionCount`：题目数量。
- `durationMinutes`：考试时长。
- `questions`：题目数组，每项结构（由 `paper_importFromJson` 统一）：
  - `id`：题目 ID，如 `'q1'`，在「该科目模拟题库」内唯一。
  - `type`：题型，目前为 `'single'`。
  - `content` / `text`：题干。
  - `options`：选项对象 `{ A: '...', B: '...', ... }`。
  - `correctAnswer`：正确答案，例如 `'A'`。
  - `explanation`：中文解析。
  - `score`：分值，默认 10。

#### 3. real_papers 集合（真题）

- `_id`：真题试卷 ID（本方案中的 `paperId`，当 `sourceType='real'`）。
- `subjectId`：科目 ID，`01`～`05`。
- `name` / `fullName` / `title`：试卷名称信息。
- `questionCount`、`durationMinutes`：题数与时长。
- `questions`：题目数组，结构与 `mock_bank.questions` 一致：
  - `id`、`type`、`content`/`text`、`options`、`correctAnswer`、`explanation`、`score`。

---

### 四、reviews 集合字段设计

`reviews` 用于记录：

- 用户与题目的收藏关系；
- 用户最新一次作答及其正确性判断；
- 必要的题目展示快照，支撑复习模块。

#### 1. 标识与关联字段

- **`_id`**：string  
  文档主键，由数据库自动生成。

- **`userId`**：string  
  对应 `users._id`，代表当前用户。

- **`subjectId`**：string  
  科目编号，字符串形式的 `01`～`05`，与题库保持一致。

- **`sourceType`**：string  
  题目来源类型：
  - `'mock'`：来自 `mock_bank`；
  - `'real'`：来自 `real_papers`。

- **`paperId`**：string | null  
  - `sourceType='real'`：`real_papers._id`；
  - `sourceType='mock'`：`null`。

- **`questionId`**：string  
  题目在对应试卷 / 题库中的 ID（如 `'q1'`）。

> **逻辑唯一约束**：  
> 对于同一个用户，同一题目在 `reviews` 中只能有一条记录：  
> `(userId, subjectId, sourceType, paperId, questionId)` 唯一。

---

#### 2. 收藏状态与时间

- **`status`**：string  
  收藏状态：
  - `'favorited'`：已收藏；
  - `'unfavorited'`：已取消收藏（保留历史记录）。

- **`createdAt`**：Date  
  记录创建时间，通常为用户首次收藏该题时的时间。

- **`updatedAt`**：Date  
  最近一次更新该记录的时间（包括收藏 / 取消收藏 / 更新作答）。

---

#### 3. 作答信息（最新结果）

- **`lastAnswer`**：string | string[] | null  
  用户**最新一次**提交的答案：
  - 单选题：`"A"`；
  - 多选题：`["A", "C"]` 等；
  - 判断题等其他类型，可根据题型约定具体值。

- **`correctAnswer`**：string | string[] | null  
  当时标准答案的快照，来自题库中的 `correctAnswer` 字段。  
  即使题库后续调整答案，这里仍能保留用户当时作答时对应的标准答案。

- **`isCorrect`**：boolean | null  
  用户最新一次作答是否正确：
  - `true`：最新作答正确；
  - `false`：最新作答错误；
  - `null`：尚未作答或无有效记录。

- **`lastAnsweredAt`**：Date | null  
  用户最近一次提交本题答案的时间。

---

#### 4. 题目展示快照（可选但推荐）

为支持复习模块在不依赖题库当前状态的情况下展示题目内容，`reviews` 中可以冗余一份题目快照：

- **`questionSnapshot`**：object | null  
  建议结构：

  ```json
  {
    "content": "题干文本",
    "text": "题干文本（可与 content 相同）",
    "options": {
      "A": "选项A文本",
      "B": "选项B文本",
      "C": "选项C文本",
      "D": "选项D文本"
    },
    "correctAnswer": "A",
    "explanation": "中文解析",
    "explanationEn": "英文解析（可选）",
    "type": "single",
    "score": 10
  }
  ```

  - 存储时可从 `mock_bank` / `real_papers` 的对应题目字段拷贝；
  - 复习页面优先使用该快照，可减少对题库表的实时查询；
  - 即使题库被修改或删除，用户仍可以看到当时的题目与解析。

- **`paperTitle`**：string | null  
  复习时显示所属试卷名称（可选）：
  - 模拟：来自 `mock_bank.fullName` 或 `mock_bank.name`；
  - 真题：来自 `real_papers.title`。

---

### 五、典型业务流程与 reviews 的使用

#### 1. 用户在练习 / 考试页点击收藏

前端可提供：

- `subjectId`：科目 ID；
- `sourceType`：`'mock'` 或 `'real'`；
- `paperId`：当真题时为试卷 ID，当模拟题时为 `null`；
- `questionId`：题目 ID；
- 当前题目的内容（用于构造 `questionSnapshot`，可选）；
- 如本次操作伴随答题提交，则同时传入 `userAnswer`。

云函数逻辑：

1. 通过当前 `_openid` 查 `users` 集合，获取 `userId = users._id`。
2. 在 `reviews` 中以 `(userId, subjectId, sourceType, paperId, questionId)` 查询记录：
   - 若不存在：创建新文档；
   - 若存在：更新原记录。
3. 更新字段：
   - `status = 'favorited'`；
   - `createdAt`（首次创建）或 `updatedAt`（更新时重置）；
   - `lastAnswer`、`correctAnswer`、`isCorrect`、`lastAnsweredAt`（若有答题数据）；
   - `questionSnapshot`、`paperTitle`（建议首次创建或内容变化时同步）。

#### 2. 用户在复习模块中取消收藏

前端提供题目定位信息（`subjectId`、`sourceType`、`paperId`、`questionId`）和用户身份（通过登录态获取 `userId`）。

云函数在 `reviews` 中：

- 查找对应记录；
- 将 `status` 更新为 `'unfavorited'`，刷新 `updatedAt`。

备注：保留记录便于未来的数据统计与行为分析；若有强需求，也可考虑物理删除，但不推荐。

#### 3. 复习列表页（按科目展示收藏数量）

复习列表页需要按科目展示“已收藏题目数量”。  
后端可通过 `reviews` 实现：

- 统计某用户整体收藏数量：
  - `count({ userId, status: 'favorited' })`。
- 统计某用户某科目收藏数量：
  - `count({ userId, subjectId, status: 'favorited' })`。

前端将 `subjectId` 与固定的科目配置（卷名、全称）组合，即可渲染出列表：

- `id`：`subjectId`；
- `name` / `fullName`：本地常量或由后端返回；
- `collected`：对应科目收藏数量。

#### 4. 复习做题页（按科目加载收藏题目列表）

进入某科目复习时，云函数可：

1. 查询当前用户在该科目下的所有收藏：
   - `reviews.where({ userId, subjectId, status: 'favorited' })`。
2. 对每条记录构造前端题目对象：
   - 题目内容：优先使用 `questionSnapshot`；
   - 若 `questionSnapshot` 为空，再通过 `subjectId + sourceType + paperId + questionId` 去题库查询：
     - 模拟：`mock_bank` 按 `subjectId` 定位文档，在 `questions` 中按 `questionId` 查题；
     - 真题：`real_papers.doc(paperId)` 后在 `questions` 中按 `questionId` 查题。
   - 用户选择：来自 `lastAnswer`；
   - 正确答案：来自 `correctAnswer`；
   - 解析：来自 `questionSnapshot.explanation` / `explanationEn`。
3. 将题目数组与题目数量返回给前端，前端在页面中按索引逐题展示。

---

### 六、小结

- `reviews` 集合以 `userId` 为用户主维度，以 `subjectId + sourceType + paperId + questionId` 精确定位题目。
- 通过 `status` 字段区分“已收藏 / 已取消收藏”，支持复习模块展示与后台运营分析。
- 通过 `lastAnswer`、`correctAnswer`、`isCorrect`、`lastAnsweredAt` 等字段记录最新作答结果。
- 通过 `questionSnapshot` 和 `paperTitle` 冗余题目信息，既能支撑当前复习 UI，又对题库变动具有一定容错性。

