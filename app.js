/* ============================================================
   马原刷题 · app logic
   ============================================================ */
(function () {
  'use strict';

  const DATA = window.QUIZ_DATA;
  if (!DATA) {
    document.body.innerHTML = '<p style="padding:40px;font:16px -apple-system,sans-serif">题库数据加载失败，请重新下载完整文件夹。</p>';
    return;
  }

  const CH = DATA.chapters;
  const QS = DATA.questions;
  const QMAP = new Map(QS.map((q) => [q.id, q]));
  const BY_CH = CH.map(() => []);
  QS.forEach((q) => BY_CH[q.c].push(q));

  const LS_KEY = 'msx.v1';
  const DEFAULT_SETTINGS = { theme: 'auto', font: 17, autoNext: true, swipeTip: false };
  const CARD_LETTERS = ['A', 'B', 'C', 'D'];
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  /* ------------------------------------------------------------
     small utilities
     ------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const pad2 = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fmtToday() {
    const d = new Date();
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function fmtDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
    return `${m}:${pad2(s)}`;
  }

  function fmtClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${pad2(m)}:${pad2(s)}`;
  }

  function fmtRecordTime(ts) {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function chLabel(c) {
    return c.name === '导论' ? '导论' : `${c.name} · ${c.title}`;
  }

  function chShort(c) {
    return c.name;
  }

  /* ------------------------------------------------------------
     icons
     ------------------------------------------------------------ */
  const ICONS = {
    chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
    chevronRight: '<path d="M9 18l6-6-6-6"/>',
    star: '<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    home: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    book: '<path d="M4 4.6A2.6 2.6 0 016.6 2H20v20H6.6A2.6 2.6 0 014 19.4z"/><path d="M4 19.4A2.6 2.6 0 016.6 17H20"/>',
    starTab: '<path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.5 0-3-2-5-3.5-6.5C14 7.5 13 5.5 13 3c0 0-4 2-4 6 0 1.5.5 2.5.5 2.5S8 10 7 8c-1 1.5-2 3.5-2 6.5C5 19.3 8 22 12 22z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
    rotate: '<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    spark: '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>',
  };

  function icon(name, size = 22, cls = '') {
    return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ------------------------------------------------------------
     store
     ------------------------------------------------------------ */
  function loadStore() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { raw = {}; }
    const s = Object.assign({
      progress: {}, wrong: {}, fav: {}, stats: { days: {} }, exams: [], last: null, settings: {},
    }, raw);
    s.settings = Object.assign({}, DEFAULT_SETTINGS, raw.settings || {});
    if (!s.progress || typeof s.progress !== 'object') s.progress = {};
    if (!s.wrong || typeof s.wrong !== 'object') s.wrong = {};
    if (!s.fav || typeof s.fav !== 'object') s.fav = {};
    if (!s.stats || typeof s.stats !== 'object') s.stats = { days: {} };
    if (!s.stats.days || typeof s.stats.days !== 'object') s.stats.days = {};
    if (!Array.isArray(s.exams)) s.exams = [];
    Object.keys(s.wrong).forEach((id) => {
      const w = s.wrong[id];
      if (!w || typeof w !== 'object') {
        s.wrong[id] = { n: 1, ts: Date.now(), resolved: 0, first: 0 };
        return;
      }
      if (typeof w.n !== 'number') w.n = 1;
      if (typeof w.ts !== 'number') w.ts = Date.now();
      if (w.resolved === undefined) w.resolved = 0;
      if (w.first === undefined) w.first = 0;
    });
    return s;
  }

  let store = loadStore();

  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (e) { /* storage full/private */ }
  }

  function todayStats() {
    return store.stats.days[dayKey()] || { a: 0, c: 0 };
  }

  function totals() {
    let a = 0, c = 0;
    Object.values(store.stats.days).forEach((d) => { a += d.a || 0; c += d.c || 0; });
    return { a, c, acc: a ? Math.round((c / a) * 100) : 0 };
  }

  function streak() {
    let n = 0;
    const d = new Date();
    if (!store.stats.days[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (store.stats.days[dayKey(d)] && (store.stats.days[dayKey(d)].a || 0) > 0) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function chapterProgress(i) {
    const qs = BY_CH[i];
    let done = 0;
    qs.forEach((q) => { if (store.progress[q.id]) done++; });
    return { done, total: qs.length, pct: pct(done, qs.length) };
  }

  function wrongAll() {
    return Object.keys(store.wrong)
      .filter((id) => QMAP.has(id))
      .sort((a, b) => (store.wrong[b].ts || 0) - (store.wrong[a].ts || 0));
  }

  function wrongIds(scope = 'all') {
    const all = wrongAll();
    if (scope === 'first') return all.filter((id) => !!store.wrong[id].first);
    if (scope === 'todo') return all.filter((id) => !store.wrong[id].resolved);
    if (scope === 'done') return all.filter((id) => !!store.wrong[id].resolved);
    return all;
  }

  function wrongCounts() {
    const all = wrongAll();
    let first = 0, todo = 0, done = 0;
    all.forEach((id) => {
      const w = store.wrong[id];
      if (w.first) first++;
      if (w.resolved) done++; else todo++;
    });
    return { all: all.length, first, todo, done };
  }

  // Questions that are still worth re-drilling (not yet marked mastered)
  function wrongList() {
    return wrongIds('todo');
  }

  function favList() {
    return Object.keys(store.fav)
      .filter((id) => QMAP.has(id))
      .sort((a, b) => (store.fav[b] || 0) - (store.fav[a] || 0));
  }

  function isFav(id) { return !!store.fav[id]; }

  /* ------------------------------------------------------------
     theme / font
     ------------------------------------------------------------ */
  function effectiveTheme() {
    const t = store.settings.theme;
    if (t === 'light' || t === 'dark') return t;
    return media.matches ? 'dark' : 'light';
  }

  function applyTheme() {
    const t = effectiveTheme();
    document.documentElement.dataset.theme = t;
    let meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = t === 'dark' ? '#0b0b10' : '#f4f4f7';
  }

  function applyFont() {
    document.documentElement.style.setProperty('--q-font', `${store.settings.font}px`);
  }

  /* ------------------------------------------------------------
     toast / overlay / modal
     ------------------------------------------------------------ */
  let toastTimer = null;
  function toast(msg, ms = 1800) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function mountOverlay(html) {
    $('#overlay-root').innerHTML = html;
  }

  function closeOverlay() {
    $('#overlay-root').innerHTML = '';
  }

  let modalCallback = null;

  function showModal(opts) {
    const { title, body, confirmText = '确定', cancelText = '取消', danger = false, onConfirm } = opts;
    modalCallback = onConfirm || null;
    mountOverlay(`
      <div class="modal">
        <div class="modal-card" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          ${body ? `<p>${esc(body)}</p>` : ''}
          <div class="modal-actions">
            <button class="btn btn-secondary" data-modal-close>${esc(cancelText)}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-confirm>${esc(confirmText)}</button>
          </div>
        </div>
      </div>`);
  }

  function closeModal() {
    modalCallback = null;
    closeOverlay();
  }

  /* ------------------------------------------------------------
     navigation
     ------------------------------------------------------------ */
  const state = {
    tab: 'home',
    wrongFilter: 'all',
    scroll: { home: 0, wrong: 0, fav: 0, me: 0 },
  };
  const TABS = [
    { id: 'home', label: '首页', icon: 'home' },
    { id: 'wrong', label: '错题', icon: 'book' },
    { id: 'fav', label: '收藏', icon: 'starTab' },
    { id: 'me', label: '我的', icon: 'user' },
  ];

  function renderTabbar() {
    $('#tabbar').innerHTML = TABS.map((t) => `
      <button class="tab-item" data-tab="${t.id}" aria-label="${t.label}">
        <span class="tab-icon-wrap">${icon(t.icon, 23)}</span>
        <span>${t.label}</span>
      </button>`).join('');
    updateTabbar();
  }

  function updateTabbar() {
    $$('#tabbar .tab-item').forEach((el) => {
      const on = el.dataset.tab === state.tab;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function switchTab(tab, opts = {}) {
    if (tab === state.tab) {
      if (opts.top !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!document.body.classList.contains('practice-open')) {
      state.scroll[state.tab] = window.scrollY;
    }
    state.tab = tab;
    renderTab({ animate: true, restore: true });
  }

  function renderTab(opts = {}) {
    const view = $('#view');
    if (!opts.restore && !document.body.classList.contains('practice-open')) {
      state.scroll[state.tab] = window.scrollY;
    }
    view.dataset.screen = state.tab;
    let html;
    if (state.tab === 'home') html = homeHTML();
    else if (state.tab === 'wrong') html = wrongHTML();
    else if (state.tab === 'fav') html = favHTML();
    else html = meHTML();
    view.innerHTML = `<div class="tab-page">${html}</div>`;
    updateTabbar();
    const page = $('.tab-page', view);
    if (opts.animate && page) page.classList.add('enter');
    window.scrollTo(0, opts.top ? 0 : (state.scroll[state.tab] || 0));
  }

  /* ------------------------------------------------------------
     home
     ------------------------------------------------------------ */
  function lastSummary() {
    const l = store.last;
    if (!l || !Array.isArray(l.ids) || !l.ids.length) return null;
    const answered = Object.keys(l.answers || {}).filter((id) => l.answers[id] && l.answers[id].choice).length;
    return {
      title: l.title || '继续练习',
      index: clamp(l.index || 0, 0, l.ids.length - 1),
      total: l.ids.length,
      answered,
      pct: pct(answered, l.ids.length),
    };
  }

  function ringSVG(percent) {
    const C = 194.78;
    const p = clamp(percent, 0, 100);
    const off = C * (1 - p / 100);
    return `<div class="ring">
      <svg viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="31" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="6"/>
        <circle cx="38" cy="38" r="31" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 38 38)"/>
      </svg>
      <div class="ring-label">${Math.round(p)}%<small>完成</small></div>
    </div>`;
  }

  function heroHTML() {
    const last = lastSummary();
    if (last) {
      return `<button class="hero" data-act="continue" aria-label="继续上次练习">
        <span class="hero-main">
          <span class="hero-label">继续练习</span>
          <span class="hero-title">${esc(last.title)}</span>
          <span class="hero-sub">已答 ${last.answered} / ${last.total} 题 · 第 ${last.index + 1} 题</span>
          <span class="hero-cta">继续刷题 ${icon('arrowRight', 14)}</span>
        </span>
        ${ringSVG(last.pct)}
      </button>`;
    }
    const total = BY_CH[1] ? BY_CH[1].filter((q) => q.t === 's').length : 0;
    return `<button class="hero" data-act="start" data-mode="chapter-default" aria-label="从第一章开始">
      <span class="hero-main">
        <span class="hero-label">开始学习</span>
        <span class="hero-title">第一章 · 单项选择</span>
        <span class="hero-sub">共 ${total} 题 · 循序渐进，打好基础</span>
        <span class="hero-cta">开始刷题 ${icon('arrowRight', 14)}</span>
      </span>
      ${ringSVG(0)}
    </button>`;
  }

  function quickItem(mode, iconName, tone, title, sub) {
    return `<button class="quick" data-act="start" data-mode="${mode}">
      <span class="quick-icon ${tone}">${icon(iconName, 20)}</span>
      <span class="quick-text"><b>${title}</b><span>${sub}</span></span>
      ${icon('chevronRight', 17, 'chev')}
    </button>`;
  }

  function homeHTML() {
    const t = todayStats();
    const acc = t.a ? Math.round((t.c / t.a) * 100) : 0;
    const st = streak();
    const wc = wrongCounts();
    const wrongSub = wc.todo ? `待巩固 ${wc.todo}题` : wc.all ? `已掌握 ${wc.all}题` : '暂无错题';
    const total = DATA.meta.count;

    return `
    <header class="home-top">
      <div>
        <div class="kicker">马克思主义基本原理</div>
        <h1 class="greeting">${greeting()}，同学</h1>
        <div class="today-line">${fmtToday()}<span class="dot-sep"></span>题库 ${total} 题</div>
      </div>
      <button class="avatar" data-act="go-me" aria-label="我的学习档案">马</button>
    </header>

    ${heroHTML()}

    <div class="stat-row">
      <div class="stat-card"><b>${t.a}<span class="unit">题</span></b><span>今日已刷</span></div>
      <div class="stat-card"><b>${acc}<span class="unit">%</span></b><span>今日正确率</span></div>
      <div class="stat-card"><b>${st}<span class="unit">天</span></b><span>连续学习</span></div>
    </div>

    <h2 class="section-title">快速开始</h2>
    <div class="quick-grid">
      ${quickItem('seq', 'list', 'violet', '顺序练习', `全部 ${total} 题`)}
      ${quickItem('random', 'shuffle', 'teal', '随机练习', '随机 30 题')}
      ${quickItem('exam', 'clock', 'amber', '模拟考试', '100题 · 90分')}
      ${quickItem('wrong', 'target', 'red', '错题重做', wrongSub)}
    </div>

    <button class="learn-card" data-act="start-learn">
      <span class="learn-icon">${icon('book', 21)}</span>
      <span class="learn-text"><b>背题模式</b><span>直接显示答案，适合考前速记</span></span>
      <span class="learn-chip">无需作答</span>
      ${icon('chevronRight', 17, 'chev')}
    </button>

    <div class="section-head">
      <h2>章节练习</h2>
      <span>共 ${total} 题</span>
    </div>
    <div class="card chapter-list">
      ${CH.map((c, i) => {
        const p = chapterProgress(i);
        return `<button class="chapter-row" data-act="open-chapter" data-c="${i}">
          <span class="ch-num">${i === 0 ? '导' : pad2(i)}</span>
          <span class="ch-main">
            <span class="ch-title">${esc(chLabel(c))}</span>
            <span class="ch-meta">${p.total} 题<span class="dot-sep"></span>已刷 ${p.done} 题</span>
            <span class="ch-bar"><i style="width:${p.pct}%"></i></span>
          </span>
          <span class="ch-pct">${p.pct}%</span>
          ${icon('chevronRight', 17, 'ch-chev')}
        </button>`;
      }).join('')}
    </div>

    <p class="footnote"><b>《马克思主义基本原理》机考题库（2023.05版）</b><br>共 ${total} 题 · 单选 ${DATA.meta.single} · 多选 ${DATA.meta.multiple}<br>数据仅保存在本机，卸载或清除浏览器数据会丢失记录。</p>`;
  }

  /* ------------------------------------------------------------
     wrong / fav lists
     ------------------------------------------------------------ */
  function questionRow(q, opts) {
    const { removeAct } = opts;
    const state = opts.stateHTML
      ? `<span class="q-row-cnt ${opts.stateClass || ''}">${opts.stateHTML}</span>`
      : '';
    const tag = opts.tag ? `<span class="q-tag">${opts.tag}</span>` : '';
    return `<div class="q-row">
      <button class="q-row-main" data-act="${opts.openAct}" data-id="${q.id}" data-scope="${opts.scope || ''}">
        <span class="q-row-top">
          <span class="pill ${q.t === 'm' ? 'pill-multi' : ''}">${q.t === 's' ? '单选' : '多选'}</span>
          <span class="q-row-ch">${esc(chShort(CH[q.c]))}</span>
          ${tag}
          ${state}
        </span>
        <span class="q-row-stem">${esc(q.q)}</span>
      </button>
      <button class="q-row-del" data-act="${removeAct}" data-id="${q.id}" aria-label="移除">${icon('trash', 18)}</button>
    </div>`;
  }

  function wrongHTML() {
    const counts = wrongCounts();
    const all = wrongAll();
    const ids = wrongIds(state.wrongFilter);

    const chips = `<div class="chips">
      <button class="chip ${state.wrongFilter === 'all' ? 'active' : ''}" data-act="filter-wrong" data-f="all">全部 ${counts.all}</button>
      <button class="chip ${state.wrongFilter === 'first' ? 'active' : ''}" data-act="filter-wrong" data-f="first">一刷错题 ${counts.first}</button>
      <button class="chip ${state.wrongFilter === 'todo' ? 'active' : ''}" data-act="filter-wrong" data-f="todo">待巩固 ${counts.todo}</button>
      <button class="chip ${state.wrongFilter === 'done' ? 'active' : ''}" data-act="filter-wrong" data-f="done">已掌握 ${counts.done}</button>
    </div>`;

    if (!counts.all) {
      return `<header class="page-head">
        <div class="kicker">REVIEW</div>
        <h1>错题本</h1>
        <p>第一遍做错的题目会自动收进来，形成你的专属错题集。</p>
      </header>
      <div class="empty">
        <div class="empty-art">${icon('check', 42)}</div>
        <h3>错题本是空的</h3>
        <p>去刷几道题吧。第一次做错的题目会自动收进这里，之后答对会标记「已掌握」，记录不会消失。</p>
        <button class="btn btn-primary" data-act="start" data-mode="random">去刷 30 题</button>
      </div>`;
    }

    return `<header class="page-head">
      <div class="page-head-row">
        <div>
          <div class="kicker">REVIEW</div>
          <h1>错题本</h1>
          <p>共 ${counts.all} 题 · 一刷错题自动收录，答对标记已掌握</p>
        </div>
        <button class="head-action" data-act="wrong-start" ${ids.length ? '' : 'disabled'}>重做当前</button>
      </div>
    </header>
    ${chips}
    ${ids.length ? `<div class="q-list">
      ${ids.map((id) => {
        const w = store.wrong[id] || {};
        return questionRow(QMAP.get(id), {
          openAct: 'open-wrong',
          removeAct: 'rm-wrong',
          scope: state.wrongFilter,
          tag: w.first ? '一刷' : '',
          stateHTML: w.resolved ? '已掌握' : `错 ${w.n || 1} 次`,
          stateClass: w.resolved ? 'done' : '',
        });
      }).join('')}
    </div>` : `<div class="empty" style="margin-top:5vh">
      <div class="empty-art">${icon(state.wrongFilter === 'done' ? 'target' : 'check', 40)}</div>
      <h3>${state.wrongFilter === 'todo' ? '待巩固的错题已清空' : '这个筛选下还没有题目'}</h3>
      <p>${state.wrongFilter === 'todo' ? '所有错题都已标记为已掌握。可以切换到「全部」再做一遍。' : '换个筛选看看，或继续刷题积累错题。'}</p>
      <button class="btn btn-secondary" data-act="filter-wrong" data-f="all">查看全部 ${counts.all} 题</button>
    </div>`}`;
  }

  function favHTML() {
    const all = favList();
    if (!all.length) {
      return `<header class="page-head">
        <div class="kicker">FAVORITES</div>
        <h1>收藏</h1>
        <p>遇到的重点题、易错题，可以点星标收藏。</p>
      </header>
      <div class="empty">
        <div class="empty-art">${icon('star', 42)}</div>
        <h3>还没有收藏</h3>
        <p>刷题时点击右上角的星标，就能把题目收进这里，考前集中复习。</p>
        <button class="btn btn-primary" data-act="start" data-mode="seq">去刷题</button>
      </div>`;
    }
    return `<header class="page-head">
      <div class="page-head-row">
        <div>
          <div class="kicker">FAVORITES</div>
          <h1>收藏</h1>
          <p>共 ${all.length} 题 · 你的重点清单</p>
        </div>
        <button class="head-action" data-act="start" data-mode="fav">开始复习</button>
      </div>
    </header>
    <div class="q-list">
      ${all.map((id) => questionRow(QMAP.get(id), {
        openAct: 'open-fav', removeAct: 'rm-fav',
      })).join('')}
    </div>`;
  }

  /* ------------------------------------------------------------
     me / stats
     ------------------------------------------------------------ */
  function meHTML() {
    const tot = totals();
    const st = streak();
    const unique = Object.keys(store.progress).length;
    const days = Object.keys(store.stats.days).filter((k) => (store.stats.days[k].a || 0) > 0).length;
    const exams = store.exams.slice().sort((a, b) => b.ts - a.ts).slice(0, 5);
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    const settings = store.settings;
    const themeLabel = settings.theme === 'auto' ? '自动' : settings.theme === 'light' ? '浅色' : '深色';

    return `<header class="page-head">
      <div class="kicker">PROFILE</div>
      <h1>我的</h1>
      <p>学习记录只保存在这台设备上。</p>
    </header>

    <div class="profile-card">
      <div class="profile-avatar">马</div>
      <div>
        <div class="profile-name">马原学习档案</div>
        <div class="profile-sub">已坚持 ${days} 天 · 累计作答 ${tot.a} 次</div>
      </div>
      <span class="profile-badge">${icon('flame', 13)} 连续 ${st} 天</span>
    </div>

    <div class="me-stats">
      <div class="me-stat"><b>${unique}</b><span>已刷题数</span></div>
      <div class="me-stat"><b>${tot.acc}%</b><span>总正确率</span></div>
      <div class="me-stat"><b>${tot.a}</b><span>累计作答</span></div>
    </div>

    <div class="section-head"><h2>章节掌握度</h2><span>${DATA.meta.count} 题</span></div>
    <div class="card progress-card">
      ${CH.map((c, i) => {
        const p = chapterProgress(i);
        return `<div class="mini-ch">
          <div class="mini-ch-top"><b>${esc(c.name)}</b><span>${p.done}/${p.total} · ${p.pct}%</span></div>
          <div class="mini-bar"><i style="width:${p.pct}%"></i></div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-head"><h2>模拟考试</h2><span>最近 ${exams.length} 次</span></div>
    ${exams.length ? `<div class="exam-list">
      ${exams.map((e) => {
        const tone = e.score >= 85 ? 'good' : e.score >= 60 ? 'mid' : 'low';
        return `<div class="exam-row">
          <div class="exam-score ${tone}">${e.score}</div>
          <div class="exam-info"><b>模拟考试 · ${e.total} 题</b><span>正确 ${e.correct} · 错误 ${e.wrong} · 未答 ${e.unanswered}</span></div>
          <span class="exam-date">${fmtRecordTime(e.ts)}</span>
        </div>`;
      }).join('')}
    </div>` : `<div class="card about-card"><p>还没有考试记录。完成一次模拟考试后，成绩会保存在这里。</p></div>`}

    <div class="section-head"><h2>设置</h2></div>
    <div class="card settings-card">
      <div class="setting-row">
        <div><div class="setting-label">外观</div><div class="setting-sub">当前：${themeLabel}</div></div>
        <div class="segmented">
          <button class="${settings.theme === 'auto' ? 'on' : ''}" data-act="theme" data-v="auto">自动</button>
          <button class="${settings.theme === 'light' ? 'on' : ''}" data-act="theme" data-v="light">浅色</button>
          <button class="${settings.theme === 'dark' ? 'on' : ''}" data-act="theme" data-v="dark">深色</button>
        </div>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">题目字号</div><div class="setting-sub">在答题页生效</div></div>
        <div class="font-step">
          <button data-act="font" data-d="-1" aria-label="缩小字号">A−</button>
          <span class="font-val">${settings.font}px</span>
          <button data-act="font" data-d="1" aria-label="放大字号">A+</button>
        </div>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">答对自动下一题</div><div class="setting-sub">单选题答对后自动跳转</div></div>
        <button class="switch ${settings.autoNext ? 'on' : ''}" data-act="toggle-auto" aria-label="答对自动下一题" aria-pressed="${settings.autoNext}"></button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label danger-text">清除学习数据</div><div class="setting-sub">进度、错题、收藏、成绩</div></div>
        <button class="chip" data-act="clear-data">清除</button>
      </div>
    </div>

    <div class="section-head"><h2>安装到 iPhone</h2></div>
    <div class="install-tip">
      ${icon(standalone ? 'check' : 'download', 20)}
      <div>${standalone
        ? '已从主屏幕运行，可全屏、离线刷题。'
        : '用 Safari 打开本页，点底部「分享」→「添加到主屏幕」，即可像 App 一样全屏使用并离线刷题。'}</div>
    </div>

    <div class="section-head"><h2>关于题库</h2></div>
    <div class="card about-card">
      <p><b>${esc(DATA.meta.source)}</b><br>共 ${DATA.meta.count} 题：单选 ${DATA.meta.single} 题，多选 ${DATA.meta.multiple} 题。</p>
      <p>原题库只提供参考答案，<b>没有文字解析</b>。本应用不虚构解析，答错后可回到教材对应章节核对知识点。</p>
      <p>版本 ${esc(DATA.meta.version)} · 所有记录存储在本机浏览器（localStorage），不会上传。</p>
    </div>
    <p class="footnote">马原刷题 · 为期末复习而做</p>`;
  }

  /* ------------------------------------------------------------
     chapter sheet
     ------------------------------------------------------------ */
  function openChapterSheet(i) {
    const c = CH[i];
    const qs = BY_CH[i];
    const p = chapterProgress(i);
    const singles = qs.filter((q) => q.t === 's');
    const multis = qs.filter((q) => q.t === 'm');
    const doneOf = (arr) => arr.filter((q) => store.progress[q.id]).length;

    mountOverlay(`
      <div class="backdrop"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <h2>${esc(c.name)}</h2>
        <p class="sheet-sub">${esc(c.title)}</p>
        <div class="sheet-stats">
          <div class="sheet-stat"><b>${p.total}</b>总题数</div>
          <div class="sheet-stat"><b>${p.done}</b>已练习</div>
          <div class="sheet-stat"><b>${p.pct}%</b>完成度</div>
        </div>
        <div class="sheet-actions">
          ${singles.length ? `<button class="sheet-action" data-act="start-chapter" data-c="${i}" data-t="s">
            <span class="sa-icon">${icon('check', 19)}</span>
            <span class="sa-text"><b>单项选择题</b><span>已答 ${doneOf(singles)} / ${singles.length}</span></span>
            <span class="sa-count">${singles.length}</span>
            ${icon('chevronRight', 17, 'sa-arrow')}
          </button>` : ''}
          ${multis.length ? `<button class="sheet-action" data-act="start-chapter" data-c="${i}" data-t="m">
            <span class="sa-icon amber">${icon('list', 19)}</span>
            <span class="sa-text"><b>多项选择题</b><span>已答 ${doneOf(multis)} / ${multis.length}</span></span>
            <span class="sa-count">${multis.length}</span>
            ${icon('chevronRight', 17, 'sa-arrow')}
          </button>` : ''}
          <button class="sheet-action" data-act="start-chapter-random" data-c="${i}">
            <span class="sa-icon teal">${icon('shuffle', 19)}</span>
            <span class="sa-text"><b>本章随机练习</b><span>打乱顺序，抽 ${Math.min(20, qs.length)} 题</span></span>
            ${icon('chevronRight', 17, 'sa-arrow')}
          </button>
          <button class="sheet-action" data-act="start-chapter-learn" data-c="${i}">
            <span class="sa-icon amber">${icon('book', 19)}</span>
            <span class="sa-text"><b>背题模式</b><span>直接看答案，本章 ${qs.length} 题</span></span>
            ${icon('chevronRight', 17, 'sa-arrow')}
          </button>
        </div>
      </div>`);
  }

  /* ------------------------------------------------------------
     session lifecycle
     ------------------------------------------------------------ */
  let session = null;
  let timerId = null;
  let currentResult = null;
  let touchStart = null;
  let suppressClickUntil = 0;

  function clearTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function currentQ() {
    return session ? QMAP.get(session.ids[session.index]) : null;
  }

  function openSession(opts) {
    clearTimer();
    closeOverlay();
    if (!document.body.classList.contains('practice-open')) {
      state.scroll[state.tab] = window.scrollY;
    }
    const ids = (opts.ids || []).filter((id) => QMAP.has(id));
    if (!ids.length) { toast('这里还没有题目'); return; }

    session = {
      mode: opts.mode || 'chapter',
      title: opts.title || '练习',
      ids,
      index: clamp(opts.index || 0, 0, ids.length - 1),
      answers: opts.answers ? JSON.parse(JSON.stringify(opts.answers)) : {},
      exam: !!opts.exam,
      review: !!opts.review,
      learn: !!opts.learn,
      submitted: false,
      duration: opts.duration || 0,
      startAt: opts.startAt || Date.now(),
      endsAt: opts.endsAt || (opts.exam ? Date.now() + (opts.duration || 90 * 60000) : 0),
      c: opts.c,
      t: opts.t,
      scope: opts.scope,
      token: Math.random().toString(36).slice(2),
    };

    currentResult = null;
    $('#practice-root').innerHTML = practiceSkeleton();
    document.body.classList.add('practice-open');
    $('#practice').scrollTop = 0;
    renderQuestion();
    if (session.exam) startTimer();
    if (!store.settings.swipeTip) {
      store.settings.swipeTip = true;
      save();
      setTimeout(() => toast('左右滑动可切换上一题 / 下一题'), 800);
    }
  }

  function practiceSkeleton() {
    return `<section class="practice" id="practice" aria-label="答题">
      <header class="practice-head">
        <div class="ph-row">
          <button class="icon-btn" data-act="exit" aria-label="退出">${icon('chevronLeft', 25)}</button>
          <div class="ph-title">
            <b>${esc(session.title)}</b>
            <div class="ph-nav">
              <button class="ph-arrow" data-act="prev" aria-label="上一题" title="上一题">${icon('chevronLeft', 14)}</button>
              <span id="ph-progress"></span>
              <button class="ph-arrow" data-act="next" aria-label="下一题" title="下一题">${icon('chevronRight', 14)}</button>
            </div>
          </div>
          <button class="icon-btn star ${isFav(session.ids[session.index]) ? 'on' : ''}" data-act="fav" aria-label="收藏">${icon('star', 21)}</button>
          <button class="icon-btn" data-act="card" aria-label="答题卡">${icon('grid', 20)}</button>
        </div>
        <div class="exam-status" id="exam-status" hidden>
          <span class="exam-dot"></span>模拟考试
          <b id="timer">90:00</b>
          <button class="exam-submit" data-act="submit">交卷</button>
        </div>
        <div class="progress-line"><i id="ph-bar"></i></div>
      </header>
      <div class="practice-body" id="practice-body"></div>
      <footer class="practice-foot" id="practice-foot"></footer>
    </section>`;
  }

  function updateHeader() {
    if (!session) return;
    const q = currentQ();
    const titleEl = $('.ph-title b');
    if (titleEl) titleEl.textContent = session.title;
    const prog = $('#ph-progress');
    if (prog) prog.textContent = `${session.index + 1} / ${session.ids.length}`;
    const prevBtn = $('.ph-nav [data-act="prev"]');
    if (prevBtn) prevBtn.disabled = session.index === 0;
    const bar = $('#ph-bar');
    if (bar) bar.style.width = `${((session.index + 1) / session.ids.length) * 100}%`;
    const favBtn = $('[data-act="fav"]');
    if (favBtn) favBtn.classList.toggle('on', q ? isFav(q.id) : false);
    const status = $('#exam-status');
    if (status) status.hidden = !session.exam;
  }

  function optionClass(q, label, a) {
    if (!a) return '';
    const sel = (a.choice || '').includes(label);
    const checked = typeof a.ok === 'boolean';
    if (!checked) return sel ? 'selected' : '';
    const correct = q.a.includes(label);
    if (correct) return !a.choice ? 'reveal' : 'correct';
    if (sel) return 'wrong';
    return 'dim';
  }

  function markHTML(q, label, a) {
    if (!a || typeof a.ok !== 'boolean') return '';
    if (optionClass(q, label, a) === 'correct') return icon('check', 17);
    if (optionClass(q, label, a) === 'wrong') return icon('x', 17);
    if (optionClass(q, label, a) === 'reveal') return icon('check', 17);
    return '';
  }

  function bodyHTML(q) {
    const learn = !!session.learn;
    const a = learn ? null : session.answers[q.id];
    const checked = !learn && !!(a && typeof a.ok === 'boolean');
    const canEnterLearn = !learn && !session.exam && !session.review;
    return `
      <div class="q-meta">
        <span class="pill ${q.t === 'm' ? 'pill-multi' : ''}">${q.t === 's' ? '单选题' : '多选题'}</span>
        ${learn ? '<span class="pill pill-learn">背题模式</span>' : ''}
        <span class="q-chapter">${esc(chLabel(CH[q.c]))}</span>
        ${canEnterLearn ? `<button class="q-learn" data-act="learn-toggle">${icon('book', 13)} 背题</button>` : ''}
      </div>
      <h2 class="stem">${esc(q.q)}</h2>
      <div class="options" id="options">
        ${q.o.map((text, idx) => {
          const label = CARD_LETTERS[idx];
          const isAnswer = learn && q.a.includes(label);
          const cls = learn ? (isAnswer ? 'learn-correct' : '') : optionClass(q, label, a);
          const sel = a && (a.choice || '').includes(label);
          return `<button class="option ${cls}" data-opt="${label}" aria-pressed="${sel ? 'true' : 'false'}" aria-disabled="${checked || learn ? 'true' : 'false'}">
            <span class="opt-key">${label}</span>
            <span class="opt-text">${esc(text)}</span>
            <span class="opt-mark">${learn ? (isAnswer ? icon('check', 17) : '') : markHTML(q, label, a)}</span>
          </button>`;
        }).join('')}
      </div>
      <div id="answer-slot">${learn ? learnHTML(q) : checked ? explanationHTML(q, a) : ''}</div>
      <p class="q-footer-note">${learn ? '背题模式 · 不记录作答' : `题库第 ${q.n} 题 · 共 ${DATA.meta.count} 题`}</p>`;
  }

  function learnHTML(q) {
    return `<div class="explain ok learn">
      <div class="explain-head">
        <span class="explain-icon">${icon('book', 15)}</span>
        <b>参考答案</b>
        <span class="explain-answer">正确答案 ${q.a.split('').join(' ')}</span>
      </div>
      <div class="explain-grid">
        <div><span>题型</span><b>${q.t === 's' ? '单选' : '多选'}</b></div>
        <div><span>所属章节</span><b class="small">${esc(CH[q.c].name)}</b></div>
      </div>
      <p class="explain-tip">背题模式：不用作答，直接看答案。不会记录正确率，也不会改变错题本。</p>
      <p class="explain-note">原题库未收录文字解析，建议结合《${esc(CH[q.c].name)} ${esc(CH[q.c].title)}》教材复习。</p>
    </div>`;
  }

  function explanationHTML(q, a) {
    const ok = !!a.ok;
    const choice = a.choice ? a.choice.split('').join(' ') : '未作答';
    return `<div class="explain ${ok ? 'ok' : 'bad'}">
      <div class="explain-head">
        <span class="explain-icon">${icon(ok ? 'check' : 'x', 15)}</span>
        <b>${ok ? '回答正确' : '回答错误'}</b>
        <span class="explain-answer">正确答案 ${q.a.split('').join(' ')}</span>
      </div>
      <div class="explain-grid">
        <div><span>你的答案</span><b class="${!a.choice ? 'miss' : ok ? 'good' : 'bad'}">${choice}</b></div>
        <div><span>题型</span><b>${q.t === 's' ? '单选' : '多选'}</b></div>
      </div>
      ${q.t === 'm' ? '<p class="explain-tip">多选题需与正确答案完全一致才计分，少选、多选均不得分。</p>' : ''}
      <p class="explain-note">原题库未收录文字解析。建议回到《${esc(CH[q.c].name)} ${esc(CH[q.c].title)}》核对相关知识点。</p>
    </div>`;
  }

  function renderQuestion(dir) {
    if (!session) return;
    updateHeader();
    const body = $('#practice-body');
    const q = currentQ();
    body.classList.remove('q-slide-next', 'q-slide-prev');
    body.innerHTML = bodyHTML(q);
    body.scrollTop = 0;
    if (dir) {
      void body.offsetWidth;
      body.classList.add(dir === 'next' ? 'q-slide-next' : 'q-slide-prev');
    }
    renderFooter();
    if (!session.exam && !session.review) saveLast();
  }

  function paintOptions() {
    if (!session) return;
    const q = currentQ();
    const a = session.answers[q.id];
    $$('.option', $('#practice-body')).forEach((btn) => {
      const label = btn.dataset.opt;
      btn.className = `option ${optionClass(q, label, a)}`;
      const sel = a && (a.choice || '').includes(label);
      btn.setAttribute('aria-pressed', sel ? 'true' : 'false');
      btn.setAttribute('aria-disabled', a && typeof a.ok === 'boolean' ? 'true' : 'false');
      $('.opt-mark', btn).innerHTML = markHTML(q, label, a);
    });
  }

  function paintAnswerSlot() {
    const q = currentQ();
    const a = session.answers[q.id];
    const slot = $('#answer-slot');
    if (!slot) return;
    slot.innerHTML = a && typeof a.ok === 'boolean' ? explanationHTML(q, a) : '';
  }

  function renderFooter() {
    if (!session) return;
    const foot = $('#practice-foot');
    const q = currentQ();
    const a = session.answers[q.id];
    const checked = !!(a && typeof a.ok === 'boolean');
    const last = session.index >= session.ids.length - 1;

    if (session.review) {
      foot.innerHTML = `
        <button class="btn btn-secondary btn-compact" data-act="prev" ${session.index === 0 ? 'disabled' : ''}>上一题</button>
        <button class="btn btn-primary btn-block" data-act="next">${last ? '完成' : '下一题'}</button>`;
      return;
    }

    if (session.exam) {
      foot.innerHTML = `
        <button class="btn btn-secondary btn-compact" data-act="prev" ${session.index === 0 ? 'disabled' : ''}>上一题</button>
        <button class="btn btn-primary btn-block" data-act="next">${last ? '交卷' : '下一题'}</button>`;
      return;
    }

    if (checked) {
      foot.innerHTML = `
        <button class="btn btn-secondary btn-compact" data-act="card">答题卡</button>
        <button class="btn btn-primary btn-block" data-act="next">${last ? '完成练习' : '下一题'}</button>`;
      return;
    }

    if (q.t === 'm') {
      const has = !!(a && a.choice);
      foot.innerHTML = `
        <button class="btn btn-secondary btn-compact" data-act="card">答题卡</button>
        <button class="btn btn-primary btn-block" data-act="check" ${has ? '' : 'disabled'}>确认答案</button>`;
      return;
    }

    foot.innerHTML = `
      <button class="btn btn-secondary btn-compact" data-act="card">答题卡</button>
      <div class="foot-hint">${icon('check', 15)} 点击选项自动判分</div>`;
  }

  function onOption(label) {
    if (!session || session.review) return;
    const q = currentQ();
    const a = session.answers[q.id];
    if (a && typeof a.ok === 'boolean') return;

    let choice = (a && a.choice) || '';
    if (q.t === 's') {
      choice = label;
    } else {
      const set = new Set(choice.split('').filter(Boolean));
      if (set.has(label)) set.delete(label); else set.add(label);
      choice = Array.from(set).sort().join('');
    }
    session.answers[q.id] = { choice };
    if (q.t === 's' && !session.exam) {
      checkAnswer();
    } else {
      paintOptions();
      renderFooter();
    }
  }

  function checkAnswer() {
    if (!session || session.exam || session.review) return;
    const q = currentQ();
    const a = session.answers[q.id];
    if (!a || !a.choice) return;
    const ok = a.choice === q.a;
    a.ok = ok;
    a.ts = Date.now();
    recordAnswer(q, a.choice, ok);
    saveLast();
    paintOptions();
    paintAnswerSlot();
    renderFooter();

    if (ok && q.t === 's' && store.settings.autoNext && session.index < session.ids.length - 1) {
      const token = session.token;
      const idx = session.index;
      setTimeout(() => {
        if (session && session.token === token && session.index === idx && !session.exam
          && !document.querySelector('#overlay-root .sheet, #overlay-root .modal')) nextQuestion();
      }, 760);
    }
  }

  function markRight(id) {
    const w = store.wrong[id];
    if (!w) return;
    w.resolved = 1;
    w.resolvedTs = Date.now();
  }

  function markWrong(id, choice, isFirst, now) {
    const w = store.wrong[id] || { n: 0, first: 0 };
    w.n = (w.n || 0) + 1;
    w.ts = now || Date.now();
    w.resolved = 0;
    if (choice) w.lastChoice = choice;
    if (isFirst) w.first = 1;
    store.wrong[id] = w;
  }

  function recordAnswer(q, choice, ok) {
    const isFirst = !store.progress[q.id];
    store.progress[q.id] = { a: choice, ok: ok ? 1 : 0, ts: Date.now() };
    const key = dayKey();
    const d = store.stats.days[key] || { a: 0, c: 0 };
    d.a += 1;
    if (ok) d.c += 1;
    store.stats.days[key] = d;
    if (ok) markRight(q.id);
    else markWrong(q.id, choice, isFirst);
    save();
  }

  function nextQuestion() {
    if (!session) return;
    if (session.index >= session.ids.length - 1) {
      if (session.exam) requestSubmit();
      else if (session.review) closeSession();
      else finishSession();
      return;
    }
    session.index++;
    renderQuestion('next');
  }

  function prevQuestion() {
    if (!session || session.index === 0) return;
    session.index--;
    renderQuestion('prev');
  }

  function closeSession() {
    clearTimer();
    if (session && !session.exam && !session.review) {
      const answered = Object.keys(session.answers).filter((id) => session.answers[id] && session.answers[id].choice).length;
      if (!answered) { store.last = null; save(); }
    }
    session = null;
    currentResult = null;
    $('#practice-root').innerHTML = '';
    document.body.classList.remove('practice-open');
    renderTab({ restore: true });
  }

  function requestExit() {
    if (!session) { closeSession(); return; }
    if (session.review) { closeSession(); return; }
    if (session.exam) {
      if (session.submitted) { closeSession(); return; }
      showModal({
        title: '退出考试？',
        body: '本次考试将不作记录，已作答内容不会保存。',
        confirmText: '退出考试',
        danger: true,
        onConfirm: closeSession,
      });
      return;
    }
    const answered = Object.keys(session.answers).filter((id) => session.answers[id] && session.answers[id].choice).length;
    if (answered > 0) {
      showModal({
        title: '退出练习？',
        body: '已答题目会自动保存，下次可从首页“继续练习”接着做。',
        confirmText: '退出',
        onConfirm: closeSession,
      });
    } else {
      closeSession();
    }
  }

  function saveLast() {
    if (!session || session.exam || session.review) return;
    const answered = Object.keys(session.answers)
      .filter((id) => session.answers[id] && session.answers[id].choice).length;
    if (!answered && session.index === 0) {
      if (store.last) { store.last = null; save(); }
      return;
    }
    store.last = {
      mode: session.mode,
      title: session.title,
      ids: session.ids,
      index: session.index,
      answers: session.answers,
      c: session.c,
      t: session.t,
      scope: session.scope,
      ts: Date.now(),
    };
    save();
  }

  /* ------------------------------------------------------------
     starting modes
     ------------------------------------------------------------ */
  function startChapter(i, t) {
    const qs = BY_CH[i].filter((q) => q.t === t);
    if (!qs.length) { toast('本章暂无此类题目'); return; }
    let start = qs.findIndex((q) => !store.progress[q.id]);
    if (start < 0) start = 0;
    openSession({
      mode: 'chapter',
      title: `${CH[i].name} · ${t === 's' ? '单项选择' : '多项选择'}`,
      ids: qs.map((q) => q.id),
      index: start,
      c: i,
      t,
    });
  }

  function startChapterRandom(i) {
    const qs = BY_CH[i];
    const ids = shuffle(qs).slice(0, Math.min(20, qs.length)).map((q) => q.id);
    openSession({ mode: 'random', title: `${CH[i].name} · 随机练习`, ids, c: i });
  }

  function startLearnAll() {
    const ids = QS.map((q) => q.id);
    let start = QS.findIndex((q) => !store.progress[q.id]);
    if (start < 0) start = 0;
    openSession({
      mode: 'learn',
      title: '背题模式 · 全部题库',
      ids,
      index: start,
      review: true,
      learn: true,
    });
  }

  function startLearnChapter(i) {
    const qs = BY_CH[i];
    let start = qs.findIndex((q) => !store.progress[q.id]);
    if (start < 0) start = 0;
    openSession({
      mode: 'learn',
      title: `${CH[i].name} · 背题模式`,
      ids: qs.map((q) => q.id),
      index: start,
      review: true,
      learn: true,
    });
  }

  function enterLearn() {
    if (!session) return;
    if (session.learn) { toast('已经在背题模式'); return; }
    if (session.exam) { toast('考试中不能切换背题模式'); return; }
    if (session.review) { toast('解析模式不能切换'); return; }
    openSession({
      mode: 'learn',
      title: `${session.title} · 背题`,
      ids: session.ids,
      index: session.index,
      review: true,
      learn: true,
    });
  }

  function startSequential() {
    const ids = QS.map((q) => q.id);
    let start = QS.findIndex((q) => !store.progress[q.id]);
    if (start < 0) start = 0;
    openSession({ mode: 'sequential', title: '顺序练习 · 全部题库', ids, index: start });
  }

  function startRandom() {
    const ids = shuffle(QS).slice(0, Math.min(30, QS.length)).map((q) => q.id);
    openSession({ mode: 'random', title: '随机练习 · 30 题', ids });
  }

  function startWrong(scope = 'todo') {
    let ids = wrongIds(scope);
    let usedScope = scope;
    if (!ids.length && scope === 'todo') {
      ids = wrongIds('all');
      usedScope = 'all';
      if (ids.length) toast('待巩固已清空，开始复习全部错题');
    }
    if (!ids.length) { toast('错题集还是空的，先去刷几题吧'); return; }
    openSession({
      mode: 'wrong',
      scope: usedScope,
      title: usedScope === 'all' ? '错题复习 · 全部' : '错题重做',
      ids,
    });
  }

  function startWrongAt(id, scope = 'todo') {
    let ids = wrongIds(scope);
    if (!ids.length) ids = wrongIds('all');
    let idx = ids.indexOf(id);
    if (idx < 0) idx = 0;
    openSession({ mode: 'wrong', scope, title: '错题重做', ids, index: idx });
  }

  function startFav() {
    const ids = favList();
    if (!ids.length) { toast('还没有收藏题目'); return; }
    openSession({ mode: 'fav', title: '收藏复习', ids });
  }

  function startFavAt(id) {
    const ids = favList();
    let idx = ids.indexOf(id);
    if (idx < 0) idx = 0;
    openSession({ mode: 'fav', title: '收藏复习', ids, index: idx });
  }

  function examIds() {
    const singles = shuffle(QS.filter((q) => q.t === 's')).slice(0, 70);
    const multis = shuffle(QS.filter((q) => q.t === 'm')).slice(0, 30);
    return singles.concat(multis).map((q) => q.id);
  }

  function startExam(ask = true) {
    const ids = examIds();
    const begin = () => openSession({
      mode: 'exam',
      title: '模拟考试',
      ids,
      exam: true,
      duration: 90 * 60000,
    });
    if (!ask) { begin(); return; }
    showModal({
      title: '模拟考试',
      body: `共 ${ids.length} 题（70 单选 + 30 多选），限时 90 分钟。交卷后统一判分，中途退出不作记录。`,
      confirmText: '开始考试',
      onConfirm: begin,
    });
  }

  function resumeLast() {
    const l = store.last;
    if (!l || !Array.isArray(l.ids) || !l.ids.length) { startChapter(1, 's'); return; }
    openSession({
      mode: l.mode,
      title: l.title,
      ids: l.ids,
      index: l.index,
      answers: l.answers || {},
      c: l.c,
      t: l.t,
      scope: l.scope,
    });
  }

  /* ------------------------------------------------------------
     exam timer + submit
     ------------------------------------------------------------ */
  function startTimer() {
    clearTimer();
    updateTimer();
    timerId = setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    if (!session || !session.exam || session.submitted) return;
    const left = Math.max(0, session.endsAt - Date.now());
    const el = $('#timer');
    if (el) {
      el.textContent = fmtClock(left);
      el.classList.toggle('warn', left <= 5 * 60000);
    }
    if (left <= 0) {
      clearTimer();
      toast('考试时间到，已自动交卷');
      submitExam();
    }
  }

  function requestSubmit() {
    if (!session || !session.exam || session.submitted) return;
    const unanswered = session.ids.filter((id) => !(session.answers[id] && session.answers[id].choice)).length;
    const body = unanswered
      ? `还有 ${unanswered} 题未作答，未答题目将按错误计入。确认交卷？`
      : '所有题目都已作答，确认交卷并查看成绩？';
    showModal({
      title: '确认交卷？',
      body,
      confirmText: '交卷',
      onConfirm: submitExam,
    });
  }

  function submitExam() {
    if (!session || !session.exam || session.submitted) return;
    session.submitted = true;
    clearTimer();
    closeOverlay();

    const ids = session.ids;
    let answered = 0;
    let correct = 0;
    const key = dayKey();
    const day = store.stats.days[key] || { a: 0, c: 0 };
    const now = Date.now();

    ids.forEach((id) => {
      const q = QMAP.get(id);
      const a = session.answers[id] || {};
      const choice = a.choice || '';
      const ok = !!choice && choice === q.a;
      const isFirst = !store.progress[id];
      session.answers[id] = { choice, ok, ts: now };
      if (choice) {
        answered++;
        if (ok) correct++;
        store.progress[id] = { a: choice, ok: ok ? 1 : 0, ts: now };
      }
      if (ok) markRight(id);
      else markWrong(id, choice, isFirst && !!choice, now);
    });

    day.a += answered;
    day.c += correct;
    store.stats.days[key] = day;

    const total = ids.length;
    const unanswered = total - answered;
    const score = Math.round((correct / total) * 100);
    const used = Math.min(session.duration || 90 * 60000, now - session.startAt);
    const record = {
      ts: now,
      score,
      correct,
      wrong: total - correct - unanswered,
      unanswered,
      total,
      used,
    };
    store.exams.unshift(record);
    store.exams = store.exams.slice(0, 20);
    store.last = null;
    save();

    const wrongIds = ids.filter((id) => !session.answers[id].ok);
    currentResult = { kind: 'exam', session, record, wrongIds };
    showExamResult(record);
  }

  /* ------------------------------------------------------------
     results
     ------------------------------------------------------------ */
  function renderResultShell(opts) {
    const { kind, pct: percent, big, bigSub, title, sub, stats, actions } = opts;
    const C = 540.35;
    const off = C * (1 - clamp(percent, 0, 100) / 100);
    const headLabel = kind === 'exam' ? '模拟考试' : '练习报告';
    $('#practice-root').innerHTML = `<div class="result">
      <div class="result-head">
        <button class="icon-btn" data-act="res-home" aria-label="返回首页">${icon('x', 22)}</button>
        <span>${headLabel}</span>
        <span style="width:40px"></span>
      </div>
      <div class="score-wrap">
        <svg viewBox="0 0 196 196" aria-hidden="true">
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#5856d6"/>
              <stop offset="1" stop-color="#a855f7"/>
            </linearGradient>
          </defs>
          <circle class="score-ring-bg" cx="98" cy="98" r="86" fill="none" stroke-width="12"/>
          <circle id="score-ring" class="score-ring-fg" cx="98" cy="98" r="86" fill="none" stroke-width="12"
            stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
        </svg>
        <div class="score-num"><b>${big}</b><small>${bigSub}</small></div>
      </div>
      <h1>${esc(title)}</h1>
      <p class="result-sub">${esc(sub)}</p>
      <div class="result-stats">
        ${stats.map((s) => `<div class="result-stat"><b class="${s.tone || ''}">${s.value}</b><span>${s.label}</span></div>`).join('')}
      </div>
      <div class="result-actions">
        ${actions.map((a) => `<button class="btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'secondary' ? 'btn-secondary' : 'btn-ghost'}" data-act="${a.act}">${a.label}</button>`).join('')}
      </div>
      <p class="result-note">${kind === 'exam' ? '未作答按错误计入 · 成绩已保存到「我的」· 错题已收进错题本' : '错题会保留在错题本，答对后自动标记为「已掌握」'}</p>
    </div>`;
    requestAnimationFrame(() => {
      const ring = $('#score-ring');
      if (ring) ring.style.strokeDashoffset = off;
    });
  }

  function showExamResult(record) {
    const grade = record.score >= 90 ? '太强了，稳过！' : record.score >= 80 ? '成绩优秀' : record.score >= 60 ? '顺利通过' : '再练一轮吧';
    const actions = [];
    if (record.total - record.correct > 0) {
      actions.push({ label: `查看错题（${record.total - record.correct}）`, act: 'res-review', kind: 'primary' });
      actions.push({ label: '再来一套', act: 'res-again', kind: 'secondary' });
    } else {
      actions.push({ label: '再来一套', act: 'res-again', kind: 'primary' });
    }
    actions.push({ label: '返回首页', act: 'res-home', kind: 'ghost' });

    renderResultShell({
      kind: 'exam',
      pct: record.score,
      big: String(record.score),
      bigSub: '分',
      title: grade,
      sub: `用时 ${fmtDuration(record.used)} · 共 ${record.total} 题`,
      stats: [
        { value: record.correct, label: '正确', tone: 'good' },
        { value: record.wrong, label: '错误', tone: 'bad' },
        { value: record.unanswered, label: '未答' },
        { value: fmtDuration(record.used), label: '用时' },
      ],
      actions,
    });
  }

  function finishSession() {
    if (!session) return;
    const ids = session.ids;
    const answers = ids.map((id) => session.answers[id]).filter((a) => a && typeof a.ok === 'boolean');
    const correct = answers.filter((a) => a.ok).length;
    const answered = answers.length;
    const acc = answered ? Math.round((correct / answered) * 100) : 0;
    const wrongIds = ids.filter((id) => session.answers[id] && session.answers[id].ok === false);
    const used = Date.now() - session.startAt;
    const total = ids.length;

    store.last = null;
    save();
    currentResult = { kind: 'practice', session, record: { correct, answered, total, acc, used }, wrongIds };

    const title = acc >= 90 ? '掌握得很稳' : acc >= 75 ? '练习完成' : '继续巩固';
    const actions = [];
    if (wrongIds.length) actions.push({ label: `复习错题（${wrongIds.length}）`, act: 'res-review', kind: 'primary' });
    else actions.push({ label: '再来一组', act: 'res-again', kind: 'primary' });
    if (wrongIds.length) actions.push({ label: '再来一组', act: 'res-again', kind: 'secondary' });
    actions.push({ label: '返回首页', act: 'res-home', kind: 'ghost' });

    renderResultShell({
      kind: 'practice',
      pct: acc,
      big: String(acc),
      bigSub: '% 正确率',
      title,
      sub: `已答 ${answered} / ${total} 题 · 用时 ${fmtDuration(used)}`,
      stats: [
        { value: answered, label: '已答' },
        { value: correct, label: '正确', tone: 'good' },
        { value: answered - correct, label: '错误', tone: 'bad' },
        { value: fmtDuration(used), label: '用时' },
      ],
      actions,
    });
  }

  function reviewWrong() {
    if (!currentResult || !currentResult.wrongIds.length) { toast('没有错题，太棒了'); return; }
    const prefill = {};
    currentResult.wrongIds.forEach((id) => {
      if (currentResult.session.answers[id]) prefill[id] = currentResult.session.answers[id];
    });
    openSession({
      mode: 'review',
      title: '试卷解析',
      ids: currentResult.wrongIds,
      answers: prefill,
      review: true,
      startAt: Date.now(),
    });
  }

  function again() {
    if (!currentResult) { switchTab('home'); return; }
    const s = currentResult.session;
    switch (s.mode) {
      case 'exam': startExam(false); break;
      case 'random': s.c !== undefined ? startChapterRandom(s.c) : startRandom(); break;
      case 'sequential': startSequential(); break;
      case 'wrong': startWrong(s.scope || 'todo'); break;
      case 'fav': startFav(); break;
      case 'chapter': startChapter(s.c, s.t); break;
      default: startRandom();
    }
  }

  function goHomeFromResult() {
    session = null;
    currentResult = null;
    $('#practice-root').innerHTML = '';
    document.body.classList.remove('practice-open');
    state.tab = 'home';
    state.scroll.home = 0;
    renderTab({ restore: true, top: true, animate: true });
  }

  /* ------------------------------------------------------------
     answer card
     ------------------------------------------------------------ */
  function openAnswerCard() {
    if (!session) return;
    const ids = session.ids;
    const answered = ids.filter((id) => session.answers[id] && session.answers[id].choice).length;
    const ok = ids.filter((id) => session.answers[id] && session.answers[id].ok === true).length;
    const bad = ids.filter((id) => session.answers[id] && session.answers[id].ok === false).length;

    const cells = ids.map((id, i) => {
      const a = session.answers[id];
      let cls = '';
      if (a && a.ok === true) cls = 'ok';
      else if (a && a.ok === false) cls = 'bad';
      else if (a && a.choice) cls = 'done';
      if (i === session.index) cls += ' cur';
      return `<button class="ans-cell ${cls}" data-act="jump" data-i="${i}">${i + 1}</button>`;
    }).join('');

    const legend = session.learn
      ? `<span><i class="legend-dot"></i>背题模式 · 点击题号跳转</span>`
      : session.exam
        ? `<span><i class="legend-dot done"></i>已答 ${answered}</span><span><i class="legend-dot"></i>未答 ${ids.length - answered}</span>`
        : `<span><i class="legend-dot ok"></i>正确 ${ok}</span><span><i class="legend-dot bad"></i>错误 ${bad}</span><span><i class="legend-dot"></i>未答 ${ids.length - answered}</span>`;

    mountOverlay(`
      <div class="backdrop"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <h2>答题卡</h2>
        <p class="sheet-sub">${session.learn ? '背题模式不记录作答，点击题号可跳转。' : session.exam ? '点击题号可跳转，交卷后统一判分。' : '点击题号可跳转。'}</p>
        <div class="answer-legend">${legend}</div>
        <div class="answer-grid">${cells}</div>
        ${session.exam
          ? `<button class="btn btn-primary btn-block" data-act="submit" style="width:100%">交卷</button>`
          : `<button class="btn btn-secondary btn-block" data-act="close-sheet" style="width:100%">${session.learn ? '继续背题' : '继续答题'}</button>`}
      </div>`);
  }

  /* ------------------------------------------------------------
     actions
     ------------------------------------------------------------ */
  function setTheme(v) {
    store.settings.theme = v;
    save();
    applyTheme();
    renderTab();
  }

  function adjustFont(delta) {
    store.settings.font = clamp(store.settings.font + delta, 15, 21);
    save();
    applyFont();
    renderTab();
  }

  function toggleAuto() {
    store.settings.autoNext = !store.settings.autoNext;
    save();
    const sw = $('.switch');
    if (sw) {
      sw.classList.toggle('on', store.settings.autoNext);
      sw.setAttribute('aria-pressed', store.settings.autoNext ? 'true' : 'false');
    }
    toast(store.settings.autoNext ? '已开启：答对自动下一题' : '已关闭自动跳转');
  }

  function clearData() {
    showModal({
      title: '清除所有学习数据？',
      body: '包括答题进度、错题本、收藏和模拟考试成绩。此操作不可恢复。',
      confirmText: '全部清除',
      danger: true,
      onConfirm: () => {
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
        store = loadStore();
        applyTheme();
        applyFont();
        session = null;
        currentResult = null;
        $('#practice-root').innerHTML = '';
        document.body.classList.remove('practice-open');
        state.tab = 'home';
        state.scroll.home = 0;
        renderTab({ restore: true, top: true });
        toast('学习数据已清除');
      },
    });
  }

  function toggleFav(id) {
    if (!id) return;
    if (store.fav[id]) {
      delete store.fav[id];
      toast('已取消收藏');
    } else {
      store.fav[id] = Date.now();
      toast('已收藏，可在「收藏」中查看');
    }
    save();
    const btn = $('[data-act="fav"]');
    if (btn) btn.classList.toggle('on', isFav(id));
    if (state.tab === 'fav') renderTab();
  }

  function removeWrong(id) {
    delete store.wrong[id];
    save();
    renderTab();
    toast('已移出错题本');
  }

  function removeFav(id) {
    delete store.fav[id];
    save();
    renderTab();
    toast('已取消收藏');
  }

  function handleAction(act, el) {
    switch (act) {
      case 'go-me': switchTab('me'); break;
      case 'continue': resumeLast(); break;
      case 'start': {
        const mode = el.dataset.mode;
        if (mode === 'seq') startSequential();
        else if (mode === 'random') startRandom();
        else if (mode === 'exam') startExam(true);
        else if (mode === 'wrong') startWrong();
        else if (mode === 'fav') startFav();
        else if (mode === 'chapter-default') startChapter(1, 's');
        break;
      }
      case 'open-chapter': openChapterSheet(Number(el.dataset.c)); break;
      case 'start-chapter': closeOverlay(); startChapter(Number(el.dataset.c), el.dataset.t); break;
      case 'start-chapter-random': closeOverlay(); startChapterRandom(Number(el.dataset.c)); break;
      case 'start-learn': startLearnAll(); break;
      case 'start-chapter-learn': closeOverlay(); startLearnChapter(Number(el.dataset.c)); break;
      case 'learn-toggle': enterLearn(); break;
      case 'exit': requestExit(); break;
      case 'card': openAnswerCard(); break;
      case 'fav': toggleFav(currentQ() && currentQ().id); break;
      case 'next': nextQuestion(); break;
      case 'prev': prevQuestion(); break;
      case 'check': checkAnswer(); break;
      case 'submit': requestSubmit(); break;
      case 'close-sheet': closeOverlay(); break;
      case 'jump': {
        const i = Number(el.dataset.i);
        closeOverlay();
        if (session && Number.isFinite(i)) { session.index = clamp(i, 0, session.ids.length - 1); renderQuestion(); }
        break;
      }
      case 'open-wrong': startWrongAt(el.dataset.id, el.dataset.scope || 'all'); break;
      case 'wrong-start': startWrong(state.wrongFilter); break;
      case 'rm-wrong': removeWrong(el.dataset.id); break;
      case 'open-fav': startFavAt(el.dataset.id); break;
      case 'rm-fav': removeFav(el.dataset.id); break;
      case 'filter-wrong': state.wrongFilter = el.dataset.f; renderTab(); break;
      case 'theme': setTheme(el.dataset.v); break;
      case 'font': adjustFont(Number(el.dataset.d)); break;
      case 'toggle-auto': toggleAuto(); break;
      case 'clear-data': clearData(); break;
      case 'res-review': reviewWrong(); break;
      case 'res-again': again(); break;
      case 'res-home': goHomeFromResult(); break;
      default: break;
    }
  }

  /* ------------------------------------------------------------
     global events
     ------------------------------------------------------------ */
  document.addEventListener('touchstart', (e) => {
    if (!session || e.touches.length !== 1) return;
    if (!e.target.closest('#practice-body')) return;
    const t = e.touches[0];
    if (t.clientX < 26 || t.clientX > window.innerWidth - 26) return;
    touchStart = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!touchStart || !session) { touchStart = null; return; }
    const start = touchStart;
    touchStart = null;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.t;
    if (dt > 900 || Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    if (document.querySelector('#overlay-root .sheet, #overlay-root .modal')) return;

    suppressClickUntil = Date.now() + 450;
    if (dx < 0) {
      if (session.index < session.ids.length - 1) nextQuestion('next');
      else toast('已经是最后一题');
    } else if (session.index > 0) {
      prevQuestion('prev');
    } else {
      toast('已经是第一题');
    }
  }, { passive: true });

  document.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  document.addEventListener('click', (e) => {
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.classList.contains('backdrop')) { closeOverlay(); return; }
    if (e.target.classList.contains('modal')) { closeModal(); return; }

    const tab = e.target.closest('[data-tab]');
    if (tab) { switchTab(tab.dataset.tab); return; }

    const modalClose = e.target.closest('[data-modal-close]');
    if (modalClose) { closeModal(); return; }

    const modalConfirm = e.target.closest('[data-modal-confirm]');
    if (modalConfirm) {
      const cb = modalCallback;
      closeModal();
      if (cb) cb();
      return;
    }

    const opt = e.target.closest('[data-opt]');
    if (opt && $('#practice-root').contains(opt)) { onOption(opt.dataset.opt); return; }

    const action = e.target.closest('[data-act]');
    if (action) handleAction(action.dataset.act, action);
  });

  media.addEventListener('change', () => {
    if (store.settings.theme === 'auto') applyTheme();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && session && session.exam && !session.submitted) updateTimer();
  });

  /* ------------------------------------------------------------
     service worker
     ------------------------------------------------------------ */
  let swReloading = false;

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    const ok = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!ok) return;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || swReloading) return;
      if (session && session.exam && !session.submitted) {
        toast('新版本已就绪，交卷后刷新即可');
        return;
      }
      swReloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => { /* offline unavailable */ });
  }

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */
  function init() {
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    applyTheme();
    applyFont();
    renderTabbar();

    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'wrong' || params.get('tab') === 'fav' || params.get('tab') === 'me') {
      state.tab = params.get('tab');
    }
    renderTab();
    registerSW();

    if (params.get('start') === 'random') {
      setTimeout(() => { if (!session) startRandom(); }, 250);
    }
  }

  init();
})();
