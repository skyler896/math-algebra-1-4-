/* ============================================================
   线性代数与解析几何 · 交互讲义  app.js
   依赖：assets/katex/katex.min.js、data.js（window.DATA）
   ============================================================ */
(function () {
  'use strict';

  const DATA = window.DATA || { meta: {}, chapters: [], items: [] };
  const ITEMS = Array.isArray(DATA.items) ? DATA.items : [];
  const BY_ID = new Map(ITEMS.map(it => [it.id, it]));

  const THEORY_KINDS = ['definition', 'theorem', 'corollary', 'lemma', 'property', 'formula', 'appendix'];
  const PROBLEM_KINDS = ['example', 'exercise', 'thinking', 'advanced'];
  const THEORY_SET = new Set(THEORY_KINDS);
  const PROBLEM_SET = new Set(PROBLEM_KINDS);

  const KIND_NAME = {
    definition: '定义', theorem: '定理', corollary: '推论', lemma: '引理',
    property: '性质', formula: '公式', appendix: '附录',
    example: '例题', exercise: '习题', thinking: '思考题', advanced: '提高题'
  };
  const KIND_ORDER = ['definition', 'theorem', 'corollary', 'lemma', 'property', 'formula', 'appendix',
    'example', 'exercise', 'thinking', 'advanced'];

  const isTheory = it => !!it && THEORY_SET.has(it.kind);
  const isProblem = it => !!it && PROBLEM_SET.has(it.kind);

  /* ---------------- 工具 ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function normLabel(s) {
    return String(s || '').replace(/\s+/g, '').replace(/[—–－−]/g, '-').toLowerCase();
  }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function debounce(fn, ms) {
    let t; return function () { clearTimeout(t); const a = arguments, self = this; t = setTimeout(() => fn.apply(self, a), ms); };
  }
  function chapterOf(it) { return DATA.chapters.find(c => String(c.num) === String(it.chapter)); }
  function sectionOf(it) {
    const ch = chapterOf(it);
    return ch ? ch.sections.find(s => String(s.num) === String(it.section)) : null;
  }
  function sectionByNum(num) {
    for (const ch of DATA.chapters) {
      const s = ch.sections.find(x => String(x.num) === String(num));
      if (s) return { chapter: ch, section: s };
    }
    return null;
  }
  function subsectionTitle(it) {
    const s = sectionOf(it);
    if (!s || !s.subsections) return '';
    const ss = s.subsections.find(x => String(x.num) === String(it.subsection));
    return ss ? ss.title : '';
  }

  function renderMath(tex, display) {
    if (!window.katex) return '<code>' + escHtml(tex) + '</code>';
    try {
      return katex.renderToString(String(tex).trim(), {
        displayMode: !!display, throwOnError: false, strict: false,
        trust: false, output: 'html', macros: { '\\R': '\\mathbb{R}' }
      });
    } catch (e) {
      return '<code class="math-err">' + escHtml(tex) + '</code>';
    }
  }

  function renderRich(text) {
    if (!text) return '';
    const src = String(text);
    const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    let out = '', buf = '', last = 0, m;
    const flush = () => {
      const chunks = buf.split(/\n{2,}/);
      chunks.forEach(chunk => {
        if (!chunk.trim()) return;
        out += '<p>' + inlineHtml(chunk) + '</p>';
      });
      buf = '';
    };
    while ((m = re.exec(src))) {
      buf += src.slice(last, m.index);
      if (m[1] !== undefined) {
        flush();
        out += renderMath(m[1], true);
      } else {
        buf += '\u0001' + renderMath(m[2], false) + '\u0001';
      }
      last = re.lastIndex;
    }
    buf += src.slice(last);
    flush();
    return '<div class="rich">' + out + '</div>';
  }
  function inlineHtml(chunk) {
    return chunk.split('\u0001').map((part, i) => {
      if (i % 2 === 1) return part;
      return escHtml(part).replace(/\n/g, '<br>');
    }).join('');
  }

  function plainText(s) {
    if (!s) return '';
    let t = String(s);
    t = t.replace(/\\begin\{(pmatrix|bmatrix|vmatrix|matrix|array|cases)\}[\s\S]*?\\end\{\1\}/g, ' 矩阵 ');
    t = t.replace(/\\text\{([^{}]*)\}/g, ' $1 ');
    t = t.replace(/\\(?:boldsymbol|mathbf|mathrm|mathit|mathcal|mathbb|overrightarrow)\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)');
    const MAP = {
      '\\times': '×', '\\cdot': '·', '\\pm': '±', '\\mp': '∓', '\\le': '≤', '\\leq': '≤',
      '\\ge': '≥', '\\geq': '≥', '\\ne': '≠', '\\neq': '≠', '\\approx': '≈', '\\equiv': '≡',
      '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆', '\\cup': '∪', '\\cap': '∩',
      '\\to': '→', '\\rightarrow': '→', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐',
      '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔', '\\perp': '⊥', '\\parallel': '∥',
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\lambda': 'λ',
      '\\mu': 'μ', '\\theta': 'θ', '\\pi': 'π', '\\sigma': 'σ', '\\varphi': 'φ', '\\phi': 'φ',
      '\\cdots': '…', '\\ldots': '…', '\\dots': '…', '\\vdots': '⋮', '\\ddots': '⋱',
      '\\quad': ' ', '\\qquad': ' ', '\\,': ' ', '\\;': ' ', '\\!': '', '\\ ': ' ',
      '\\sum': '∑', '\\prod': '∏', '\\int': '∫', '\\infty': '∞', '\\partial': '∂',
      '\\left': '', '\\right': '', '\\begin': ' ', '\\end': ' ',
      '\\pmatrix': ' ', '\\bmatrix': ' ', '\\vmatrix': ' ', '\\matrix': ' ', '\\cases': ' ',
      '\\det': 'det', '\\max': 'max', '\\min': 'min', '\\lim': 'lim', '\\log': 'log', '\\ln': 'ln'
    };
    t = t.replace(/\\([a-zA-Z]+)\s*/g, function (m, name) {
      const key = '\\' + name;
      return Object.prototype.hasOwnProperty.call(MAP, key) ? MAP[key] : ' ';
    });
    t = t.replace(/\[[^\]\u4e00-\u9fa5]{6,}\]/g, ' ');
    t = t.replace(/\([^\)\u4e00-\u9fa5]{8,}\)/g, ' ');
    t = t.replace(/[_^]\s*\{([^{}]*)\}/g, '$1');
    t = t.replace(/[_^]/g, '');
    t = t.replace(/[{}$\\&]/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
  }

  function snippetFor(it, terms) {
    const plain = plainText(it.statement);
    const chinese = (plain.match(/[一-龥]/g) || []).length;
    if (chinese < 8 || chinese / Math.max(1, plain.length) < 0.45 || /[=+\-·×]{2,}/.test(plain.replace(/\s+/g, ''))) {
      const sub = subsectionTitle(it) || '';
      const tags = (it.tags || []).slice(0, 3).join(' / ');
      return escHtml([sub, tags].filter(Boolean).join(' · ') || plain.slice(0, 70) + '…');
    }
    const raw = ' ' + plain + ' ' + plainText(it.solution || it.proof || '') + ' ';
    let at = -1, hit = '';
    for (const t of terms) {
      const i = raw.toLowerCase().indexOf(t.toLowerCase());
      if (i >= 0 && (at < 0 || i < at)) { at = i; hit = t; }
    }
    if (at < 0) return escHtml(raw.slice(1, 80)) + '…';
    const start = Math.max(1, at - 34);
    const end = Math.min(raw.length - 1, at + (hit ? hit.length : 0) + 52);
    let frag = raw.slice(start, end).trim();
    frag = escHtml(frag);
    if (hit) {
      try { frag = frag.replace(new RegExp(escRe(escHtml(hit)), 'ig'), x => '<mark>' + x + '</mark>'); } catch (e) { }
    }
    return (start > 1 ? '…' : '') + frag + (end < raw.length - 1 ? '…' : '');
  }

  /* ---------------- 关联构建 ---------------- */
  const LABEL_INDEX = new Map();
  ITEMS.forEach(it => {
    if (isTheory(it) || isProblem(it)) {
      const k = normLabel(it.label);
      if (k && !LABEL_INDEX.has(k)) LABEL_INDEX.set(k, it);
    }
  });

  ITEMS.forEach(it => {
    it._refIds = [];
    (Array.isArray(it.refs) ? it.refs : []).forEach(r => {
      const target = LABEL_INDEX.get(normLabel(r));
      if (target && target.id !== it.id && !it._refIds.includes(target.id)) it._refIds.push(target.id);
      // 也允许省略“定理”前缀的写法：2-3
      if (!target) {
        const m = String(r).match(/(\d+)\s*[-–—]\s*(\d+)/);
        if (m) {
          const cand = LABEL_INDEX.get(normLabel('定理' + m[1] + '-' + m[2]));
          if (cand && !it._refIds.includes(cand.id)) it._refIds.push(cand.id);
        }
      }
    });
    it._relatedProblems = [];
    it._relatedTheorems = it._refIds.slice();
    it._plain = plainText(it.statement) + ' ' + plainText(it.solution || '') + ' ' + plainText(it.proof || '');
    it._search = [
      it.label, it.title, (it.tags || []).join(' '),
      it.section, subsectionTitle(it), it._plain, plainText(it.hint || '')
    ].join(' ').toLowerCase();
  });

  let EDGE_COUNT = 0;
  ITEMS.filter(isProblem).forEach(p => {
    p._refIds.forEach(id => {
      const t = BY_ID.get(id);
      if (t && isTheory(t)) {
        if (!t._relatedProblems.includes(p.id)) t._relatedProblems.push(p.id);
        EDGE_COUNT++;
      }
    });
  });
  ITEMS.filter(isTheory).forEach(t => {
    t._relatedProblems.sort((a, b) => {
      const A = BY_ID.get(a), B = BY_ID.get(b);
      return (A.page || 0) - (B.page || 0);
    });
  });

  const STATS = {
    chapters: DATA.chapters.length,
    theorems: ITEMS.filter(isTheory).length,
    problems: ITEMS.filter(isProblem).length,
    edges: EDGE_COUNT,
    topics: 0
  };

  const TOPIC_MAP = new Map();
  ITEMS.forEach(it => {
    (it.tags || []).forEach(tag => {
      if (!tag) return;
      let o = TOPIC_MAP.get(tag);
      if (!o) { o = { tag, theory: [], problem: [] }; TOPIC_MAP.set(tag, o); }
      if (isTheory(it)) o.theory.push(it.id);
      else if (isProblem(it)) o.problem.push(it.id);
    });
  });
  STATS.topics = TOPIC_MAP.size;
  const TOPICS = Array.from(TOPIC_MAP.values())
    .sort((a, b) => (b.theory.length + b.problem.length) - (a.theory.length + a.problem.length) || a.tag.localeCompare(b.tag, 'zh'));

  const ORDERED = [];
  const SEEN = new Set();
  DATA.chapters.forEach(ch => ch.sections.forEach(sec => (sec.items || []).forEach(id => {
    if (BY_ID.has(id) && !SEEN.has(id)) { SEEN.add(id); ORDERED.push(id); }
  })));
  ITEMS.forEach(it => { if (!SEEN.has(it.id)) { SEEN.add(it.id); ORDERED.push(it.id); } });
  const ORDER_INDEX = new Map(ORDERED.map((id, i) => [id, i]));

  const PEER_CACHE = new Map();
  function peerItems(it, kindSet) {
    const key = it.id + '|' + (kindSet === 'theory' ? 't' : 'p');
    if (PEER_CACHE.has(key)) return PEER_CACHE.get(key);
    const sec = sectionOf(it);
    let out = [];
    if (sec) {
      out = sectionItems(sec).filter(x => x.id !== it.id && x.subsection === it.subsection &&
        (kindSet === 'theory' ? isTheory(x) : isProblem(x)));
    }
    PEER_CACHE.set(key, out);
    return out;
  }

  function sectionItems(sec) {
    const out = [];
    const seen = new Set();
    (sec.items || []).forEach(id => {
      const it = BY_ID.get(id);
      if (it && !seen.has(id)) { seen.add(id); out.push(it); }
    });
    // 兜底：未登记进目录的条目
    ITEMS.forEach(it => {
      if (String(it.section) === String(sec.num) && !seen.has(it.id)) { seen.add(it.id); out.push(it); }
    });
    out.sort((a, b) => (ORDER_INDEX.get(a.id) ?? 9999) - (ORDER_INDEX.get(b.id) ?? 9999));
    return out;
  }

  /* ---------------- 本地状态 ---------------- */
  const LS = {
    theme: 'liga.theme',
    bookmarks: 'liga.bookmarks',
    recent: 'liga.recent',
    visited: 'liga.visited'
  };
  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { } }

  let bookmarks = lsGet(LS.bookmarks, []);
  if (!Array.isArray(bookmarks)) bookmarks = [];
  let recent = lsGet(LS.recent, []);
  if (!Array.isArray(recent)) recent = [];
  let visited = lsGet(LS.visited, []);
  if (!Array.isArray(visited)) visited = [];
  let currentTheme = lsGet(LS.theme, null);

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e141b' : '#1f5c8b');
  }
  if (currentTheme === 'dark' || currentTheme === 'light') applyTheme(currentTheme);

  function toggleBookmark(id) {
    const i = bookmarks.indexOf(id);
    if (i >= 0) bookmarks.splice(i, 1); else bookmarks.push(id);
    lsSet(LS.bookmarks, bookmarks);
    toast(i >= 0 ? '已取消收藏' : '已加入收藏');
    return i < 0;
  }
  function inBookmarks(id) { return bookmarks.includes(id); }

  function pushRecent(id) {
    recent = recent.filter(x => x !== id);
    recent.unshift(id);
    recent = recent.slice(0, 24);
    lsSet(LS.recent, recent);
  }
  function markVisited(secNum) {
    if (!visited.includes(secNum)) {
      visited.push(secNum);
      lsSet(LS.visited, visited);
    }
  }

  /* ---------------- 搜索 ---------------- */
  const STOP = ['怎么', '如何', '什么', '为什么', '一下', '请问', '关于', '相关', '以及', '这个', '那个', '可以', '需要', '求', '的', '是', '和', '与', '及'];
  const SYNONYMS = {
    '逆矩阵': ['可逆矩阵', '伴随矩阵', '逆'],
    '可逆': ['逆矩阵', '可逆矩阵'],
    'det': ['行列式'],
    '行列式': ['det'],
    '叉积': ['向量积'], '点积': ['数量积'], '内积': ['数量积'], '外积': ['向量积'],
    '方程组': ['线性方程组'],
    '转置': ['转置'],
    '法向量': ['点法式', '平面方程'],
    '方向向量': ['点向式', '直线方程'],
    '秩': ['秩'],
    '特征值': ['特征值']
  };

  function queryTerms(q) {
    const s = String(q || '').trim().toLowerCase();
    if (!s) return [];
    let terms = s.split(/[\s,，、;；]+/).filter(Boolean);
    if (terms.length === 1 && terms[0].length >= 4) {
      const big = [];
      for (let i = 0; i < terms[0].length - 1; i++) {
        const bg = terms[0].slice(i, i + 2);
        if (!STOP.includes(bg)) big.push(bg);
      }
      terms = terms.concat(big.slice(0, 8));
    }
    const out = [];
    terms.forEach(t => {
      if (!out.includes(t)) out.push(t);
      (SYNONYMS[t] || []).forEach(x => { if (!out.includes(x)) out.push(x); });
    });
    return out.slice(0, 12);
  }

  function searchItems(q, scope) {
    const raw = String(q || '').trim();
    if (!raw) return [];
    const qNorm = normLabel(raw);
    const terms = queryTerms(raw);
    const pool = ITEMS.filter(it => scope === 'theorem' ? isTheory(it) : scope === 'problem' ? isProblem(it) : true);
    const res = [];
    pool.forEach(it => {
      let score = 0;
      const labelN = normLabel(it.label);
      if (labelN === qNorm) score += 200;
      else if (labelN.includes(qNorm) && qNorm.length >= 3) score += 90;
      else {
        const m = qNorm.match(/^(\d+)-(\d+)$/);
        if (m && normLabel(it.label).endsWith(m[1] + '-' + m[2])) score += 70;
      }
      const titleL = (it.title || '').toLowerCase();
      const tagsL = (it.tags || []).join(' ').toLowerCase();
      for (const t of terms) {
        if (!t) continue;
        if (titleL.includes(t)) score += 34;
        if (tagsL.includes(t)) score += 26;
        const cnt = (it._search.split(t).length - 1);
        if (cnt > 0) score += Math.min(cnt, 4) * 7;
      }
      if (score > 0) res.push({ it, score });
    });
    res.sort((a, b) => b.score - a.score || (ORDER_INDEX.get(a.it.id) ?? 0) - (ORDER_INDEX.get(b.it.id) ?? 0));
    return res.map(x => x.it);
  }

  /* ---------------- 路由 ---------------- */
  function parseRoute() {
    let raw = location.hash.replace(/^#/, '');
    if (!raw) raw = '/';
    const qi = raw.indexOf('?');
    const path = (qi >= 0 ? raw.slice(0, qi) : raw) || '/';
    const params = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    return { path: path.replace(/\/+$/, '') || '/', params };
  }
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }
  function hrefFor(it) { return '#/item/' + encodeURIComponent(it.id); }

  /* ---------------- 侧栏 ---------------- */
  const ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M12 3 3 11h3v9h5v-6h2v6h5v-9h3L12 3Z"/></svg>',
    theory: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5V3Zm2 2v14h10V7h-2V5H7Zm2 4h6v1.6H9V9Zm0 3.6h6v1.6H9V12Zm0 3.6h4v1.6H9V16Z"/></svg>',
    problem: '<svg viewBox="0 0 24 24"><path d="M4 4h16v3H4V4Zm0 6h10v2H4v-2Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z"/></svg>',
    topic: '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-1 3v5l4 2 .8-1.6-3.3-1.6V8h-1.5Z"/></svg>'
  };

  function renderSidebar() {
    const route = parseRoute();
    let activeCh = route.path.startsWith('/chapter/') ? route.path.split('/')[2]
      : route.path.startsWith('/section/') ? (sectionByNum(decodeURIComponent(route.path.split('/')[2])) || {}).chapter?.num
        : null;
    let activeSec = route.path.startsWith('/section/') ? decodeURIComponent(route.path.split('/')[2]) : null;
    if (route.path.startsWith('/item/')) {
      const it = BY_ID.get(decodeURIComponent(route.path.split('/')[2] || ''));
      if (it) { activeCh = it.chapter; activeSec = String(it.section); }
    }

    let html = '<nav class="side-nav">';
    html += sideLink('#/', ICON.home, '总览', '', route.path === '/');
    html += sideLink('#/theorems', ICON.theory, '定理库', STATS.theorems, route.path === '/theorems');
    html += sideLink('#/problems', ICON.problem, '题库', STATS.problems, route.path === '/problems');
    html += sideLink('#/topics', ICON.topic, '专题复习', STATS.topics, route.path === '/topics');
    html += '</nav>';

    html += '<div class="side-sep">教材目录</div>';
    DATA.chapters.forEach(ch => {
      const open = String(ch.num) === String(activeCh) || route.path === '/' && false;
      const secs = ch.sections;
      const counts = ch.sections.reduce((n, s) => n + (s.items || []).length, 0);
      html += '<div class="chapter-nav' + (open ? ' open' : '') + '">';
      html += '<button class="ch-head" data-ch="' + escHtml(ch.num) + '" aria-expanded="' + (open ? 'true' : 'false') + '">'
        + '<span class="ch-num">' + escHtml(ch.num) + '</span>'
        + '<span class="ch-title">' + escHtml(ch.title) + '</span>'
        + '<span class="ch-caret">▸</span></button>';
      html += '<div class="ch-secs">';
      secs.forEach(sec => {
        const on = activeSec === String(sec.num);
        html += '<a class="sec-link' + (on ? ' active' : (visited.includes(String(sec.num)) ? ' visited' : '')) + '" href="#/section/' + encodeURIComponent(sec.num) + '">'
          + '<span class="dot"></span><span>' + escHtml(sec.num) + ' ' + escHtml(sec.title) + '</span>'
          + '<span class="sc">' + (sec.items || []).length + '</span></a>';
      });
      html += '</div></div>';
    });

    html += '<div class="side-sep">我的</div>';
    html += '<nav class="side-nav">';
    html += sideLink('#/bookmarks', ICON.star, '我的收藏', bookmarks.length, route.path === '/bookmarks');
    html += sideLink('#/recent', ICON.clock, '最近浏览', recent.length, route.path === '/recent');
    html += '</nav>';

    html += '<div class="side-card">'
      + '<div class="sc-row"><span>定理 / 定义</span><b>' + STATS.theorems + ' 条</b></div>'
      + '<div class="sc-row"><span>例题 / 习题</span><b>' + STATS.problems + ' 道</b></div>'
      + '<div class="sc-row"><span>双向关联</span><b>' + STATS.edges + ' 条</b></div>'
      + '<div class="sc-row"><span>覆盖范围</span><b>第 1–4 章</b></div>'
      + '</div>';

    $('#sidebar-inner').innerHTML = html;

    $$('.ch-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const nav = btn.closest('.chapter-nav');
        nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
      });
    });
  }
  function sideLink(href, icon, label, count, active) {
    return '<a class="side-link' + (active ? ' active' : '') + '" href="' + href + '">'
      + '<span class="si">' + icon + '</span><span>' + label + '</span>'
      + (count !== '' && count !== undefined ? '<span class="cnt">' + count + '</span>' : '')
      + '</a>';
  }

  /* ---------------- 公共片段 ---------------- */
  function kindBadge(kind) {
    return '<span class="kind-badge k-' + kind + '">' + (KIND_NAME[kind] || kind) + '</span>';
  }
  function itemKindLabel(it) {
    if (it.kind === 'appendix') return '附录';
    return KIND_NAME[it.kind] || '';
  }
  function relationLink(it) {
    if (isTheory(it)) {
      const n = it._relatedProblems.length;
      if (n) return '<a class="rel-link" href="' + hrefFor(it) + '">可应对 <b>' + n + '</b> 题</a>';
      const pc = peerItems(it, 'problem').length;
      return pc ? '<a class="rel-link" href="' + hrefFor(it) + '">同节 <b>' + pc + '</b> 题</a>'
        : '<a class="rel-link" href="' + hrefFor(it) + '">暂无关联</a>';
    }
    const n = it._refIds.length;
    if (n) return '<a class="rel-link" href="' + hrefFor(it) + '">涉及 <b>' + n + '</b> 个定理</a>';
    const tc = peerItems(it, 'theory').length;
    return tc ? '<a class="rel-link" href="' + hrefFor(it) + '">同节 <b>' + tc + '</b> 定理</a>'
      : '<a class="rel-link" href="' + hrefFor(it) + '">暂无关联</a>';
  }
  function tagLinks(tags, max) {
    return (tags || []).slice(0, max || 4).map(t =>
      '<a class="tag" href="#/topic/' + encodeURIComponent(t) + '">' + escHtml(t) + '</a>'
    ).join('');
  }
  function crumbs(parts) {
    return '<nav class="crumbs">' + parts.map((p, i) => {
      const sep = i ? '<span class="sep-dot">/</span>' : '';
      return sep + (p.href ? '<a href="' + p.href + '">' + escHtml(p.text) + '</a>' : '<span>' + escHtml(p.text) + '</span>');
    }).join('') + '</nav>';
  }

  function itemRow(it, opts) {
    opts = opts || {};
    const sub = subsectionTitle(it) || (sectionOf(it) ? sectionOf(it).title : '');
    let meta = '';
    if (isTheory(it)) {
      const n = it._relatedProblems.length;
      if (n) meta = '<span class="ir-count">' + n + ' 题</span>';
      else {
        const pc = peerItems(it, 'problem').length;
        meta = pc ? '<span class="ir-count" title="未标注直接关联；以下为同小节题目">同节 ' + pc + '</span>' : '<span class="ir-count">—</span>';
      }
    } else {
      const n = it._refIds.length;
      if (n) meta = '<span class="ir-count">' + n + ' 定理</span>';
      else {
        const tc = peerItems(it, 'theory').length;
        meta = tc ? '<span class="ir-count" title="未标注直接关联；以下为同小节定理">同节 ' + tc + '</span>' : '<span class="ir-count">—</span>';
      }
    }
    if (opts.showChapter) meta = '<span class="ir-count">第 ' + it.chapter + ' 章</span>' + meta;
    return '<a class="item-row" href="' + hrefFor(it) + '">'
      + '<span class="ir-label" title="' + escHtml(it.label) + '">' + escHtml(it.label) + '</span>'
      + '<span class="ir-main"><span class="ir-title">' + escHtml(it.title) + '</span>'
      + '<span class="ir-sub">' + escHtml(sub) + (it.tags && it.tags.length ? ' · ' + escHtml(it.tags.slice(0, 2).join(' / ')) : '') + '</span></span>'
      + '<span class="ir-meta">' + meta + '</span>'
      + '<span class="ir-arrow">›</span></a>';
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    let html = '<div class="main-inner">';
    html += '<section class="hero">'
      + '<span class="eyebrow">Linear Algebra &amp; Analytic Geometry</span>'
      + '<h1>线性代数与解析几何<br>第 1–4 章 · 定理与题目整合</h1>'
      + '<p>把教材中的定义、定理、例题与习题织成一张双向网：每条定理都能看到“可应对哪些题”，每道题都能回溯“用到哪些定理”。支持章节目录跳转、定理搜索、搜题与专题复习。</p>'
      + '<div class="hero-stats">'
      + heroStat(STATS.theorems, '定理 / 定义')
      + heroStat(STATS.problems, '例题 / 习题')
      + heroStat(STATS.edges, '双向关联')
      + heroStat(STATS.topics, '知识专题')
      + '</div>'
      + '<div class="hero-actions">'
      + '<a class="btn primary" href="#/section/1.1">从第 1 章开始</a>'
      + '<a class="btn" href="#/theorems">进入定理库</a>'
      + '<a class="btn" href="#/problems">进入题库</a>'
      + '</div></section>';

    html += '<div class="home-grid"><div>';
    html += '<div class="section-head"><div><h2>四章脉络</h2><div class="sh-sub">矩阵 → 行列式 → 可逆矩阵与线性方程组 → 空间平面与直线</div></div></div>';
    html += '<div class="chapter-grid">';
    DATA.chapters.forEach(ch => {
      const secCount = ch.sections.length;
      const nItems = ch.sections.reduce((n, s) => n + (s.items || []).length, 0);
      const nThm = ITEMS.filter(it => String(it.chapter) === String(ch.num) && isTheory(it)).length;
      const nProb = ITEMS.filter(it => String(it.chapter) === String(ch.num) && isProblem(it)).length;
      html += '<a class="chapter-card" href="#/chapter/' + ch.num + '">'
        + '<span class="cc-num">' + ch.num + '</span>'
        + '<span class="cc-kicker">CHAPTER ' + ch.num + '</span>'
        + '<h3>' + escHtml(ch.title) + '</h3>'
        + '<div class="cc-sub">' + escHtml(ch.sub || '') + '</div>'
        + '<div class="cc-meta"><span><b>' + secCount + '</b> 节</span><span><b>' + nThm + '</b> 定理</span><span><b>' + nProb + '</b> 题</span></div>'
        + '</a>';
    });
    html += '</div>';

    html += '<div class="section-head" style="margin-top:32px"><div><h2>最近浏览</h2><div class="sh-sub">继续上次停下的地方</div></div>'
      + (recent.length ? '<a class="sh-link" href="#/recent">全部 →</a>' : '') + '</div>';
    if (recent.length) {
      html += '<div class="item-list">';
      recent.slice(0, 4).forEach(id => { const it = BY_ID.get(id); if (it) html += itemRow(it, { showChapter: true }); });
      html += '</div>';
    } else {
      html += '<div class="panel" style="color:var(--muted);font-size:13px">还没有浏览记录。打开任意定理或题目，这里会自动记录。</div>';
    }
    html += '</div>';

    // 右栏
    html += '<div>';
    html += '<div class="panel"><h3>重点定理</h3><div class="p-sub">按可应对题目数量排序</div><div class="mini-list">';
    ITEMS.filter(isTheory).sort((a, b) => b._relatedProblems.length - a._relatedProblems.length).slice(0, 7).forEach(it => {
      html += '<a class="mini-row" href="' + hrefFor(it) + '"><span class="ml">' + escHtml(it.label) + '</span>'
        + '<span class="mt">' + escHtml(it.title) + '</span><span class="mn">' + it._relatedProblems.length + ' 题</span></a>';
    });
    html += '</div></div>';

    html += '<div class="panel"><h3>热门专题</h3><div class="p-sub">按主题把定理和题目放在一起看</div><div class="topic-cloud">';
    TOPICS.slice(0, 12).forEach(t => {
      html += '<a class="topic-chip" href="#/topic/' + encodeURIComponent(t.tag) + '">' + escHtml(t.tag)
        + '<span class="tc-n">' + (t.theory.length + t.problem.length) + '</span></a>';
    });
    html += '</div></div>';

    html += '<div class="panel"><h3>怎么用</h3><div class="p-sub">三个入口，按需选择</div>'
      + '<div class="mini-list">'
      + '<div class="mini-row"><span class="ml">读</span><span class="mt">从左侧目录按节阅读，定理与例题穿插呈现</span></div>'
      + '<div class="mini-row"><span class="ml">查</span><span class="mt">顶部两个搜索框，分别搜定理与搜题目</span></div>'
      + '<div class="mini-row"><span class="ml">联</span><span class="mt">进入详情页看双向关联与教材原页</span></div>'
      + '</div></div>';
    html += '</div></div>';

    html += footer();
    html += '</div>';
    return html;
  }
  function heroStat(n, label) {
    return '<div class="hero-stat"><b>' + n + '</b><span>' + label + '</span></div>';
  }

  /* ---------------- 章节页 ---------------- */
  function renderChapter(num) {
    const ch = DATA.chapters.find(c => String(c.num) === String(num));
    if (!ch) return notFound('没有找到这一章');
    const nThm = ITEMS.filter(it => String(it.chapter) === String(ch.num) && isTheory(it)).length;
    const nProb = ITEMS.filter(it => String(it.chapter) === String(ch.num) && isProblem(it)).length;

    let html = '<div class="main-inner">';
    html += crumbs([{ text: '总览', href: '#/' }, { text: '第 ' + ch.num + ' 章' }]);
    html += '<section class="chapter-hero"><span class="ch-num-big">' + ch.num + '</span>'
      + '<span class="eyebrow">CHAPTER ' + ch.num + '</span>'
      + '<h1>' + escHtml(ch.title) + '</h1>'
      + '<p>' + escHtml(ch.intro || '') + '</p>'
      + '<div class="ch-stats"><div><b>' + ch.sections.length + '</b><span>小节</span></div>'
      + '<div><b>' + nThm + '</b><span>定理 / 定义</span></div>'
      + '<div><b>' + nProb + '</b><span>例题 / 习题</span></div></div></section>';

    html += '<div class="section-head"><div><h2>本章目录</h2><div class="sh-sub">点击任意小节开始阅读</div></div></div>';
    html += '<div class="sec-cards">';
    ch.sections.forEach(sec => {
      const items = sectionItems(sec);
      const nt = items.filter(isTheory).length, np = items.filter(isProblem).length;
      html += '<div class="sec-card"><span class="sc-num">' + escHtml(sec.num) + '</span><div class="sc-body">'
        + '<h3><a href="#/section/' + encodeURIComponent(sec.num) + '">' + escHtml(sec.title) + '</a></h3>'
        + (sec.intro ? '<div class="sc-sub">' + escHtml(sec.intro) + '</div>' : '')
        + ((sec.subsections || []).length ? '<div class="sub-list">' + sec.subsections.map(ss =>
          '<a href="#/section/' + encodeURIComponent(sec.num) + '?focus=' + encodeURIComponent(ss.id || ss.num) + '">' + escHtml(ss.num + ' ' + ss.title) + '</a>').join('') + '</div>' : '')
        + '</div><div class="sc-counts"><span><b>' + nt + '</b> 定理</span><span><b>' + np + '</b> 题</span></div></div>';
    });
    html += '</div>';

    html += '<div class="section-head" style="margin-top:32px"><div><h2>本章重点定理</h2><div class="sh-sub">按可应对题目数量排序</div></div></div>';
    html += '<div class="item-list">';
    ITEMS.filter(it => String(it.chapter) === String(ch.num) && isTheory(it))
      .sort((a, b) => b._relatedProblems.length - a._relatedProblems.length)
      .slice(0, 8).forEach(it => { html += itemRow(it); });
    html += '</div>';

    html += footer();
    html += '</div>';
    return html;
  }

  /* ---------------- 小节阅读页 ---------------- */
  function renderSection(num, params) {
    const found = sectionByNum(num);
    if (!found) return notFound('没有找到这一节');
    const { chapter, section } = found;
    markVisited(section.num);
    const items = sectionItems(section);
    const focus = params && params.get('focus');

    let html = '<div class="main-inner">';
    html += crumbs([
      { text: '总览', href: '#/' },
      { text: '第 ' + chapter.num + ' 章 ' + chapter.title, href: '#/chapter/' + chapter.num },
      { text: section.num + ' ' + section.title }
    ]);

    html += '<div class="read-layout"><div class="reading">';
    html += '<div class="sec-title-block"><div class="stb-num">§ ' + escHtml(section.num) + '</div>'
      + '<h1>' + escHtml(section.title) + '</h1>'
      + (section.intro ? '<div class="stb-sub">' + escHtml(section.intro) + '</div>' : '')
      + '<div class="ph-meta"><span class="kind-badge">' + items.filter(isTheory).length + ' 条定理</span>'
      + '<span class="kind-badge k-example">' + items.filter(isProblem).length + ' 道题目</span>'
      + '<span class="small muted">教材 p.' + (section.page || '') + '</span></div></div>';

    // 分组
    const groups = [];
    const byKey = new Map();
    items.forEach(it => {
      const key = (section.subsections && section.subsections.length) ? String(it.subsection || section.num) : section.num;
      if (!byKey.has(key)) { const g = { key, items: [] }; byKey.set(key, g); groups.push(g); }
      byKey.get(key).items.push(it);
    });

    groups.forEach(g => {
      const ss = (section.subsections || []).find(x => String(x.num) === String(g.key));
      let head = '';
      if ((section.subsections || []).length) {
        const isExerciseGroup = String(g.key) === String(section.num);
        head = '<div class="sub-head" id="sub-' + escHtml(g.key) + '">'
          + '<span class="sh-num">' + escHtml(isExerciseGroup ? section.num : g.key) + '</span>'
          + '<h2>' + escHtml(isExerciseGroup ? '思考题 · 习题 · 提高题' : (ss ? ss.title : g.key)) + '</h2>'
          + '<span class="sh-note">' + g.items.length + ' 条</span></div>';
      } else {
        head = '<div class="sub-head" id="sub-' + escHtml(g.key) + '"><span class="sh-num">' + escHtml(section.num) + '</span>'
          + '<h2>' + escHtml(section.title) + '</h2><span class="sh-note">' + g.items.length + ' 条</span></div>';
      }
      html += head;
      g.items.forEach(it => { html += itemCard(it, false); });
    });

    html += footer();
    html += '</div>'; // reading

    // 右栏目录
    html += '<aside class="read-toc"><div class="rt-title">本节目录</div>';
    (section.subsections || []).forEach(ss => {
      html += '<a class="lv3" href="#/section/' + encodeURIComponent(section.num) + '?focus=' + encodeURIComponent(ss.id || ss.num) + '">' + escHtml(ss.num + ' ' + ss.title) + '</a>';
    });
    html += '<div class="rt-title" style="margin-top:12px">条目</div>';
    items.forEach(it => {
      html += '<a class="lv2" href="' + hrefFor(it) + '">' + escHtml(it.label) + ' ' + escHtml(it.title) + '</a>';
    });
    html += '</aside>';

    html += '</div></div>';
    return { html, focus };
  }

  function itemCard(it, compact) {
    let body = renderRich(it.statement);
    let extra = '';
    if (it.kind === 'theorem' || it.kind === 'definition' || it.kind === 'property' || it.kind === 'corollary' || it.kind === 'lemma' || it.kind === 'formula' || it.kind === 'appendix') {
      if (it.proof) {
        extra += '<details class="fold"><summary>查看证明</summary><div class="fold-body">' + renderRich(it.proof) + '</div></details>';
      }
    } else {
      if (it.hint) extra += '<div class="hint-box"><b>思路提示</b>　' + renderRich(it.hint) + '</div>';
      if (it.solution) {
        extra += '<details class="fold"><summary>查看解答</summary><div class="fold-body">' + renderRich(it.solution) + '</div></details>';
      }
    }
    if (it.remark) extra += '<div class="remark-box"><b>注</b>　' + renderRich(it.remark) + '</div>';

    const cardCls = it.kind === 'definition' ? 'k-definition' : 'k-' + it.kind;
    return '<article class="item-card ' + cardCls + '" id="item-' + escHtml(it.id) + '">'
      + '<div class="ic-head"><span class="ic-label">' + escHtml(it.label) + '</span>'
      + '<span class="ic-title">' + escHtml(it.title) + '</span>'
      + '<a class="ic-link" href="' + hrefFor(it) + '">详情与关联 →</a></div>'
      + '<div class="item-body">' + body + extra + '</div>'
      + '<div class="card-foot">' + tagLinks(it.tags, 4)
      + '<span class="cf-right">' + relationLink(it) + '</span></div>'
      + '</article>';
  }

  /* ---------------- 定理库 / 题库 ---------------- */
  function renderLibrary(kind, params) {
    const isThm = kind === 'theorems';
    const ch = params.get('ch') || '';
    const k = params.get('kind') || '';
    const tag = params.get('tag') || '';
    let list = ITEMS.filter(it => isThm ? isTheory(it) : isProblem(it));
    if (ch) list = list.filter(it => String(it.chapter) === ch);
    if (k) list = list.filter(it => it.kind === k);
    if (tag) list = list.filter(it => (it.tags || []).includes(tag));

    let html = '<div class="main-inner">';
    html += '<div class="page-head"><h1>' + (isThm ? '定理库' : '题库') + '</h1>'
      + '<div class="ph-sub">' + (isThm
        ? '教材第 1–4 章的全部定义、定理、推论、性质与公式。每条都可查看“可应对的题目”。'
        : '教材第 1–4 章的全部例题、习题、思考题与提高题。每道题都标注“涉及的定理”。') + '</div></div>';

    html += '<div class="filterbar">';
    html += '<span class="f-label">章节</span>';
    html += filterChip('全部', '', ch === '', '#/' + kind + buildQuery(params, { ch: '' }));
    DATA.chapters.forEach(c => {
      html += filterChip('第 ' + c.num + ' 章', c.num, ch === String(c.num), '#/' + kind + buildQuery(params, { ch: c.num }));
    });
    html += '<span class="f-sep"></span><span class="f-label">类型</span>';
    html += filterChip('全部', '', k === '', '#/' + kind + buildQuery(params, { kind: '' }));
    (isThm ? THEORY_KINDS : PROBLEM_KINDS).forEach(kk => {
      html += filterChip(KIND_NAME[kk], kk, k === kk, '#/' + kind + buildQuery(params, { kind: kk }));
    });
    html += '<div class="f-right"><span class="small muted">共 ' + list.length + ' 条</span></div>';
    html += '</div>';

    if (tag) {
      html += '<div class="result-meta"><span>专题：<b>' + escHtml(tag) + '</b></span><a class="small" href="#/' + kind + buildQuery(params, { tag: '' }) + '">清除专题筛选 ×</a></div>';
    }

    if (!list.length) {
      html += '<div class="panel" style="color:var(--muted)">当前筛选没有结果。</div>';
    } else {
      let lastCh = null;
      list.forEach(it => {
        if (it.chapter !== lastCh) {
          if (lastCh !== null) html += '</div>';
          html += '<div class="group-head"><b>第 ' + it.chapter + ' 章</b><span>' + escHtml((chapterOf(it) || {}).title || '') + '</span></div><div class="item-list">';
          lastCh = it.chapter;
        }
        html += itemRow(it);
      });
      if (lastCh !== null) html += '</div>';
    }
    html += footer();
    html += '</div>';
    return html;
  }
  function filterChip(label, value, on, href) {
    return '<a class="chip' + (on ? ' on' : '') + '" href="' + href + '">' + escHtml(label) + '</a>';
  }
  function buildQuery(params, overrides) {
    const p = new URLSearchParams(params.toString());
    Object.keys(overrides).forEach(key => {
      if (overrides[key] === '' || overrides[key] == null) p.delete(key);
      else p.set(key, overrides[key]);
    });
    const s = p.toString();
    return s ? '?' + s : '';
  }

  /* ---------------- 详情页 ---------------- */
  function renderItem(id) {
    const it = BY_ID.get(id);
    if (!it) return notFound('没有找到这个条目');
    pushRecent(id);
    const ch = chapterOf(it), sec = sectionOf(it);
    const idx = ORDER_INDEX.get(id) ?? -1;
    const prev = idx > 0 ? BY_ID.get(ORDERED[idx - 1]) : null;
    const next = idx >= 0 && idx < ORDERED.length - 1 ? BY_ID.get(ORDERED[idx + 1]) : null;

    let html = '<div class="main-inner">';
    html += crumbs([
      { text: '总览', href: '#/' },
      ch ? { text: '第 ' + ch.num + ' 章 ' + ch.title, href: '#/chapter/' + ch.num } : { text: '—' },
      sec ? { text: sec.num + ' ' + sec.title, href: '#/section/' + encodeURIComponent(sec.num) } : { text: '—' },
      { text: it.label }
    ]);

    html += '<div class="detail-layout"><div class="detail-main">';
    html += '<header class="detail-head"><div class="dh-top">' + kindBadge(it.kind)
      + '<span class="small muted">' + escHtml(it.label) + '</span>'
      + (it.difficulty ? '<span class="small muted">· 难度 ' + '★'.repeat(it.difficulty) + '</span>' : '')
      + (it.uncertain ? '<span class="kind-badge" style="background:var(--red-soft);color:var(--red)">转录存疑</span>' : '')
      + '</div>'
      + '<h1>' + escHtml(it.title) + '</h1>'
      + '<div class="dh-sub">' + escHtml(ch ? '第 ' + ch.num + ' 章 · ' + it.section + ' ' + (sec ? sec.title : '') : '') + '</div>'
      + '<div class="dh-actions">'
      + '<button class="act-btn' + (inBookmarks(id) ? ' on' : '') + '" data-bookmark="' + escHtml(id) + '">'
      + '<svg viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>'
      + '<span>' + (inBookmarks(id) ? '已收藏' : '收藏') + '</span></button>'
      + '<button class="act-btn" data-page="' + escHtml(it.page) + '">查看教材原页</button>'
      + '<a class="act-btn" href="assets/textbook.pdf#page=' + escHtml(it.page) + '" target="_blank" rel="noopener">打开 PDF</a>'
      + '</div></header>';

    html += '<section class="detail-block"><h2>' + (isProblem(it) ? '题目' : '命题') + '</h2>' + renderRich(it.statement) + '</section>';
    if (it.solution) {
      html += '<section class="detail-block proof-block"><h2>解答</h2>' + renderRich(it.solution) + '</section>';
    }
    if (it.proof) {
      html += '<section class="detail-block proof-block"><h2>证明</h2>' + renderRich(it.proof) + '</section>';
    }
    if (it.hint) {
      html += '<section class="detail-block"><h2>思路提示</h2><div class="hint-box" style="margin-top:0"><b>提示</b>　' + renderRich(it.hint) + '</div></section>';
    }
    if (it.remark) {
      html += '<section class="detail-block"><h2>注</h2>' + renderRich(it.remark) + '</section>';
    }

    // 关联
    html += '<section class="detail-block" id="rel">';
    if (isTheory(it)) {
      const probs = it._relatedProblems.map(pid => BY_ID.get(pid)).filter(Boolean);
      html += '<h2>可应对的题目 <span class="db-count">' + probs.length + '</span></h2>';
      if (!probs.length) {
        const peers = (sec ? sectionItems(sec) : []).filter(x => isProblem(x) && x.subsection === it.subsection).slice(0, 10);
        if (peers.length) {
          html += '<div class="empty" style="margin-bottom:10px">尚未标注直接关联的题目；以下是同小节的例题与习题，可作为练习。</div><div class="rel-grid">';
          peers.forEach(p => {
            html += '<a class="rel-item" href="' + hrefFor(p) + '"><span class="rl">' + escHtml(p.label) + '</span>'
              + '<span class="rt">' + escHtml(p.title) + '</span><span class="rn">同节</span></a>';
          });
          html += '</div>';
        } else {
          html += '<div class="empty">尚未标注直接关联的题目。可以看同专题下的例题与习题，或从顶部搜索题目。</div>';
        }
      } else {
        PROBLEM_KINDS.forEach(k => {
          const group = probs.filter(p => p.kind === k);
          if (!group.length) return;
          html += '<div class="group-head" style="margin-top:14px"><b>' + KIND_NAME[k] + '</b><span>' + group.length + ' 道</span></div><div class="rel-grid">';
          group.forEach(p => {
            html += '<a class="rel-item" href="' + hrefFor(p) + '"><span class="rl">' + escHtml(p.label) + '</span>'
              + '<span class="rt">' + escHtml(p.title) + '</span><span class="rn">' + (p.difficulty ? '★'.repeat(p.difficulty) : '') + '</span></a>';
          });
          html += '</div>';
        });
      }
    } else {
      const thms = it._refIds.map(tid => BY_ID.get(tid)).filter(Boolean);
      html += '<h2>涉及的定理 <span class="db-count">' + thms.length + '</span></h2>';
      if (!thms.length) {
        const peers = (sec ? sectionItems(sec) : []).filter(x => isTheory(x) && x.subsection === it.subsection).slice(0, 8);
        if (peers.length) {
          html += '<div class="empty" style="margin-bottom:10px">这道题尚未标注所用定理；以下是同小节的定理，可作为参考。</div><div class="rel-grid">';
          peers.forEach(t => {
            html += '<a class="rel-item" href="' + hrefFor(t) + '"><span class="rl">' + escHtml(t.label) + '</span>'
              + '<span class="rt">' + escHtml(t.title) + '</span><span class="rn">同节</span></a>';
          });
          html += '</div>';
        } else {
          html += '<div class="empty">这道题尚未标注所用定理。可以看本题所属小节的定义与定理，或从顶部搜索定理。</div>';
        }
      } else {
        html += '<div class="rel-grid">';
        thms.forEach(t => {
          html += '<a class="rel-item" href="' + hrefFor(t) + '"><span class="rl">' + escHtml(t.label) + '</span>'
            + '<span class="rt">' + escHtml(t.title) + '</span><span class="rn">' + t._relatedProblems.length + ' 题</span></a>';
        });
        html += '</div>';
      }
    }
    html += '</section>';

    // 同主题
    const sameTag = ITEMS.filter(x => x.id !== it.id && (x.tags || []).some(t => (it.tags || []).includes(t))).slice(0, 6);
    if (sameTag.length) {
      html += '<section class="detail-block"><h2>同主题条目</h2><div class="rel-grid">';
      sameTag.forEach(x => {
        html += '<a class="rel-item" href="' + hrefFor(x) + '"><span class="rl">' + escHtml(x.label) + '</span>'
          + '<span class="rt">' + escHtml(x.title) + '</span><span class="rn">' + (isTheory(x) ? x._relatedProblems.length + ' 题' : '') + '</span></a>';
      });
      html += '</div></section>';
    }

    html += '<div class="prevnext">'
      + (prev ? '<a href="' + hrefFor(prev) + '"><span class="pn-l">← 上一条</span><span class="pn-t">' + escHtml(prev.label + ' ' + prev.title) + '</span></a>' : '<span></span>')
      + (next ? '<a class="next" href="' + hrefFor(next) + '"><span class="pn-l">下一条 →</span><span class="pn-t">' + escHtml(next.label + ' ' + next.title) + '</span></a>' : '<span></span>')
      + '</div>';

    html += footer();
    html += '</div>'; // main

    // 右栏
    html += '<aside class="detail-rail">';
    if (it.page) {
      const img = 'assets/pages/p' + pad3(it.page) + '.jpg';
      html += '<div class="panel"><a class="rail-page" href="#" data-page="' + escHtml(it.page) + '" data-title="' + escHtml(it.label + ' ' + it.title) + '">'
        + '<img src="' + img + '" alt="教材第 ' + it.page + ' 页" loading="lazy"></a>'
        + '<div class="rail-meta" style="margin-top:10px">'
        + '<div class="rm-row"><span>教材页码</span><b>p.' + (it.page - 10) + '</b></div>'
        + '<div class="rm-row"><span>PDF 页码</span><b>' + it.page + '</b></div>'
        + '</div></div>';
    }
    html += '<div class="panel"><h3 style="font-size:14px">条目信息</h3><div class="rail-meta" style="margin-top:10px">'
      + '<div class="rm-row"><span>类型</span><b>' + itemKindLabel(it) + '</b></div>'
      + '<div class="rm-row"><span>章节</span><b>第 ' + it.chapter + ' 章 ' + escHtml(it.section) + '</b></div>'
      + '<div class="rm-row"><span>小节</span><b>' + escHtml(subsectionTitle(it) || (sec ? sec.title : '')) + '</b></div>'
      + (it.difficulty ? '<div class="rm-row"><span>难度</span><b>' + '★'.repeat(it.difficulty) + '</b></div>' : '')
      + '</div>';
    if (it.tags && it.tags.length) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:12px">' + tagLinks(it.tags, 8) + '</div>';
    }
    html += '</div>';

    const secItems = sec ? sectionItems(sec) : [];
    if (secItems.length) {
      html += '<div class="panel"><h3 style="font-size:14px">同节条目</h3><div class="mini-list" style="margin-top:8px">';
      secItems.filter(x => x.id !== it.id).slice(0, 8).forEach(x => {
        html += '<a class="mini-row" href="' + hrefFor(x) + '"><span class="ml">' + escHtml(x.label) + '</span>'
          + '<span class="mt">' + escHtml(x.title) + '</span></a>';
      });
      html += '</div></div>';
    }
    html += '</aside>';

    html += '</div></div>';
    return html;
  }

  /* ---------------- 专题 ---------------- */
  function renderTopics() {
    let html = '<div class="main-inner">';
    html += '<div class="page-head"><h1>专题复习</h1><div class="ph-sub">按知识主题重新聚合：同一个专题下的定理、例题与习题放在一起，便于横向比较与查漏补缺。</div></div>';
    html += '<div class="topic-grid">';
    TOPICS.forEach(t => {
      const total = t.theory.length + t.problem.length;
      html += '<a class="topic-card" href="#/topic/' + encodeURIComponent(t.tag) + '"><h3>' + escHtml(t.tag) + '</h3>'
        + '<div class="tc-stats"><span><b>' + t.theory.length + '</b> 定理</span><span><b>' + t.problem.length + '</b> 题目</span></div>'
        + '<div class="tc-bar"><i style="width:' + Math.min(100, 12 + total * 4) + '%"></i></div></a>';
    });
    html += '</div>';
    html += footer();
    html += '</div>';
    return html;
  }

  function renderTopic(tag) {
    const t = TOPIC_MAP.get(tag);
    if (!t) return notFound('没有找到这个专题');
    const thms = t.theory.map(id => BY_ID.get(id)).filter(Boolean);
    const probs = t.problem.map(id => BY_ID.get(id)).filter(Boolean);
    let html = '<div class="main-inner">';
    html += crumbs([{ text: '总览', href: '#/' }, { text: '专题', href: '#/topics' }, { text: tag }]);
    html += '<div class="page-head"><h1>' + escHtml(tag) + '</h1><div class="ph-sub">共 ' + thms.length + ' 条定理、' + probs.length + ' 道题目。先看定理，再用题目检验。</div></div>';
    if (thms.length) {
      html += '<div class="group-head"><b>相关定理与定义</b><span>' + thms.length + ' 条</span></div><div class="item-list">';
      thms.forEach(it => { html += itemRow(it); });
      html += '</div>';
    }
    if (probs.length) {
      html += '<div class="group-head"><b>相关题目</b><span>' + probs.length + ' 道</span></div><div class="item-list">';
      probs.forEach(it => { html += itemRow(it); });
      html += '</div>';
    }
    html += footer();
    html += '</div>';
    return html;
  }

  /* ---------------- 搜索页 ---------------- */
  function renderSearch(params) {
    const q = params.get('q') || '';
    const scope = params.get('scope') || 'all';
    const thmRes = searchItems(q, 'theorem');
    const probRes = searchItems(q, 'problem');
    const allRes = searchItems(q, 'all');
    const viewRes = scope === 'theorem' ? thmRes : scope === 'problem' ? probRes : allRes;

    let html = '<div class="main-inner">';
    html += '<div class="search-head"><div class="crumbs"><a href="#/">总览</a><span class="sep-dot">/</span><span>搜索</span></div>'
      + '<h1>' + (q ? '“<em>' + escHtml(q) + '</em>” 的搜索结果' : '搜索') + '</h1>'
      + '<div class="search-tabs">'
      + searchTab('全部', 'all', allRes.length, q, scope)
      + searchTab('定理 / 定义', 'theorem', thmRes.length, q, scope)
      + searchTab('题目', 'problem', probRes.length, q, scope)
      + '</div></div>';

    if (!q) {
      html += '<div class="panel" style="color:var(--muted)">在顶部搜索框输入关键词，或按 <kbd>/</kbd> 聚焦定理搜索、<kbd>P</kbd> 聚焦题目搜索。</div>';
    } else if (!viewRes.length) {
      html += '<div class="panel"><div style="font-size:15px;margin-bottom:6px">没有找到匹配的条目</div>'
        + '<div class="small muted">可以试试：定理编号（如“定理 2-3”）、知识点（如“逆矩阵”“混合积”）、题目类型（如“习题 1-1”）。</div></div>';
    } else {
      html += '<div class="result-meta"><span>找到 <b>' + viewRes.length + '</b> 条结果</span><span>按相关度排序</span></div>';
      html += '<div class="item-list">';
      viewRes.forEach(it => {
        const terms = queryTerms(q);
        html += '<a class="item-row" href="' + hrefFor(it) + '">'
          + '<span class="ir-label" title="' + escHtml(it.label) + '">' + escHtml(it.label) + '</span>'
          + '<span class="ir-main"><span class="ir-title">' + highlight(it.title, terms) + '</span>'
          + '<span class="snippet">' + snippetFor(it, terms) + '</span></span>'
          + '<span class="ir-meta">' + kindBadge(it.kind) + '</span>'
          + '<span class="ir-arrow">›</span></a>';
      });
      html += '</div>';
    }
    html += footer();
    html += '</div>';
    return html;
  }
  function searchTab(label, key, n, q, scope) {
    const active = scope === key;
    return '<a class="' + (active ? 'on' : '') + '" href="#/search?q=' + encodeURIComponent(q) + '&scope=' + key + '">'
      + label + '<span class="n">' + n + '</span></a>';
  }
  function mergeResults(a, b) {
    const seen = new Set();
    return a.concat(b).filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
  }
  function highlight(text, terms) {
    let out = escHtml(text);
    terms.filter(t => t.length >= 2).forEach(t => {
      try { out = out.replace(new RegExp(escRe(escHtml(t)), 'ig'), x => '<mark>' + x + '</mark>'); } catch (e) { }
    });
    return out;
  }

  /* ---------------- 收藏 / 最近 ---------------- */
  function renderBookmarks() {
    const list = bookmarks.map(id => BY_ID.get(id)).filter(Boolean);
    let html = '<div class="main-inner">';
    html += '<div class="page-head"><h1>我的收藏</h1><div class="ph-sub">收藏保存在本机浏览器中，换设备不会同步。</div></div>';
    if (!list.length) {
      html += '<div class="panel" style="color:var(--muted)">还没有收藏。进入任意定理或题目，点右上角“收藏”。</div>';
    } else {
      html += '<div class="result-meta"><span>共 <b>' + list.length + '</b> 条</span><span>按收藏顺序</span></div><div class="item-list">';
      list.forEach(it => { html += itemRow(it, { showChapter: true }); });
      html += '</div>';
    }
    html += footer();
    html += '</div>';
    return html;
  }

  function renderRecent() {
    const list = recent.map(id => BY_ID.get(id)).filter(Boolean);
    let html = '<div class="main-inner">';
    html += '<div class="page-head"><h1>最近浏览</h1><div class="ph-sub">最多保留 24 条，仅存于本机。</div></div>';
    if (!list.length) {
      html += '<div class="panel" style="color:var(--muted)">还没有浏览记录。</div>';
    } else {
      html += '<div class="item-list">';
      list.forEach(it => { html += itemRow(it, { showChapter: true }); });
      html += '</div>';
    }
    html += footer();
    html += '</div>';
    return html;
  }

  /* ---------------- 页脚 / 404 ---------------- */
  function footer() {
    const meta = DATA.meta || {};
    return '<footer class="app-footer"><span>' + escHtml(meta.source || '') + ' · 第 1–4 章</span>'
      + '<span>公式由教材原页转录，细节以<a href="assets/textbook.pdf" target="_blank" rel="noopener">教材原文</a>为准 · 个人学习用途</span></footer>';
  }
  function notFound(msg) {
    return '<div class="main-inner"><div class="page-head"><h1>' + escHtml(msg) + '</h1>'
      + '<div class="ph-sub">页面可能已移动。回到<a href="#/">总览</a>，或从左侧目录重新进入。</div></div></div>';
  }

  /* ---------------- 页面渲染总控 ---------------- */
  let pendingFocus = null;

  function render() {
    const { path, params } = parseRoute();
    let html = '';
    pendingFocus = null;

    if (path === '/' || path === '') html = renderHome();
    else if (path.startsWith('/chapter/')) html = renderChapter(decodeURIComponent(path.split('/')[2] || ''));
    else if (path.startsWith('/section/')) {
      const r = renderSection(decodeURIComponent(path.split('/')[2] || ''), params);
      if (typeof r === 'string') html = r;
      else { html = r.html; pendingFocus = r.focus; }
    }
    else if (path === '/theorems' || path === '/problems') html = renderLibrary(path.slice(1), params);
    else if (path.startsWith('/item/')) html = renderItem(decodeURIComponent(path.split('/')[2] || ''));
    else if (path === '/topics') html = renderTopics();
    else if (path.startsWith('/topic/')) html = renderTopic(decodeURIComponent(path.split('/')[2] || ''));
    else if (path === '/search') html = renderSearch(params);
    else if (path === '/bookmarks') html = renderBookmarks();
    else if (path === '/recent') html = renderRecent();
    else html = notFound('页面不存在');

    $('#view').innerHTML = html;
    renderSidebar();
    updateTopnav(path);
    document.body.classList.remove('drawer-open');
    $('#drawer-mask').hidden = true;

    // 焦点定位
    if (pendingFocus) {
      const secNum = decodeURIComponent(path.split('/')[2] || '');
      const target = document.getElementById('sub-' + pendingFocus) ||
        Array.from(document.querySelectorAll('.sub-head')).find(el => el.textContent.includes(pendingFocus));
      if (target) {
        setTimeout(() => target.scrollIntoView({ block: 'start' }), 60);
      }
    } else {
      window.scrollTo(0, 0);
    }

    if (path.startsWith('/item/')) {
      const id = decodeURIComponent(path.split('/')[2] || '');
      const it = BY_ID.get(id);
      if (it) document.title = it.label + ' ' + it.title + ' · 线性代数交互讲义';
      else document.title = '线性代数与解析几何 · 交互讲义';
    } else {
      document.title = '线性代数与解析几何 · 交互讲义 | 第 1–4 章';
    }
  }

  function updateTopnav(path) {
    $$('.topnav > a').forEach(a => {
      const target = a.getAttribute('href').replace('#', '');
      a.classList.toggle('active', path === target);
    });
  }

  /* ---------------- 搜索框 ---------------- */
  let popScope = 'all';
  let popItems = [];
  let popSel = -1;

  function buildPop(q, scope, anchor) {
    const pop = $('#search-pop');
    const res = searchItems(q, scope);
    popItems = res.slice(0, 9);
    popSel = -1;
    if (!q.trim()) { pop.hidden = true; return; }
    if (!res.length) {
      pop.innerHTML = '<div class="sp-empty">没有匹配的' + (scope === 'theorem' ? '定理' : scope === 'problem' ? '题目' : '条目') + '。换个关键词试试。</div>';
    } else {
      let inner = '<div class="sp-head"><span>' + (scope === 'theorem' ? '定理 / 定义' : scope === 'problem' ? '题目' : '全部条目') + '</span><span>共 ' + res.length + ' 条 · 回车查看全部</span></div>';
      let lastKind = null;
      popItems.forEach((it, i) => {
        if (it.kind !== lastKind) {
          inner += '<div class="sp-group-title">' + (KIND_NAME[it.kind] || '') + '</div>';
          lastKind = it.kind;
        }
        inner += '<a class="sp-row" data-i="' + i + '" href="' + hrefFor(it) + '">'
          + '<span class="r-label">' + escHtml(it.label) + '</span>'
          + '<span class="r-title">' + escHtml(it.title) + '</span>'
          + '<span class="r-sub">' + (isTheory(it) ? it._relatedProblems.length + ' 题' : it._refIds.length + ' 定理') + '</span></a>';
      });
      inner += '<button class="sp-more" data-search="' + escHtml(q) + '" data-scope="' + scope + '">查看全部 ' + res.length + ' 条结果 →</button>';
      pop.innerHTML = inner;
    }
    pop.hidden = false;
    positionPop(anchor);
  }

  function positionPop(anchor) {
    const pop = $('#search-pop');
    const r = anchor.getBoundingClientRect();
    const w = Math.min(620, window.innerWidth - 24);
    let left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    if (window.innerWidth < 520) { left = 12; }
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.width = w + 'px';
  }

  function bindSearch(input, scope) {
    const handler = debounce(() => {
      popScope = scope;
      buildPop(input.value, scope, input);
    }, 100);
    input.addEventListener('focus', () => { if (input.value.trim()) { popScope = scope; buildPop(input.value, scope, input); } });
    input.addEventListener('input', handler);
    input.addEventListener('keydown', e => {
      const pop = $('#search-pop');
      if (e.key === 'Escape') { pop.hidden = true; input.blur(); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        pop.hidden = true;
        go('#/search?q=' + encodeURIComponent(q) + '&scope=' + (scope === 'all' ? 'all' : scope));
        input.blur();
        return;
      }
      if (pop.hidden) return;
      const rows = $$('.sp-row', pop);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!rows.length) return;
        popSel = (popSel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
        rows.forEach((r, i) => r.classList.toggle('sel', i === popSel));
        rows[popSel].scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function renderMobileResults(q) {
    const box = $('#msearch-results');
    if (!box) return;
    if (!q.trim()) {
      box.innerHTML = '<div class="ms-hint">输入定理编号（如“定理 2-3”）、知识点（如“逆矩阵”“混合积”）或题目类型（如“习题 1-1”）。</div>';
      return;
    }
    const res = searchItems(q, 'all').slice(0, 30);
    if (!res.length) { box.innerHTML = '<div class="ms-hint">没有匹配的条目，换个关键词试试。</div>'; return; }
    let html = '<div class="ms-group">找到 ' + res.length + ' 条</div>';
    res.forEach(it => { html += itemRow(it); });
    box.innerHTML = html;
  }

  /* ---------------- 模态框 ---------------- */
  let zoomWidth = 100;
  function openPage(page, title) {
    const modal = $('#modal');
    const p = parseInt(page, 10);
    if (!p) return;
    $('#modal-img').src = 'assets/pages/p' + pad3(p) + '.jpg';
    $('#modal-title').textContent = (title ? title + ' · ' : '') + '教材 p.' + (p - 10) + '（PDF ' + p + '）';
    $('#modal-pdf').href = 'assets/textbook.pdf#page=' + p;
    zoomWidth = 100;
    $('#modal-img').style.width = '100%';
    modal.hidden = false;
    document.body.classList.add('no-scroll');
  }
  function closeModal() {
    $('#modal').hidden = true;
    document.body.classList.remove('no-scroll');
  }
  function setZoom(delta) {
    zoomWidth = Math.max(60, Math.min(260, zoomWidth + delta));
    $('#modal-img').style.width = zoomWidth + '%';
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindGlobal() {
    bindSearch($('#search-theorem'), 'theorem');
    bindSearch($('#search-problem'), 'problem');
    const msi = $('#msearch-input');
    if (msi) msi.addEventListener('input', debounce(() => renderMobileResults(msi.value), 100));

    document.addEventListener('click', e => {
      const t = e.target;
      if (!t.closest('.searchbox') && !t.closest('#search-pop')) $('#search-pop').hidden = true;

      const spRow = t.closest('.sp-row');
      if (spRow && spRow.getAttribute('href')) {
        $('#search-pop').hidden = true;
        const inp = t.closest('.searchbox') ? t.closest('.searchbox').querySelector('input') : null;
        setTimeout(() => { const active = document.activeElement; if (active && active.blur) active.blur(); }, 0);
      }
      const more = t.closest('[data-search]');
      if (more) {
        $('#search-pop').hidden = true;
        go('#/search?q=' + encodeURIComponent(more.getAttribute('data-search')) + '&scope=' + more.getAttribute('data-scope'));
      }

      const bm = t.closest('[data-bookmark]');
      if (bm) {
        e.preventDefault();
        const id = bm.getAttribute('data-bookmark');
        const on = toggleBookmark(id);
        bm.classList.toggle('on', on);
        bm.querySelector('span').textContent = on ? '已收藏' : '收藏';
      }

      const pg = t.closest('[data-page]');
      if (pg) {
        e.preventDefault();
        openPage(pg.getAttribute('data-page'), pg.getAttribute('data-title') || '');
      }

      if (t.closest('#modal-close') || t.closest('.modal-backdrop')) closeModal();
      if (t.id === 'zoom-in') setZoom(20);
      if (t.id === 'zoom-out') setZoom(-20);

      if (t.closest('#mobile-search')) {
        $('#msearch').hidden = false;
        document.body.classList.add('no-scroll');
        setTimeout(() => { const i = $('#msearch-input'); if (i) i.focus(); }, 30);
        renderMobileResults('');
      }
      if (t.closest('#msearch-close')) {
        $('#msearch').hidden = true;
        $('#msearch-input').value = '';
        document.body.classList.remove('no-scroll');
      }
      if (t.closest('#msearch .item-row')) {
        $('#msearch').hidden = true;
        document.body.classList.remove('no-scroll');
      }

      const menu = t.closest('#menu-toggle');
      if (menu) {
        document.body.classList.toggle('drawer-open');
        $('#drawer-mask').hidden = !document.body.classList.contains('drawer-open');
      }
      const mask = t.closest('#drawer-mask');
      if (mask) {
        document.body.classList.remove('drawer-open');
        mask.hidden = true;
      }
      // 移动端点目录后收起
      if (t.closest('.sidebar a') && window.innerWidth <= 940) {
        document.body.classList.remove('drawer-open');
        $('#drawer-mask').hidden = true;
      }

      const theme = t.closest('#theme-toggle');
      if (theme) {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        lsSet(LS.theme, next);
      }
    });

    document.addEventListener('keydown', e => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (!$('#modal').hidden) closeModal();
        if (!$('#msearch').hidden) {
          $('#msearch').hidden = true;
          $('#msearch-input').value = '';
          document.body.classList.remove('no-scroll');
        }
        $('#search-pop').hidden = true;
        if (document.body.classList.contains('drawer-open')) {
          document.body.classList.remove('drawer-open');
          $('#drawer-mask').hidden = true;
        }
      }
      if ((e.key === '/' || e.key === 'p' || e.key === 'P') && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const input = e.key === '/' ? $('#search-theorem') : $('#search-problem');
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
      }
    });

    window.addEventListener('hashchange', render);
    window.addEventListener('resize', debounce(() => {
      if (!$('#search-pop').hidden) {
        const inp = document.activeElement;
        if (inp && inp.classList.contains('searchbox') === false && inp.tagName === 'INPUT') positionPop(inp);
      }
    }, 120));

    // 侧栏内滚动条独立
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    bindGlobal();
    if (!ITEMS.length) {
      $('#view').innerHTML = '<div class="main-inner"><div class="panel">数据尚未生成。请先运行数据构建脚本（build_data.py）。</div></div>';
      return;
    }
    render();
    // 初始 hash 为空时补一个，便于返回
    if (!location.hash) history.replaceState(null, '', '#/');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
