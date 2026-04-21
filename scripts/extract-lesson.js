/**
 * Cambly Lesson Data Extractor
 *
 * 用法：
 * 1. 登录 Cambly，打开课程详情页（URL: past-lesson?lessonV2Id=...）
 * 2. 切换到"反馈"tab，等 AI 反馈加载完（约 10 秒，能看到语法纠正卡片）
 * 3. F12 → Console → 点代码框右上角复制按钮粘贴，回车
 * 4. 点"语音转文字"tab，按 ↑ 再回车
 * 5. copy(JSON.stringify(window.__camblyLessonData, null, 2))
 */

(function extractCamblyLesson() {
  'use strict';

  var prev    = window.__camblyLessonData;
  var allText = document.body.innerText;
  var lines   = allText.split('\n');

  // ── 找转录区起始位置（切 tab 后才有内容）─────────────────────────
  var tIdx = allText.indexOf('语音转文字\n点击');
  if (tIdx === -1) tIdx = allText.indexOf('Transcript\nClick');
  var statsText = tIdx > -1 ? allText.slice(0, tIdx) : allText;

  // ── 统计数字（用 \s+ 代替 \n，避免正则里出现换行字符）────────────
  function matchNum(text, pats) {
    for (var i = 0; i < pats.length; i++) {
      var r = text.match(pats[i]);
      if (r) return parseInt(r[1]);
    }
    return null;
  }

  var stats = {
    speakingRatio: matchNum(statsText, [/发言时长占比\s+(\d+)%/, /Speaking time\s+(\d+)%/]),
    wpm:           matchNum(statsText, [/每分钟单词数\s+(\d+)/, /Words per minute\s+(\d+)/]),
    uniqueVocab:   matchNum(statsText, [/不重复词汇量\s+(\d+)/, /Unique words\s+(\d+)/]),
    duration:      matchNum(statsText, [/(\d{1,3})\s*分钟/, /(\d{1,3})\s*minutes?/i]),
  };

  // ── 日期 ──────────────────────────────────────────────────────────
  var dm = statsText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        || statsText.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);

  // ── 教师姓名（逐行查"反馈"后的大写姓名行）────────────────────────
  var nameRe = /^[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)+$/;
  var tutor  = null;
  for (var i = 0; i < lines.length - 1; i++) {
    if ((lines[i].trim() === '反馈' || lines[i].trim() === 'Lesson feedback')
        && nameRe.test(lines[i + 1].trim())) {
      tutor = lines[i + 1].trim();
      break;
    }
  }

  var meta = {
    lessonId: new URLSearchParams(location.search).get('lessonV2Id'),
    tutor:    tutor,
    date:     dm ? (dm[1] + '-' + String(dm[2]).padStart(2,'0') + '-' + String(dm[3]).padStart(2,'0')) : null,
    url:      location.href,
  };

  // ── 教师书面反馈 ──────────────────────────────────────────────────
  var tutorFeedback = '';
  var fbA  = allText.indexOf('本次课程反馈');
  var fbB  = allText.indexOf('Lesson feedback');
  var fbIdx = (fbA > -1 && (fbB === -1 || fbA < fbB)) ? fbA : fbB;
  if (fbIdx > -1) {
    var feA   = allText.indexOf('此反馈有帮助吗');
    var feB   = allText.indexOf('Was this feedback helpful');
    var feIdx = (feA > -1 && (feB === -1 || feA < feB)) ? feA : feB;
    tutorFeedback = (feIdx > fbIdx
      ? allText.slice(fbIdx, feIdx)
      : allText.slice(fbIdx, fbIdx + 2000)
    ).trim();
  }

  // ── AI 反馈卡片（逐行解析，不在正则里用 \n）──────────────────────
  var aiCards = [];
  var aiA  = allText.indexOf('查看AI反馈');
  var aiB  = allText.indexOf('View AI feedback');
  var aiIdx = (aiA > -1 && (aiB === -1 || aiA < aiB)) ? aiA : aiB;

  if (aiIdx > -1) {
    var TYPES = ['语法','词汇','其他','发音','流利度','Grammar','Vocabulary','Other','Pronunciation','Fluency'];
    var LABEL_MAP = {
      '您说：':'youSaid',   'You said:':'youSaid',   '您说:':'youSaid',
      '建议：':'suggestion','Suggestion:':'suggestion','建议:':'suggestion',
      '您做得好的地方：':'strength','Strength:':'strength','您做得好的地方:':'strength',
      '知识点：':'point',   'Knowledge point:':'point','知识点:':'point',
    };
    var STOP = ['反馈有误','Report an issue'];

    var aiLines = allText.slice(aiIdx).split('\n');
    var ci = 0;
    while (ci < aiLines.length) {
      var aLine = aiLines[ci].trim();
      if (TYPES.indexOf(aLine) !== -1) {
        var card   = { type: aLine, youSaid: null, suggestion: null, strength: null, point: null };
        var curKey = null;
        var curBuf = [];
        ci++;
        while (ci < aiLines.length && TYPES.indexOf(aiLines[ci].trim()) === -1) {
          var ln = aiLines[ci].trim();
          if (STOP.indexOf(ln) !== -1) { ci++; break; }
          if (LABEL_MAP[ln] !== undefined) {
            if (curKey) { card[curKey] = curBuf.join('\n').trim(); }
            curKey = LABEL_MAP[ln];
            curBuf = [];
          } else if (curKey && ln) {
            curBuf.push(ln);
          }
          ci++;
        }
        if (curKey) { card[curKey] = curBuf.join('\n').trim(); }
        aiCards.push(card);
      } else {
        ci++;
      }
    }
  }

  // ── 转录（切到"语音转文字"tab 后运行才有内容）────────────────────
  var transcript = '';
  if (tIdx > -1) {
    var tSec   = allText.slice(tIdx);
    var tCut   = tSec.indexOf('Privacy Preference Center');
    var tClean = tCut > 0 ? tSec.slice(0, tCut) : tSec;
    transcript = tClean.split('\n').filter(function(l) { return l.trim(); }).slice(2).join('\n');
  }

  // ── 跨 tab 累积（lessonId 一致才合并）────────────────────────────
  if (prev && prev.meta && prev.meta.lessonId === meta.lessonId) {
    if (!tutorFeedback && prev.tutorFeedback)  tutorFeedback = prev.tutorFeedback;
    if (!aiCards.length && prev.aiCards && prev.aiCards.length) {
      Array.prototype.push.apply(aiCards, prev.aiCards);
    }
    if (!transcript && prev.transcript) transcript = prev.transcript;
    for (var sk in stats) {
      if (stats[sk] === null && prev.stats && prev.stats[sk] != null) stats[sk] = prev.stats[sk];
    }
  }

  var shouldSkip = stats.duration !== null && stats.duration < 30;

  window.__camblyLessonData = {
    meta: meta, stats: stats,
    tutorFeedback: tutorFeedback, aiCards: aiCards,
    transcript: transcript, shouldSkip: shouldSkip,
  };

  console.log('[Cambly] lessonId=' + meta.lessonId + ' | cards=' + aiCards.length + ' | transcript=' + transcript.length + ' chars | skip=' + shouldSkip);
  if (!aiCards.length)    console.info('[Cambly] No AI cards — run on feedback tab after ~10s');
  if (!transcript.length) console.info('[Cambly] No transcript — switch to transcript tab and run again');
  if (shouldSkip)         console.warn('[Cambly] Duration < 30 min, will be skipped');
  console.log('[Cambly] Copy: copy(JSON.stringify(window.__camblyLessonData, null, 2))');

  return window.__camblyLessonData;
})();
