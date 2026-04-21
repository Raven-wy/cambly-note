# Scripts

## extract-lesson.js

单节课数据抓取。在课程详情页（`past-lesson?lessonV2Id=...`）的 DevTools Console 中粘贴运行。

**两阶段运行（必须跑两次才能拿全数据）：**

1. **第一阶段**：切换到"反馈"tab，等 AI 反馈加载完成（约 8-10 秒），粘贴脚本回车
2. **第二阶段**：切换到"语音转文字"tab（须用坐标点击，不能用 JS `.click()`），等 3 秒，按 ↑ 调出上一条命令再回车

脚本会自动检测 lessonId，合并两次的数据（如果 lessonId 一致才合并）。

**输出：**
- `window.__camblyLessonData` — 包含 meta / stats / tutorFeedback / aiCards / transcript / shouldSkip
- `copy(JSON.stringify(window.__camblyLessonData, null, 2))` — 复制到剪贴板

---

## extract-lesson-list.js

课程列表批量抓取。在课程列表页（`past-lessons`）的 Console 中粘贴运行。

**功能：**
- 自动滚动加载全部课程
- 拦截 `window.open` 获取所有 lessonV2Id（操作完毕后自动还原）
- 返回每节课的 `{ lessonId, url }`

**输出：**
- `window.__camblyLessonList` — 数组，每项 `{ lessonId, url }`
- `copy(JSON.stringify(window.__camblyLessonList, null, 2))` — 复制到剪贴板

> ⚠️ 时长 < 30 分钟的过滤由 Claude 在接收到列表后处理，脚本本身返回全量列表。

---

## 同步说明

`extract-lesson.js` 和 `extract-lesson-list.js` 的核心逻辑与 `SKILL.md` 中的内联脚本保持同步。
修改任意一侧时，同步更新另一侧。
