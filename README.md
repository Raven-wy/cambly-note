# Cambly Note Skill

把 Cambly 课程记录自动整理成深度课堂笔记的 skill。支持全自动抓取（Puppeteer MCP）、半自动（computer use）、纯手动（console 粘贴）三种模式。

## 功能

- 🎯 从 Cambly 课程记录页面提取：统计指标、AI 语法纠正、教师书面反馈、完整语音转文字
- 📝 生成深度课堂笔记（话题摘要 / 语法纠正 / 专题教学板块 / 地道表达 / 实用词汇 / 反馈）
- 🌍 多语言输出（中文 / English / 日本語 / 한국어 / 其他）
- 🧠 "专题教学板块"根据课程内容动态生成（词缀、介词、词性变化、近义词辨析、面试模拟等）
- ⏭️ 自动跳过时长 < 30 分钟的课程

## 三种使用模式

> 不确定选哪个？直接用 **模式 C**，对任何 Claude 版本都适用。

### 模式 A：全自动（Claude Code + Puppeteer MCP）

Claude 自动导航 Cambly、运行脚本、采集数据，全程无需手动操作浏览器。

**前置条件**：在 `~/.claude/settings.json` 的 `mcpServers` 加入 Puppeteer MCP 配置（见 SKILL.md § 模式 A 安装）。

1. 打开 Claude Code，加载本项目
2. 说："整理我最新一节 Cambly 课"
3. Claude 自动完成全程

### 模式 B：半自动（Claude computer use）

Claude 通过截图和坐标点击操作你本机上的浏览器。你需要已登录 Cambly。

1. 在本机浏览器打开 Cambly 课程记录页面并登录
2. 告诉 Claude："用 computer use 帮我整理最新一节课"
3. Claude 截图、点击、运行脚本，读取结果

### 模式 C：手动引导（推荐新用户，任意 Claude 版本）

无需脚本。在浏览器 DevTools Console 复制页面文本粘给 Claude，Claude 负责所有解析。

1. 登录 Cambly，打开任意一节课详情页，停在"反馈"tab，等 AI 卡片加载完（约 10 秒）
2. 按 F12（Mac：⌥⌘I）→ Console，运行：`copy(document.body.innerText)`
3. 粘贴到 Claude，标注"反馈 tab："
4. 切换到"语音转文字"tab，按 ↑ 回车重新运行，再粘贴给 Claude，标注"转录 tab："
5. Claude 自动整理成笔记

## 目录结构

```
cambly-note/
├── README.md                          ← 使用说明（本文件）
├── SKILL.md                           ← Claude 读取的 skill 规范（核心）
├── scripts/
│   ├── extract-lesson.js              ← 单节课抓取脚本
│   ├── extract-lesson-list.js         ← 课程列表批量抓取
│   └── README.md                      ← 脚本使用说明
├── templates/
│   ├── note-template-zh.md            ← 中文标签对照表
│   ├── note-template-en.md            ← English label reference
│   ├── note-template-ja.md            ← 日本語ラベル参照表
│   └── note-template-ko.md            ← 한국어 레이블 참조표
└── examples/
    └── sample_virtual_lesson.md       ← 虚构示例（非真实学生数据）
```

## 已知限制

- Cambly 域名下**无法下载文件**，笔记只能在聊天中输出
- AI 反馈卡片是懒加载的，新课需要等约 8-10 秒反馈才会加载完成
- 语音转文字较长时需分段读取
- 课程详情页切换 tab 必须用真实鼠标事件（JS `.click()` 无效）

## License

MIT
