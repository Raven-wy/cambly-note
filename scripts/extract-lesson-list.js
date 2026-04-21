/**
 * Cambly Lesson List Extractor
 *
 * 用法：
 * 1. 登录 Cambly，打开 https://www.cambly.com/en/student/progress/past-lessons
 * 2. 按 F12 → Console，粘贴本文件全部内容回车
 * 3. 脚本会自动滚动加载全部课程，然后拦截 window.open 提取所有 lessonV2Id
 * 4. 结果：console 输出 + window.__camblyLessonList（数组）
 * 5. 复制：copy(JSON.stringify(window.__camblyLessonList, null, 2))
 *
 * 注意：
 * - 此脚本与 SKILL.md 中的列表抓取脚本保持同步
 * - window.open 在 try/finally 中还原，不会影响页面其他功能
 * - 每条记录包含 { lessonId, url, duration }，duration 可能为 null
 */

(async function extractCamblyLessonList() {
  'use strict';

  // ── 找到课程列表的滚动容器 ───────────────────────────────────────
  const scrollable = Array.from(document.querySelectorAll('*')).filter(el => {
    const s = getComputedStyle(el);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll')
           && el.scrollHeight > el.clientHeight + 10;  // +10 避免误匹配微小溢出
  });
  const container = scrollable[scrollable.length - 1];
  if (!container) {
    console.error('⚠️ 找不到滚动容器，请确认在 past-lessons 页面');
    return null;
  }

  // ── 滚动到底部加载全部课程 ───────────────────────────────────────
  let prevHeight = -1;
  let attempts   = 0;
  while (container.scrollHeight !== prevHeight && attempts < 30) {
    prevHeight = container.scrollHeight;
    container.scrollTop = container.scrollHeight;
    await new Promise(r => setTimeout(r, 1200));
    attempts++;
  }

  // ── 拦截 window.open，同时记录触发 click 的卡片（保持 URL 与卡片一一对应）──
  // 注意：此处临时替换 window.open，操作完毕后立即还原
  const captured = [];          // [{ url, cardText }]
  const origOpen = window.open;
  window.open = (url) => {
    if (url) captured.push({ url: String(url), cardText: _currentCard?.innerText ?? '' });
    return null;
  };

  let _currentCard = null;
  try {
    document.querySelectorAll('div[role="button"][tabindex="0"]').forEach(card => {
      if (/202\d/.test(card.innerText ?? '')) {
        _currentCard = card;
        card.click();
      }
    });
  } finally {
    window.open = origOpen;   // 无论如何都还原，防止影响页面其他功能
    _currentCard = null;
  }

  // ── 解析 lessonId 及基础元数据 ───────────────────────────────────
  const lessons = captured
    .map(({ url, cardText }) => {
      const idMatch  = url.match(/lessonV2Id=([^&]+)/);
      if (!idMatch) return null;
      const durMatch = cardText.match(/(\d{1,3})\s*(?:分钟|minutes?)/i);
      return {
        lessonId: idMatch[1],
        url,
        duration: durMatch ? parseInt(durMatch[1]) : null,
      };
    })
    .filter(Boolean);

  window.__camblyLessonList = lessons;

  console.log(`%c✅ Found ${lessons.length} lessons`, 'color:#4caf50;font-weight:bold');
  console.log('%c💡 Copy:%c copy(JSON.stringify(window.__camblyLessonList, null, 2))',
    'color:#2196f3;font-weight:bold', 'color:#ff9800');

  return lessons;
})();
