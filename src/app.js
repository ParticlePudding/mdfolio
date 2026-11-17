/*!
 * mdfolio app — 画面と操作
 * MIT License
 */
(function () {
  'use strict';
  // CLI（Node.js）がこのスクリプトを評価する場合は、画面を持たないので何もしない
  if (typeof document === 'undefined' || typeof window === 'undefined' || !document.getElementById('mdv-root')) return;

  const core = window.MDV.core;
  const mdx = window.MDV.md;
  const i18n = window.MDV.i18n;

  const SETTINGS_KEY = 'mdv:settings:v1';
  const IDB_NAME = 'mdv';
  const IDB_STORE = 'kv';
  const AUTO_REFRESH_MS = 2000;
  const SEARCH_LIMIT = 50;
  const ID_PREFIX = 'user-content-';
  const HIGHLIGHT_MAX_CHARS = 200000;   // これより長いコードブロックは色分けしない
  const HIGHLIGHT_SYNC_CHARS = 20000;   // 1 回の表示で、この文字数までは表示と同時に色分けする
  const HIGHLIGHT_SYNC_BLOCKS = 60;     // 同じく、このブロック数まで。超えた分は表示のあとで少しずつ処理する
  const INDEX_TEXT_MAX = 2 * 1024 * 1024;

  // ------------------------------------------------------------------ 状態

  const state = {
    config: core.normalizeConfig(null),
    settings: {},
    lang: 'en',
    mode: 'viewer',        // viewer（閲覧モード）| site（サイトモード）
    set: null,             // 開いている文書セット
    view: 'welcome',       // welcome | doc | help | message
    current: null,         // 表示中の文書のパス
    currentEntry: null,
    pendingRoute: null,    // 文書セットの読み込み後に開く場所
    renderSeq: 0,
    navCounter: 0,
    navIdx: 0,
    scrollMap: new Map(),
    pendingHits: null,
    hitTerms: null,
    userScrolled: false,
    libs: {},
    lastFolder: null,
    mermaidSeq: 0,
    setSeq: 0,
    userCssProbe: null,    // 隣の mdfolio.css があるか（Promise<boolean>。probeUserCss）
    renderer: null,
    sideTab: 'nav',
    search: { timer: null, results: [], active: -1, query: '', terms: [] },
    refreshTimer: null,
    refreshBusy: false,
    dragDepth: 0,
    mediaLocked: false,    // 外部の画像・メディアを CSP で遮断しているか（lockExternalMedia）
    pendingCode: null,     // 表示のあとで色分けするコードブロック（scheduleHighlight）
    skipHashEvents: 0      // go() で処理済みのため読み飛ばす hashchange の数
  };

  const ui = {};
  const bindings = [];
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // ------------------------------------------------------------------ 小道具

  function h(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') e.className = v;
        else if (k === 'hidden') e.hidden = true;
        else e.setAttribute(k, v === true ? '' : String(v));
      });
    }
    append(e, children);
    return e;
  }

  function append(parent, children) {
    if (children === null || children === undefined) return;
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      parent.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }

  function t(key) {
    return i18n.translate(state.lang, key, Array.prototype.slice.call(arguments, 1));
  }

  /** 文言を要素に結びつける。言語を切り替えたときにまとめて更新する（常設の部品にだけ使う）。 */
  function bind(el, apply) {
    bindings.push({ el: el, apply: apply });
    apply(el);
    return el;
  }

  const ICONS = {
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    home: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
    more: '<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    file: '<path d="M7 3.5h7L18.5 8v11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4.5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    download: '<path d="M12 4v10M8 10l4 4 4-4M5 18.5h14"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8M12 16.6v.1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
  };

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'mdv-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  function isMac() {
    return /Mac|iPhone|iPad/.test(navigator.platform || '');
  }

  function readJsonBlock(id) {
    const el = document.getElementById(id);
    if (!el) return undefined;
    try { return JSON.parse(el.textContent); } catch (e) { return undefined; }
  }

  function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function siteTitle() {
    return state.config.title || (state.set && state.set.name) || core.NAME;
  }

  function reportError(err) {
    const msg = err && err.message ? err.message : String(err);
    if (window.console && console.warn) console.warn('[mdfolio]', err);
    toast(t('errorGeneric', msg), { error: true });
  }

  /** 非同期の操作を包み、例外を通知に変える（FR-901）。 */
  function guard(fn) {
    return function () {
      try {
        const r = fn.apply(this, arguments);
        if (r && typeof r.then === 'function') r.catch(reportError);
      } catch (e) {
        reportError(e);
      }
    };
  }

  // ------------------------------------------------------------------ 設定

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      const v = raw ? JSON.parse(raw) : {};
      return v && typeof v === 'object' ? v : {};
    } catch (e) {
      return {};
    }
  }

  /** 設定を保存する。保存できない環境でも動作は続ける（FR-702）。保存できたかどうかを返す。 */
  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
      return window.localStorage.getItem(SETTINGS_KEY) !== null;
    } catch (e) {
      return false;
    }
  }

  function themePref() {
    const p = state.settings.theme || state.config.theme;
    return p === 'light' || p === 'dark' ? p : 'auto';
  }

  function effectiveTheme() {
    const p = themePref();
    if (p !== 'auto') return p;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function externalAllowed() {
    if (state.config.lockExternalImages) return false; // 設定で固定されている（利用者の設定より優先）
    return typeof state.settings.externalImages === 'boolean' ? state.settings.externalImages : state.config.allowExternalImages;
  }

  // 外部の画像・メディアを、ブラウザーの CSP でも読み込ませない（SEC-5）。
  // 表示のときに取り除く処理（resolveMedia）だけに頼ると、図（Mermaid）の画像指定やスタイルの url() のような
  // 別の経路からの読み込みを防げない。そこで、許可されていない間は img-src / media-src を絞るポリシーを追加する。
  // CSP は厳しくする方向にしか変えられないので、許可に切り替えるにはページの再読み込みが必要になる。
  const MEDIA_LOCK_POLICY = 'img-src data: blob:; media-src data: blob:';

  function lockExternalMedia() {
    if (state.mediaLocked) return;
    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', MEDIA_LOCK_POLICY);
    meta.setAttribute('data-mdv-dyn', 'media-lock');
    document.head.appendChild(meta);
    state.mediaLocked = true;
  }

  function applyTheme() {
    const theme = effectiveTheme();
    const changed = document.documentElement.getAttribute('data-theme') !== theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (ui.themeBtn) {
      const pref = themePref();
      ui.themeBtn.replaceChildren(icon(pref === 'auto' ? 'auto' : pref === 'dark' ? 'moon' : 'sun'));
      const label = t(pref === 'auto' ? 'themeAuto' : pref === 'dark' ? 'themeDark' : 'themeLight');
      ui.themeBtn.setAttribute('aria-label', label);
      ui.themeBtn.setAttribute('title', label);
    }
    if (changed) rerenderMermaid();
  }

  function cycleTheme() {
    const order = ['auto', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(themePref()) + 1) % order.length];
    saveSettings();
    applyTheme();
  }

  function applyLanguage() {
    document.documentElement.setAttribute('lang', state.lang);
    bindings.forEach((b) => b.apply(b.el));
    applyTheme();
  }

  function toggleLanguage() {
    state.lang = state.lang === 'ja' ? 'en' : 'ja';
    state.settings.lang = state.lang;
    saveSettings();
    applyLanguage();
    renderSidebar();
    refreshView();
  }

  // ------------------------------------------------------------------ 通知

  function toast(message, opts) {
    opts = opts || {};
    const el = h('div', { class: 'mdv-toast' + (opts.error ? ' mdv-toast-error' : ''), role: opts.error ? 'alert' : null }, message);
    ui.toasts.appendChild(el);
    let timer = opts.sticky ? null : setTimeout(remove, opts.error ? 7000 : 3500);
    function remove() {
      if (timer) clearTimeout(timer);
      timer = null;
      el.remove();
    }
    return { update: function (msg) { el.textContent = msg; }, remove: remove };
  }

  // ------------------------------------------------------------------ 画面の骨組み

  function buildChrome() {
    const root = document.getElementById('mdv-root');
    const app = ui.app = h('div', { class: 'mdv-app', 'data-view': 'welcome', 'data-has-set': 'false' });

    const skip = bind(h('a', { class: 'mdv-skip', href: '#mdv-main' }), (el) => { el.textContent = t('skipToContent'); });
    skip.addEventListener('click', (ev) => { ev.preventDefault(); ui.main.focus(); });

    // ヘッダー
    ui.sidebarBtn = bind(h('button', { class: 'mdv-iconbtn mdv-btn-sidebar', type: 'button', 'aria-expanded': 'true' }, icon('menu')),
      (el) => { el.setAttribute('aria-label', t('toggleSidebar')); el.setAttribute('title', t('toggleSidebar')); });
    ui.title = h('a', { class: 'mdv-title', href: '#/' }, core.NAME);

    ui.searchInput = bind(h('input', {
      class: 'mdv-search-input', type: 'search', autocomplete: 'off', spellcheck: 'false',
      role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'mdv-search-list', 'aria-autocomplete': 'list'
    }), (el) => { el.setAttribute('placeholder', t('searchPlaceholder')); el.setAttribute('aria-label', t('searchLabel')); });
    ui.searchList = bind(h('div', { class: 'mdv-search-list', role: 'listbox', id: 'mdv-search-list' }), (el) => { el.setAttribute('aria-label', t('searchResults')); });
    ui.searchEmpty = h('p', { class: 'mdv-search-empty', role: 'status', hidden: true });
    ui.searchCount = h('span', { role: 'status' });
    ui.searchProgress = h('span');
    ui.searchPanel = h('div', { class: 'mdv-search-panel', id: 'mdv-search-panel', hidden: true }, [
      ui.searchList, ui.searchEmpty, h('div', { class: 'mdv-search-foot' }, [ui.searchCount, ui.searchProgress])
    ]);
    const searchIcon = icon('search');
    searchIcon.setAttribute('class', 'mdv-icon mdv-search-icon');
    ui.search = h('div', { class: 'mdv-search', role: 'search' }, [
      searchIcon, ui.searchInput, h('kbd', { class: 'mdv-search-kbd', 'aria-hidden': 'true' }, isMac() ? String.fromCharCode(0x2318) + 'K' : 'Ctrl K'), ui.searchPanel
    ]);

    ui.themeBtn = h('button', { class: 'mdv-iconbtn mdv-btn-theme', type: 'button' });
    ui.menuBtn = bind(h('button', { class: 'mdv-iconbtn mdv-btn-menu', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, icon('more')),
      (el) => { el.setAttribute('aria-label', t('menu')); el.setAttribute('title', t('menu')); });
    ui.menu = h('div', { class: 'mdv-menu', role: 'menu', hidden: true });
    buildMenu();

    const header = h('header', { class: 'mdv-header' }, [
      ui.sidebarBtn, ui.title, ui.search, ui.themeBtn, h('div', { class: 'mdv-menu-wrap' }, [ui.menuBtn, ui.menu])
    ]);

    // サイドバー
    ui.tabNav = bind(h('button', { class: 'mdv-side-tab', type: 'button', role: 'tab', id: 'mdv-tab-nav', 'aria-controls': 'mdv-sidenav', 'data-tab': 'nav' }), (el) => { el.textContent = t('tabNav'); });
    ui.tabFiles = bind(h('button', { class: 'mdv-side-tab', type: 'button', role: 'tab', id: 'mdv-tab-files', 'aria-controls': 'mdv-side-tree', 'data-tab': 'files' }), (el) => { el.textContent = t('tabFiles'); });
    ui.sideTabs = h('div', { class: 'mdv-side-tabs', role: 'tablist', hidden: true }, [ui.tabNav, ui.tabFiles]);
    ui.sideNav = h('div', { class: 'mdv-sidenav', id: 'mdv-sidenav', hidden: true });
    ui.sideTree = h('div', { class: 'mdv-side-tree', id: 'mdv-side-tree' });
    ui.sidebar = bind(h('nav', { class: 'mdv-sidebar', id: 'mdv-sidebar' }, [ui.sideTabs, ui.sideNav, ui.sideTree]),
      (el) => { el.setAttribute('aria-label', t('sidebarLabel')); });
    ui.scrim = h('div', { class: 'mdv-scrim', hidden: true });

    // 本文
    ui.welcome = buildWelcome();
    ui.docPath = h('span', { class: 'mdv-doc-path' });
    ui.docDate = h('span', { class: 'mdv-doc-date' });
    ui.docMeta = h('div', { class: 'mdv-doc-meta' }, [ui.docPath, ui.docDate]);
    ui.notice = h('p', { class: 'mdv-notice', hidden: true });
    ui.tocInlineList = h('ol', { class: 'mdv-toc-list' });
    ui.tocInline = h('details', { class: 'mdv-toc-inline', hidden: true }, [
      bind(h('summary'), (el) => { el.textContent = t('tocTitle'); }), ui.tocInlineList
    ]);
    ui.prose = h('div', { class: 'mdv-prose' });
    ui.doc = h('article', { class: 'mdv-doc', hidden: true }, [ui.docMeta, ui.notice, ui.tocInline, ui.prose]);
    ui.main = h('main', { class: 'mdv-main', id: 'mdv-main', tabindex: '-1' }, [ui.welcome, ui.doc]);

    ui.tocList = h('ol', { class: 'mdv-toc-list' });
    ui.toc = bind(h('nav', { class: 'mdv-toc', hidden: true }, [
      bind(h('p', { class: 'mdv-toc-title' }), (el) => { el.textContent = t('tocTitle'); }), ui.tocList
    ]), (el) => { el.setAttribute('aria-label', t('tocTitle')); });

    ui.sheet = h('div', { class: 'mdv-sheet' }, [ui.main, ui.toc]);
    const body = h('div', { class: 'mdv-body' }, [ui.sidebar, ui.sheet]);

    // その他の常設部品
    ui.toasts = h('div', { class: 'mdv-toasts', 'aria-live': 'polite' });
    ui.dirInput = h('input', { class: 'mdv-hidden-input mdv-input-dir', type: 'file', webkitdirectory: true, multiple: true, tabindex: '-1', 'aria-hidden': 'true' });
    // スマートフォン・タブレットでは、種類での絞り込み（accept）を付けない。
    // .md の種類の扱いは端末や保存先のアプリによって異なり、絞り込むと Markdown のファイルを選べないことがあるため。
    // Markdown 以外を選んだ場合は、読み込みの段階で知らせる
    const fileAttrs = { class: 'mdv-hidden-input mdv-input-files', type: 'file', multiple: true, tabindex: '-1', 'aria-hidden': 'true' };
    if (!coarsePointer()) fileAttrs.accept = core.DOC_EXTS.map((x) => '.' + x).join(',') + ',text/markdown';
    ui.fileInput = h('input', fileAttrs);
    ui.dropVeil = h('div', { class: 'mdv-dropveil', hidden: true }, [
      bind(h('div', { class: 'mdv-dropveil-box' }), (el) => { el.textContent = t('dropHere'); })
    ]);

    append(app, [skip, header, body, ui.scrim, ui.toasts, ui.dirInput, ui.fileInput, ui.dropVeil]);
    root.replaceChildren(app);
  }

  function buildWelcome() {
    ui.openFolderBtn = bind(h('button', { class: 'mdv-btn mdv-btn-primary mdv-open-folder', type: 'button' }), (el) => { el.replaceChildren(icon('folder'), t('openFolder')); });
    ui.openFilesBtn = bind(h('button', { class: 'mdv-btn mdv-open-files', type: 'button' }), (el) => { el.replaceChildren(icon('file'), t('openFiles')); });
    ui.lastBtn = bind(h('button', { class: 'mdv-btn mdv-btn-quiet mdv-open-last', type: 'button' }),
      (el) => { el.textContent = t('reopenLast', state.lastFolder ? state.lastFolder.name : ''); });
    ui.lastWrap = h('p', { class: 'mdv-welcome-last', hidden: true }, ui.lastBtn);
    ui.pending = bind(h('p', { class: 'mdv-welcome-pending', hidden: true }),
      (el) => { el.textContent = state.pendingRoute ? t('pendingRoute', state.pendingRoute.path) : ''; });
    return h('section', { class: 'mdv-welcome' }, [
      h('div', { class: 'mdv-crop' }, [
        h('i', { class: 'mdv-crop-mark mdv-crop-tl', 'aria-hidden': 'true' }),
        h('i', { class: 'mdv-crop-mark mdv-crop-tr', 'aria-hidden': 'true' }),
        h('i', { class: 'mdv-crop-mark mdv-crop-bl', 'aria-hidden': 'true' }),
        h('i', { class: 'mdv-crop-mark mdv-crop-br', 'aria-hidden': 'true' }),
        bind(h('h1', { class: 'mdv-welcome-title' }), (el) => { el.textContent = t('welcomeTitle'); }),
        bind(h('p', { class: 'mdv-welcome-lead' }), (el) => { el.textContent = t(welcomeLeadKey()); }),
        h('div', { class: 'mdv-welcome-actions' }, [ui.openFolderBtn, ui.openFilesBtn]),
        ui.lastWrap,
        ui.pending,
        h('p', { class: 'mdv-welcome-foot' }, bind(h('a', { href: core.buildHelpRoute() }), (el) => { el.textContent = t('howTo'); }))
      ])
    ]);
  }

  function menuItem(key, iconName, action, opts) {
    opts = opts || {};
    const check = icon('check');
    check.setAttribute('class', 'mdv-icon mdv-menu-check');
    const label = h('span');
    const btn = h('button', { class: 'mdv-menu-item', type: 'button', role: opts.checkbox ? 'menuitemcheckbox' : 'menuitem', 'data-action': key }, [
      icon(iconName), label, opts.checkbox ? check : null
    ]);
    bind(label, (el) => { el.textContent = t(key); });
    btn.addEventListener('click', guard(() => {
      closeMenu();
      ui.menuBtn.focus(); // 項目は隠れるので、フォーカスをメニューのボタンへ戻す（ダイアログを閉じたときの戻り先にもなる）
      return action();
    }));
    return btn;
  }

  function buildMenu() {
    ui.menuItems = {
      openFolder: menuItem('menuOpenFolder', 'folder', openFolder),
      openFiles: menuItem('menuOpenFiles', 'file', openFiles),
      reload: menuItem('menuReload', 'reload', reloadSet),
      exportSite: menuItem('menuExport', 'download', openExportDialog),
      external: menuItem('menuExternalImages', 'image', toggleExternalImages, { checkbox: true }),
      language: menuItem('menuLanguage', 'globe', toggleLanguage),
      help: menuItem('menuHelp', 'help', () => go(core.buildHelpRoute())),
      about: menuItem('menuAbout', 'info', openAboutDialog)
    };
    ui.menuSepFile = h('div', { class: 'mdv-menu-sep', role: 'separator' });
    append(ui.menu, [
      ui.menuItems.openFolder, ui.menuItems.openFiles, ui.menuItems.reload, ui.menuItems.exportSite, ui.menuSepFile,
      ui.menuItems.external, ui.menuItems.language, h('div', { class: 'mdv-menu-sep', role: 'separator' }),
      ui.menuItems.help, ui.menuItems.about
    ]);
  }

  function updateMenu() {
    const site = state.mode === 'site';
    const hasSet = !!state.set;
    ui.menuItems.openFolder.hidden = site;
    ui.menuItems.openFiles.hidden = site;
    ui.menuItems.reload.hidden = site || !hasSet;
    ui.menuItems.exportSite.hidden = site || !hasSet || !state.config.allowDownloads;
    ui.menuSepFile.hidden = site;
    ui.menuItems.external.hidden = state.config.lockExternalImages;
    ui.menuItems.external.setAttribute('aria-checked', externalAllowed() ? 'true' : 'false');
  }

  function openMenu() {
    updateMenu();
    ui.menu.hidden = false;
    ui.menuBtn.setAttribute('aria-expanded', 'true');
    const first = ui.menu.querySelector('.mdv-menu-item:not([hidden])');
    if (first) first.focus();
  }

  function closeMenu() {
    if (ui.menu.hidden) return;
    ui.menu.hidden = true;
    ui.menuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleExternalImages() {
    if (state.config.lockExternalImages) return;
    if (externalAllowed()) {
      // 許可 → 遮断は、その場で反映できる
      state.settings.externalImages = false;
      saveSettings();
      lockExternalMedia();
      refreshView();
      return;
    }
    if (!state.mediaLocked) {
      state.settings.externalImages = true;
      saveSettings();
      refreshView();
      return;
    }
    openExternalDialog();
  }

  /** 遮断 → 許可は再読み込みが必要なので、接続先が増えることと合わせて確認する。 */
  function openExternalDialog() {
    const losesFolder = state.mode !== 'site' && !!state.set;
    const d = dialogShell('mdv-dialog-external', 'externalTitle', t('externalLead'));
    if (losesFolder) d.body.appendChild(h('p', { class: 'mdv-dialog-note' }, t('externalLeadFolder')));
    const cancel = h('button', { class: 'mdv-btn mdv-external-cancel', type: 'button' }, t('cancel'));
    const run = h('button', { class: 'mdv-btn mdv-btn-primary mdv-external-run', type: 'button' }, t('externalDo'));
    cancel.addEventListener('click', () => d.dialog.close());
    run.addEventListener('click', () => {
      const before = state.settings.externalImages;
      state.settings.externalImages = true;
      if (!saveSettings()) {
        // 設定を保存できないと、再読み込みしても許可の状態にならない
        state.settings.externalImages = before;
        d.dialog.close();
        toast(t('externalNoStorage'), { error: true });
        return;
      }
      window.location.reload();
    });
    append(d.foot, [cancel, run]);
    d.dialog.showModal();
    cancel.focus();
  }

  function setView(view) {
    state.view = view;
    const welcome = view === 'welcome';
    ui.app.setAttribute('data-view', welcome ? 'welcome' : 'doc');
    ui.welcome.hidden = !welcome;
    ui.doc.hidden = welcome;
    if (welcome) {
      ui.toc.hidden = true;
      document.title = siteTitle();
    }
  }

  function updateChromeForSet() {
    const hasSet = !!state.set;
    ui.app.setAttribute('data-has-set', hasSet ? 'true' : 'false');
    ui.title.textContent = siteTitle();
    ui.search.hidden = !hasSet;
    updateMenu();
  }

  // ------------------------------------------------------------------ サイドバーの開閉

  function isNarrow() {
    return window.matchMedia('(max-width: 799px)').matches;
  }

  /** 開始画面の説明。指で操作する端末ではドロップの案内を省き、お試し用の公開ページではその旨を伝える。 */
  function welcomeLeadKey() {
    return 'welcomeLead' + (state.config.hosted ? 'Hosted' : '') + (coarsePointer() ? 'Touch' : '');
  }

  /** 主な操作が指（タッチ）の端末か。 */
  function coarsePointer() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }

  function applySidebarState() {
    const open = state.settings.sidebar !== false;
    ui.app.setAttribute('data-sidebar', open ? 'open' : 'closed');
    const expanded = isNarrow() ? ui.app.classList.contains('is-drawer-open') : open;
    ui.sidebarBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function toggleSidebar() {
    if (isNarrow()) {
      const open = !ui.app.classList.contains('is-drawer-open');
      ui.app.classList.toggle('is-drawer-open', open);
      ui.scrim.hidden = !open;
    } else {
      state.settings.sidebar = state.settings.sidebar === false;
      saveSettings();
    }
    applySidebarState();
  }

  function closeDrawer() {
    if (!ui.app.classList.contains('is-drawer-open')) return;
    ui.app.classList.remove('is-drawer-open');
    ui.scrim.hidden = true;
    applySidebarState();
  }

  // ------------------------------------------------------------------ 文書セット

  function newSet(name, source) {
    return {
      id: ++state.setSeq,
      name: name || '',
      source: source,          // handles | files | embedded
      single: false,           // フォルダではなくファイルだけを開いた
      rootHandle: null,
      entries: new Map(),
      docCount: 0,
      docs: [],
      index: null,
      tree: null,
      navPath: null,
      home: null,
      urls: new Map(),
      search: new Map(),
      searchList: [],
      indexed: 0,
      indexing: false,
      indexPromise: null,
      truncatedDocs: false,
      truncatedEntries: false
    };
  }

  function addEntry(set, rawPath, props) {
    const p = core.normalizePath(rawPath);
    if (!p || core.isIgnoredPath(p)) return;
    const kind = core.isDocPath(p) ? 'doc' : 'asset';
    if (kind === 'doc') {
      if (set.docCount >= core.LIMITS.maxDocs) { set.truncatedDocs = true; return; }
      if (!set.entries.has(p)) set.docCount++;
    }
    set.entries.set(p, {
      path: p,
      name: core.basename(p),
      kind: kind,
      size: props.size === undefined ? null : props.size,
      mtime: props.mtime || 0,
      file: props.file || null,
      handle: props.handle || null,
      text: props.text === undefined ? null : props.text,
      base64: props.base64 === undefined ? null : props.base64,
      mime: props.mime || null,
      title: null,
      tooLarge: false
    });
  }

  function finalizeSet(set) {
    const list = Array.from(set.entries.values());
    const docPaths = list.filter((e) => e.kind === 'doc').map((e) => e.path);
    set.index = core.createIndex(list);
    set.tree = core.buildTree(docPaths);
    set.docs = core.flattenTree(set.tree);
    set.navPath = set.index.lower.get('_sidebar.md') || set.index.lower.get('summary.md') || null;
    set.home = core.pickHome(set.index, set.docs, state.config.home);
  }

  function disposeSet(set) {
    if (!set) return;
    set.urls.forEach((url) => { try { URL.revokeObjectURL(url); } catch (e) { /* 無視 */ } });
    set.urls.clear();
  }

  /** 文書セットを画面に反映する。Markdown 文書がなければ通知だけして何も変えない（FR-902）。 */
  function installSet(set, opts) {
    opts = opts || {};
    finalizeSet(set);
    if (!set.docs.length) {
      toast(t('noDocs'), { error: true });
      return false;
    }
    const old = state.set;
    state.set = set;
    disposeSet(old);
    state.scrollMap.clear();
    state.current = null;
    state.currentEntry = null;
    state.sideTab = set.navPath ? 'nav' : 'files';
    resetSearch();
    updateChromeForSet();
    renderSidebar();
    startIndexing(set);
    startAutoRefresh();
    if (set.truncatedEntries) toast(t('limitEntries', core.LIMITS.maxEntries), { error: true });
    if (set.truncatedDocs) toast(t('limitDocs', core.LIMITS.maxDocs), { error: true });

    if (opts.keepRoute) {
      handleRoute();
      return true;
    }
    let target = core.buildRoute(set.home);
    const pending = state.pendingRoute;
    state.pendingRoute = null;
    ui.pending.hidden = true;
    if (pending && set.entries.has(pending.path)) target = core.buildRoute(pending.path, pending.fragment);
    go(target, true);
    return true;
  }

  // ---- フォルダ・ファイルの選択

  async function openFolder() {
    if (typeof window.showDirectoryPicker === 'function') {
      let handle = null;
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' });
      } catch (e) {
        if (e && e.name === 'AbortError') return; // 利用者がキャンセルした
        handle = null; // 利用できない・拒否された場合は従来の方式に切り替える
      }
      if (handle) {
        await openDirHandle(handle);
        return;
      }
    }
    ui.dirInput.value = '';
    ui.dirInput.click();
  }

  function openFiles() {
    ui.fileInput.value = '';
    ui.fileInput.click();
  }

  async function openDirHandle(handle) {
    const set = newSet(handle.name, 'handles');
    set.rootHandle = handle;
    const progress = toast(t('scanning', 0), { sticky: true });
    try {
      await scanDirHandle(set, handle, '', (n) => progress.update(t('scanning', n)));
    } finally {
      progress.remove();
    }
    if (installSet(set)) rememberFolder(handle);
  }

  async function scanDirHandle(set, rootHandle, rootPrefix, onProgress) {
    const queue = [{ handle: rootHandle, prefix: rootPrefix }];
    let count = set.scanCount || 0;
    while (queue.length) {
      const item = queue.shift();
      for await (const pair of item.handle.entries()) {
        const name = pair[0];
        const child = pair[1];
        if (core.isIgnoredName(name)) continue;
        count++;
        if (count > core.LIMITS.maxEntries) { set.truncatedEntries = true; set.scanCount = count; return; }
        if (count % 200 === 0 && onProgress) onProgress(count);
        if (child.kind === 'directory') queue.push({ handle: child, prefix: item.prefix + name + '/' });
        else addEntry(set, item.prefix + name, { handle: child });
      }
    }
    set.scanCount = count;
  }

  /** <input> やドロップで得た File の一覧から文書セットを作る。 */
  function setFromFileList(files, stripRoot) {
    const set = newSet('', 'files');
    let name = '';
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let rel = file.webkitRelativePath || file.name;
      if (stripRoot && file.webkitRelativePath) {
        const cut = rel.indexOf('/');
        if (cut >= 0) { name = name || rel.slice(0, cut); rel = rel.slice(cut + 1); }
      }
      count++;
      if (count > core.LIMITS.maxEntries) { set.truncatedEntries = true; break; }
      addEntry(set, rel, { file: file, size: file.size, mtime: file.lastModified });
    }
    set.name = name;
    set.single = !name;
    return set;
  }

  // ---- ドラッグ＆ドロップ

  function readAllEntries(reader) {
    return new Promise((resolve, reject) => {
      const all = [];
      (function next() {
        reader.readEntries((batch) => {
          if (!batch.length) { resolve(all); return; }
          for (let i = 0; i < batch.length; i++) all.push(batch[i]);
          next();
        }, reject);
      })();
    });
  }

  function entryToFile(entry) {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
  }

  /** webkitGetAsEntry で得たエントリ（Firefox / Safari のドロップ）を走査する。 */
  async function scanEntries(set, rootEntries, onProgress) {
    const queue = rootEntries.slice();
    let count = 0;
    while (queue.length) {
      const item = queue.shift();
      const entry = item.entry;
      if (core.isIgnoredName(entry.name)) continue;
      count++;
      if (count > core.LIMITS.maxEntries) { set.truncatedEntries = true; return; }
      if (count % 200 === 0 && onProgress) onProgress(count);
      if (entry.isDirectory) {
        const children = await readAllEntries(entry.createReader());
        children.forEach((c) => queue.push({ entry: c, prefix: item.prefix + entry.name + '/' }));
      } else {
        try {
          const file = await entryToFile(entry);
          addEntry(set, item.prefix + entry.name, { file: file, size: file.size, mtime: file.lastModified });
        } catch (e) { /* 読めないファイルは飛ばす */ }
      }
    }
  }

  async function openDataTransfer(dt) {
    // ドロップイベントの中（最初の await より前）で、必要なものをすべて取り出しておく
    const items = dt.items ? Array.prototype.filter.call(dt.items, (it) => it.kind === 'file') : [];
    const files = dt.files ? Array.prototype.slice.call(dt.files) : [];
    let handlePromises = null;
    let entries = null;
    if (items.length && typeof items[0].getAsFileSystemHandle === 'function') {
      // ハンドルが得られない・応答がない場合に備えて、時間切れを設ける
      const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
      handlePromises = items.map((it) => {
        try { return Promise.race([Promise.resolve(it.getAsFileSystemHandle()).catch(() => null), timeout]); } catch (e) { return Promise.resolve(null); }
      });
    }
    if (items.length && typeof items[0].webkitGetAsEntry === 'function') {
      entries = items.map((it) => { try { return it.webkitGetAsEntry(); } catch (e) { return null; } }).filter(Boolean);
    }

    const progress = toast(t('scanning', 0), { sticky: true });
    const onProgress = (n) => progress.update(t('scanning', n));
    let set = null;
    let remember = null;
    try {
      const handles = handlePromises ? (await Promise.all(handlePromises)).filter(Boolean) : [];
      if (handles.length) {
        if (handles.length === 1 && handles[0].kind === 'directory') {
          set = newSet(handles[0].name, 'handles');
          set.rootHandle = handles[0];
          remember = handles[0];
          await scanDirHandle(set, handles[0], '', onProgress);
        } else {
          set = newSet('', 'handles');
          set.single = !handles.some((x) => x.kind === 'directory');
          for (const hd of handles) {
            if (core.isIgnoredName(hd.name)) continue;
            if (hd.kind === 'directory') await scanDirHandle(set, hd, hd.name + '/', onProgress);
            else addEntry(set, hd.name, { handle: hd });
          }
        }
      } else if (entries && entries.length) {
        if (entries.length === 1 && entries[0].isDirectory) {
          set = newSet(entries[0].name, 'files');
          const children = await readAllEntries(entries[0].createReader());
          await scanEntries(set, children.map((c) => ({ entry: c, prefix: '' })), onProgress);
        } else {
          set = newSet('', 'files');
          set.single = !entries.some((x) => x.isDirectory);
          await scanEntries(set, entries.map((c) => ({ entry: c, prefix: '' })), onProgress);
        }
      } else {
        set = setFromFileList(files, false);
      }
    } finally {
      progress.remove();
    }
    if (installSet(set) && remember) rememberFolder(remember);
  }

  // ---- 埋め込みデータ（サイトモード）

  function setFromSiteData(data) {
    const set = newSet(data.name, 'embedded');
    data.files.forEach((f) => {
      if (f.kind === 'doc') addEntry(set, f.path, { text: f.text, size: f.text.length, mtime: f.mtime });
      else addEntry(set, f.path, { base64: f.base64, mime: f.mime, size: Math.floor(f.base64.length * 3 / 4), mtime: f.mtime });
    });
    return set;
  }

  // ---- 読み込み

  async function entryFile(entry) {
    if (entry.handle) return entry.handle.getFile();
    if (entry.file) return entry.file;
    throw new Error('no source');
  }

  /** 文書のテキストを返す。fresh が真でハンドルがあれば、ディスクから読み直す。 */
  async function readDocText(entry, fresh) {
    if (entry.text !== null && !(fresh && entry.handle)) return entry.text;
    const file = await entryFile(entry);
    const bytes = new Uint8Array(await file.arrayBuffer());
    entry.size = file.size;
    entry.mtime = file.lastModified;
    entry.tooLarge = file.size > core.LIMITS.maxDocBytes;
    entry.text = core.detectAndDecode(bytes).text;
    return entry.text;
  }

  async function assetBlob(entry) {
    if (entry.base64 !== null) {
      return new Blob([core.base64ToBytes(entry.base64)], { type: entry.mime || core.mimeOf(entry.path) });
    }
    return entryFile(entry);
  }

  function assetUrl(set, entry) {
    if (set.urls.has(entry.path)) return Promise.resolve(set.urls.get(entry.path));
    return assetBlob(entry).then((blob) => {
      if (set.urls.has(entry.path)) return set.urls.get(entry.path);
      // 種別が分からない場合は拡張子から補う（SVG などを <img> で表示できるようにする）
      const typed = blob.type ? blob : new Blob([blob], { type: core.mimeOf(entry.path) });
      const url = URL.createObjectURL(typed);
      set.urls.set(entry.path, url);
      return url;
    });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, class: 'mdv-hidden-input' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function downloadEntry(entry) {
    try {
      downloadBlob(await assetBlob(entry), entry.name);
    } catch (e) {
      toast(t('readFailed', entry.path), { error: true });
    }
  }

  // ------------------------------------------------------------------ 前回のフォルダ（FR-108）

  function idbOpen() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = window.indexedDB.open(IDB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
  }

  async function idbRun(mode, fn) {
    const db = await idbOpen();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, mode);
        const req = fn(tx.objectStore(IDB_STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  function lastKey() {
    return 'last:' + location.pathname;
  }

  function rememberFolder(handle) {
    idbRun('readwrite', (store) => store.put({ handle: handle, name: handle.name }, lastKey()))
      .then(() => { state.lastFolder = { handle: handle, name: handle.name }; })
      .catch(() => { /* 保存できなくても閲覧には影響しない */ });
  }

  function loadLastFolder() {
    if (typeof window.showDirectoryPicker !== 'function' || !window.indexedDB) return;
    idbRun('readonly', (store) => store.get(lastKey())).then((rec) => {
      if (!rec || !rec.handle || typeof rec.handle.entries !== 'function') return;
      state.lastFolder = { handle: rec.handle, name: rec.name || rec.handle.name };
      ui.lastBtn.textContent = t('reopenLast', state.lastFolder.name);
      ui.lastWrap.hidden = false;
    }).catch(() => { /* 使えない環境では表示しない */ });
  }

  async function openLastFolder() {
    const last = state.lastFolder;
    if (!last) return;
    try {
      let perm = 'granted';
      if (typeof last.handle.queryPermission === 'function') perm = await last.handle.queryPermission({ mode: 'read' });
      if (perm !== 'granted' && typeof last.handle.requestPermission === 'function') perm = await last.handle.requestPermission({ mode: 'read' });
      if (perm !== 'granted') { toast(t('permissionDenied'), { error: true }); return; }
      await openDirHandle(last.handle);
    } catch (e) {
      state.lastFolder = null;
      ui.lastWrap.hidden = true;
      idbRun('readwrite', (store) => store.delete(lastKey())).catch(() => {});
      toast(t('lastFolderGone'), { error: true });
    }
  }

  // ------------------------------------------------------------------ 再読み込み・自動更新（FR-109）

  async function reloadSet() {
    const set = state.set;
    if (!set) return;
    if (set.rootHandle) {
      const route = core.parseRoute(location.hash);
      const fresh = newSet(set.name, 'handles');
      fresh.rootHandle = set.rootHandle;
      await scanDirHandle(fresh, set.rootHandle, '', null);
      if (route.type === 'doc') state.pendingRoute = route;
      if (installSet(fresh)) toast(t('reloaded'));
      return;
    }
    const entry = state.currentEntry;
    if (!entry || state.view !== 'doc') return;
    const before = entry.text;
    try {
      entry.text = null;
      const text = await readDocText(entry, true);
      updateSearchEntry(set, entry, text);
      renderDoc(entry, text, '', { keepScroll: window.scrollY });
      toast(t('reloaded'));
    } catch (e) {
      entry.text = before;
      toast(t('readChanged'), { error: true });
    }
  }

  function startAutoRefresh() {
    if (state.refreshTimer) { clearInterval(state.refreshTimer); state.refreshTimer = null; }
    if (!state.set || state.set.source !== 'handles') return;
    state.refreshTimer = setInterval(checkCurrentChanged, AUTO_REFRESH_MS);
  }

  async function checkCurrentChanged() {
    const set = state.set;
    const entry = state.currentEntry;
    if (state.refreshBusy || !set || !entry || !entry.handle || state.view !== 'doc' || document.visibilityState === 'hidden') return;
    state.refreshBusy = true;
    try {
      const file = await entry.handle.getFile();
      if (state.set !== set || state.currentEntry !== entry) return;
      if (file.lastModified === entry.mtime && file.size === entry.size) return;
      const text = await readDocText(entry, true);
      if (state.set !== set || state.currentEntry !== entry) return;
      updateSearchEntry(set, entry, text);
      renderDoc(entry, text, '', { keepScroll: window.scrollY });
    } catch (e) {
      // 削除・移動・権限の取り消しなど。次の操作まで何もしない
    } finally {
      state.refreshBusy = false;
    }
  }

  // ------------------------------------------------------------------ レンダリング

  const PURIFY_CONFIG = {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'button', 'select', 'option', 'optgroup', 'textarea', 'datalist', 'dialog', 'template', 'slot', 'map', 'area'],
    FORBID_ATTR: ['srcset', 'poster', 'background', 'ping', 'autofocus', 'autoplay', 'contenteditable', 'draggable', 'tabindex', 'accesskey', 'usemap', 'ismap', 'popover', 'popovertarget', 'action', 'formaction'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_NAMED_PROPS: true,
    RETURN_DOM_FRAGMENT: true
  };

  function installSanitizerHook() {
    window.DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (!node || node.nodeType !== 1) return;
      // 画像・メディアの読み込み先は、ここでは読み込ませず、あとで解決する
      if (node.hasAttribute('src')) {
        node.setAttribute('data-mdv-src', node.getAttribute('src'));
        node.removeAttribute('src');
      }
      // アプリ内部用のクラスを名乗らせない
      if (node.hasAttribute('class')) {
        const cls = node.getAttribute('class').split(/\s+/).filter((c) => c && !/^mdv-/i.test(c));
        if (cls.length) node.setAttribute('class', cls.join(' ')); else node.removeAttribute('class');
      }
      if (node.hasAttribute('style')) {
        const st = core.filterStyle(node.getAttribute('style'));
        if (st) node.setAttribute('style', st); else node.removeAttribute('style');
      }
      // input はチェックボックスの表示専用
      if (node.nodeName === 'INPUT') {
        if ((node.getAttribute('type') || '').toLowerCase() !== 'checkbox') {
          if (node.parentNode) node.parentNode.removeChild(node);
        } else {
          node.setAttribute('disabled', '');
        }
      }
    });
  }

  function createRenderer() {
    // コードの色分けは、サニタイズのあとで行う（highlightCode）。ここでは指定しない
    state.renderer = mdx.createRenderer({
      alertLabels: function () {
        return { note: t('alertNote'), tip: t('alertTip'), important: t('alertImportant'), warning: t('alertWarning'), caution: t('alertCaution') };
      }
    });
  }

  // ---- コードの色分け（FR-204）
  // 色分けの結果（span と class だけの HTML）も、サニタイザーを通してから差し込む。
  // 大きな文書で表示を待たせないよう、一定量を超えた分は表示のあとで少しずつ処理する。

  const HIGHLIGHT_PURIFY = { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'], RETURN_DOM_FRAGMENT: true };

  function codeLanguage(code) {
    let lang = '';
    (code.getAttribute('class') || '').split(/\s+/).forEach((c) => { if (c.indexOf('language-') === 0) lang = c.slice(9); });
    return lang;
  }

  function canHighlight(text, lang) {
    const hljs = window.hljs;
    return !!hljs && !!lang && text.length > 0 && text.length <= HIGHLIGHT_MAX_CHARS && !!hljs.getLanguage(lang.toLowerCase());
  }

  /** code 要素の中身を色分けしたものに置き換える。文字が 1 文字でも変わるなら置き換えない。 */
  function highlightCode(code, lang) {
    const text = code.textContent;
    try {
      const html = window.hljs.highlight(text, { language: lang.toLowerCase(), ignoreIllegals: true }).value;
      const frag = window.DOMPurify.sanitize(html, HIGHLIGHT_PURIFY);
      if (frag.textContent !== text) return false;
      code.replaceChildren(frag);
      return true;
    } catch (e) {
      return false; // 色分けできなくても、コードはそのまま読める
    }
  }

  function idle(fn) {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 300 });
    else setTimeout(fn, 30);
  }

  function highlightPending(item) {
    if (!item.code.isConnected) return;
    const hadHits = !!item.code.querySelector('mark.mdv-hit');
    if (highlightCode(item.code, item.lang) && hadHits && state.hitTerms) markHits(item.code, state.hitTerms, 500);
  }

  /** 表示と同時に色分けしなかったコードブロックを、画面に近いものから順に処理する。 */
  function scheduleHighlight(list, seq) {
    state.pendingCode = list && list.length ? list : null;
    if (!state.pendingCode) return;
    let ordered = false;
    const step = () => {
      const queue = state.pendingCode;
      if (seq !== state.renderSeq || !queue) return;
      if (!ordered) {
        ordered = true;
        const near = [];
        const far = [];
        const limit = window.innerHeight * 2;
        queue.forEach((item) => {
          const top = item.code.getBoundingClientRect().top;
          (top > -window.innerHeight && top < limit ? near : far).push(item);
        });
        queue.length = 0;
        Array.prototype.push.apply(queue, near.concat(far));
      }
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) highlightPending(queue.shift());
      if (queue.length) idle(step); else state.pendingCode = null;
    };
    idle(step);
  }

  /** 残っている色分けをまとめて済ませる（印刷の前など）。 */
  function flushHighlight() {
    const queue = state.pendingCode;
    state.pendingCode = null;
    if (queue) queue.forEach(highlightPending);
  }

  function routeFor(ctx, fragment) {
    return ctx.kind === 'help' ? core.buildHelpRoute(fragment) : core.buildRoute(ctx.path, fragment);
  }

  function placeholder(key, value, alt) {
    const label = t(key, value);
    return h('span', { class: 'mdv-ph', role: 'img', 'aria-label': alt ? alt + ' (' + label + ')' : label }, [icon('image'), h('span', { class: 'mdv-ph-text' }, label)]);
  }

  function replaceWithPlaceholder(el, key, value) {
    if (el.nodeName === 'SOURCE') { el.remove(); return; }
    el.replaceWith(placeholder(key, value, el.getAttribute('alt')));
  }

  function resolveMedia(el, src, ctx) {
    const isImg = el.nodeName === 'IMG';
    const missingKey = isImg ? (state.set && state.set.single ? 'imgMissingSingle' : 'imgMissing') : 'mediaMissing';
    const kind = core.classifyHref(src);
    if (kind === 'external') {
      if (/^data:image\//i.test(src) && isImg) { el.setAttribute('src', src); return; }
      if (/^(?:https?:)?\/\//i.test(src)) {
        if (!externalAllowed()) { replaceWithPlaceholder(el, isImg ? 'imgBlocked' : 'mediaBlocked', src); return; }
        // スキームなし（//host/…）は https として扱う（file:// 上で UNC パスとして解釈させない）
        el.setAttribute('src', src.slice(0, 2) === '//' ? 'https:' + src : src);
        el.setAttribute('referrerpolicy', 'no-referrer');
        if (isImg) el.setAttribute('loading', 'lazy');
        return;
      }
      replaceWithPlaceholder(el, missingKey, src);
      return;
    }
    if (kind !== 'relative' || ctx.kind === 'help' || !state.set) { replaceWithPlaceholder(el, missingKey, src); return; }
    const r = core.resolveLink(state.set.index, ctx.path, src);
    if (r.type !== 'asset') { replaceWithPlaceholder(el, missingKey, r.raw || src); return; }
    const set = state.set;
    const entry = set.entries.get(r.path);
    if (isImg) { el.setAttribute('loading', 'lazy'); el.setAttribute('decoding', 'async'); }
    assetUrl(set, entry).then((url) => {
      if (state.set === set) el.setAttribute('src', url);
    }, () => {
      if (el.isConnected) replaceWithPlaceholder(el, missingKey, r.path);
    });
  }

  const EXTERNAL_LINK_RE = /^(?:https?:|mailto:|tel:)/i;

  /** 見出しの文字列。表示できなかった画像の説明（プレースホルダー）は含めない。 */
  function headingText(hd) {
    if (!hd.querySelector('.mdv-ph')) return hd.textContent.trim();
    const copy = hd.cloneNode(true);
    copy.querySelectorAll('.mdv-ph').forEach((n) => n.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  /** サニタイズ済みの断片に、リンク・画像の解決と部品の追加を行う。 */
  function postProcess(frag, ctx) {
    // リンク
    frag.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      let r;
      if (ctx.kind === 'help' || !state.set) {
        const k = core.classifyHref(href);
        r = k === 'fragment' ? { type: 'fragment', fragment: core.safeDecode(href.slice(1)) } : k === 'external' ? { type: 'external', href: href } : { type: 'empty' };
      } else {
        r = core.resolveLink(state.set.index, ctx.path, href);
      }
      if (r.type === 'fragment') {
        a.setAttribute('href', routeFor(ctx, r.fragment));
      } else if (r.type === 'external') {
        const url = r.href.slice(0, 2) === '//' ? 'https:' + r.href : r.href;
        if (!EXTERNAL_LINK_RE.test(url)) { a.removeAttribute('href'); return; }
        a.setAttribute('href', url);
        a.setAttribute('rel', 'noopener noreferrer');
        if (/^https?:/i.test(url)) { a.setAttribute('target', '_blank'); a.classList.add('mdv-ext'); }
      } else if (r.type === 'doc') {
        a.setAttribute('href', core.buildRoute(r.path, r.fragment));
      } else if (r.type === 'asset') {
        a.setAttribute('href', core.buildRoute(r.path));
        a.setAttribute('data-mdv-asset', r.path);
      } else if (r.type === 'missing') {
        if (r.path) a.setAttribute('href', core.buildRoute(r.path, r.fragment)); else a.removeAttribute('href');
        a.classList.add('mdv-missing');
        a.setAttribute('title', t('linkMissing', r.raw));
      } else {
        a.removeAttribute('href');
      }
    });

    // 画像・メディア
    frag.querySelectorAll('[data-mdv-src]').forEach((el) => {
      const src = el.getAttribute('data-mdv-src');
      el.removeAttribute('data-mdv-src');
      const tag = el.nodeName;
      if (tag !== 'IMG' && tag !== 'VIDEO' && tag !== 'AUDIO' && tag !== 'SOURCE') return;
      resolveMedia(el, src, ctx);
    });

    // 見出し: 目次の材料を集め、アンカーリンクを付ける
    const toc = [];
    frag.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((hd) => {
      const id = hd.getAttribute('id') || '';
      if (id.indexOf(ID_PREFIX) !== 0) return;
      const slug = id.slice(ID_PREFIX.length);
      const level = Number(hd.nodeName.charAt(1));
      const text = headingText(hd);
      if (ctx.nav) return; // サイドバーのナビには目次もアンカーも付けない
      if (level <= 4) toc.push({ level: level, text: text, slug: slug });
      hd.appendChild(h('a', { class: 'mdv-anchor', href: routeFor(ctx, slug), 'aria-label': t('anchorLabel', text) }, '#'));
    });
    if (ctx.nav) return { toc: toc };

    // タスクリストのチェックボックス: 状態を読み上げられるように名前を付ける
    frag.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.setAttribute('aria-label', t(box.hasAttribute('checked') ? 'taskDone' : 'taskTodo'));
    });

    // コードブロック: 色分け、言語名とコピー用ボタン
    const pendingCode = [];
    let syncBlocks = 0;
    let syncChars = 0;
    frag.querySelectorAll('pre').forEach((pre) => {
      if (pre.classList.contains('mermaid-src')) return;
      const code = pre.children.length === 1 && pre.firstElementChild.nodeName === 'CODE' ? pre.firstElementChild : null;
      if (!code) return;
      const lang = codeLanguage(code);
      const size = code.textContent.length;
      if (canHighlight(code.textContent, lang)) {
        if (syncBlocks < HIGHLIGHT_SYNC_BLOCKS && syncChars + size <= HIGHLIGHT_SYNC_CHARS) {
          syncBlocks++;
          syncChars += size;
          highlightCode(code, lang);
        } else {
          pendingCode.push({ code: code, lang: lang });
        }
      }
      const bar = h('div', { class: 'mdv-code-bar' }, [
        h('span', { class: 'mdv-code-lang' }, lang || t('codePlain')),
        h('button', { class: 'mdv-copy', type: 'button', 'aria-label': t('copyLabel') }, t('copy'))
      ]);
      const wrap = h('div', { class: 'mdv-code' }, bar);
      pre.replaceWith(wrap);
      wrap.appendChild(pre);
    });

    // 表: 横スクロールできる枠で包む
    frag.querySelectorAll('table').forEach((table) => {
      if (table.parentNode && table.parentNode.nodeName === 'TD') return;
      const wrap = h('div', { class: 'mdv-table-wrap' });
      table.replaceWith(wrap);
      wrap.appendChild(table);
    });

    return { toc: toc, pendingCode: pendingCode };
  }

  function renderMarkdown(body, ctx) {
    const html = state.renderer.render(body);
    const frag = window.DOMPurify.sanitize(html, PURIFY_CONFIG);
    const info = postProcess(frag, ctx);
    return { frag: frag, toc: info.toc, pendingCode: info.pendingCode || null };
  }

  // ---- 遅延読み込みライブラリ（KaTeX / Mermaid）

  /**
   * あとから追加する script / style に、ページの nonce を引き継ぐ。
   * 配布用の HTML はハッシュ方式の CSP なので何もしない。nonce 方式の CSP を付けて配信する環境に置いた場合のためのもの。
   */
  function inheritNonce(el) {
    try {
      const src = document.querySelector('script[nonce]');
      const nonce = src ? (src.nonce || src.getAttribute('nonce')) : '';
      if (nonce) el.nonce = nonce;
    } catch (e) { /* 無視 */ }
    return el;
  }

  function ensureLib(name, globalName) {
    if (name in state.libs) return state.libs[name];
    let ok = false;
    try {
      const block = document.getElementById('mdv-lib-' + name);
      if (block) {
        const s = inheritNonce(document.createElement('script'));
        s.setAttribute('data-mdv-dyn', name);
        s.textContent = JSON.parse(block.textContent);
        document.head.appendChild(s); // CSP が認めていれば（ハッシュの一致など）、ここで同期的に実行される
        ok = !!window[globalName];
      }
    } catch (e) {
      ok = false;
    }
    if (ok && name === 'katex') {
      const css = readJsonBlock('mdv-res-katex-css');
      if (typeof css === 'string') insertLibStyle(inheritNonce(h('style', { 'data-mdv-dyn': 'katex-css' }, css)));
    }
    state.libs[name] = ok;
    return ok;
  }

  /** ライブラリの CSS を、アプリの CSS より前に入れる。アプリと利用者の CSS（mdfolio.css など）の指定を優先させるため。 */
  function insertLibStyle(el) {
    const first = document.querySelector('#mdv-style');
    if (first && first.parentNode) first.parentNode.insertBefore(el, first);
    else document.head.appendChild(el);
  }



  function renderMath(root, seq) {
    const nodes = root.querySelectorAll('.math-inline, .math-display');
    if (!nodes.length) return;
    const ok = ensureLib('katex', 'katex');
    nodes.forEach((el) => {
      const tex = el.textContent;
      if (!ok) {
        el.classList.add('mdv-math-raw');
        el.setAttribute('title', t('mathUnavailable'));
        return;
      }
      const display = el.classList.contains('math-display') || el.classList.contains('math-inline-display');
      try {
        window.katex.render(tex, el, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml', errorColor: '#B3261E', maxExpand: 1000, maxSize: 50 });
      } catch (e) {
        el.classList.add('mdv-math-raw');
      }
    });
  }

  const MERMAID_LIGHT = {
    darkMode: false, background: '#FFFFFF', primaryColor: '#E3ECF8', primaryTextColor: '#17202B', primaryBorderColor: '#1D4F91',
    secondaryColor: '#F2F5F8', secondaryTextColor: '#17202B', secondaryBorderColor: '#5A6878',
    tertiaryColor: '#FFFFFF', tertiaryTextColor: '#17202B', tertiaryBorderColor: '#D3DAE3',
    lineColor: '#3A4654', textColor: '#17202B', noteBkgColor: '#FFF6D6', noteTextColor: '#2B2300', noteBorderColor: '#C9A227'
  };
  const MERMAID_DARK = {
    darkMode: true, background: '#151F2C', primaryColor: '#1D2D42', primaryTextColor: '#DCE4EE', primaryBorderColor: '#8AB8F2',
    secondaryColor: '#1B2736', secondaryTextColor: '#DCE4EE', secondaryBorderColor: '#93A1B2',
    tertiaryColor: '#151F2C', tertiaryTextColor: '#DCE4EE', tertiaryBorderColor: '#2A3646',
    lineColor: '#93A1B2', textColor: '#DCE4EE', noteBkgColor: '#3D3200', noteTextColor: '#FFF3C4', noteBorderColor: '#8A6D00'
  };

  /**
   * 図の配色は、CSS（document.css）の配色の変数から取る。図だけ別の色にならないように（FD-4）。
   * 図のライブラリが解釈できない書き方（color-mix() など）の値は使わず、既定の色のままにする。
   */
  const MERMAID_FROM_CSS = {
    background: '--sheet', primaryColor: '--accent-soft', primaryTextColor: '--ink', primaryBorderColor: '--accent',
    secondaryColor: '--code-bg', secondaryTextColor: '--ink', secondaryBorderColor: '--muted',
    tertiaryColor: '--sheet', tertiaryTextColor: '--ink', tertiaryBorderColor: '--rule',
    lineColor: '--ink-soft', textColor: '--ink'
  };
  const SIMPLE_COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([0-9.,%\s/]+\)|hsla?\([0-9.,%\sdeg/]+\))$/i;

  function mermaidConfig() {
    const vars = Object.assign({}, effectiveTheme() === 'dark' ? MERMAID_DARK : MERMAID_LIGHT);
    const styles = window.getComputedStyle(document.documentElement);
    Object.keys(MERMAID_FROM_CSS).forEach((key) => {
      const value = styles.getPropertyValue(MERMAID_FROM_CSS[key]).trim();
      if (SIMPLE_COLOR.test(value)) vars[key] = value;
    });
    vars.fontFamily = window.getComputedStyle(document.body).fontFamily;
    return {
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      themeVariables: vars
    };
  }

  async function renderMermaidInto(container, code, seq) {
    try {
      const out = await window.mermaid.render('mdv-mmd-' + (++state.mermaidSeq), code);
      if (seq !== state.renderSeq) return;
      container.className = 'mdv-mermaid';
      container.innerHTML = out.svg;
    } catch (e) {
      if (seq !== state.renderSeq) return;
      const msg = String((e && e.message) || e).split('\n').slice(0, 6).join('\n');
      container.className = 'mdv-mermaid-error';
      container.replaceChildren(
        h('p', { class: 'mdv-mermaid-error-title' }, t('mermaidError')),
        h('p', { class: 'mdv-mermaid-error-msg' }, msg),
        h('pre', null, h('code', null, code))
      );
    }
  }

  async function renderMermaid(root, seq) {
    const blocks = Array.prototype.slice.call(root.querySelectorAll('pre.mermaid-src'));
    if (!blocks.length) return;
    const ok = ensureLib('mermaid', 'mermaid');
    if (seq !== state.renderSeq) return;
    if (!ok) {
      blocks.forEach((pre) => pre.setAttribute('title', t('mermaidUnavailable')));
      return;
    }
    window.mermaid.initialize(mermaidConfig());
    for (const pre of blocks) {
      if (seq !== state.renderSeq) return;
      const code = pre.textContent;
      const container = h('div', { class: 'mdv-mermaid' });
      container.mdvSource = code;
      pre.replaceWith(container);
      await renderMermaidInto(container, code, seq);
    }
    if (seq === state.renderSeq && state.anchorEl && !state.userScrolled && state.anchorEl.isConnected) {
      state.anchorEl.scrollIntoView();
    }
  }

  /** テーマを切り替えたとき、表示中の図を配色に合わせて描き直す（FR-501）。 */
  async function rerenderMermaid() {
    if (!ui.prose || !state.libs.mermaid) return;
    const list = Array.prototype.slice.call(ui.prose.querySelectorAll('.mdv-mermaid, .mdv-mermaid-error')).filter((el) => typeof el.mdvSource === 'string');
    if (!list.length) return;
    const seq = state.renderSeq;
    window.mermaid.initialize(mermaidConfig());
    for (const el of list) {
      if (seq !== state.renderSeq) return;
      await renderMermaidInto(el, el.mdvSource, seq);
    }
  }

  // ------------------------------------------------------------------ 文書の表示

  function renderToc(items, ctx) {
    ui.tocList.replaceChildren();
    ui.tocInlineList.replaceChildren();
    const show = items.length >= 2;
    ui.toc.hidden = !show;
    ui.tocInline.hidden = !show;
    ui.tocInline.open = false;
    if (!show) return;
    const min = items.reduce((m, it) => Math.min(m, it.level), 6);
    items.forEach((it) => {
      [ui.tocList, ui.tocInlineList].forEach((list) => {
        list.appendChild(h('li', null, h('a', { class: 'mdv-toc-link', href: routeFor(ctx, it.slug), 'data-depth': it.level - min, 'data-slug': it.slug }, it.text)));
      });
    });
    updateTocCurrent();
  }

  function updateTocCurrent() {
    if (ui.toc.hidden) return;
    const heads = ui.prose.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
    const limit = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 52) + 24;
    let current = '';
    for (let i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top <= limit) current = heads[i].id.slice(ID_PREFIX.length);
      else break;
    }
    if (!current && heads.length) current = heads[0].id.slice(ID_PREFIX.length);
    // 末尾までスクロールしたら、上端に届かない最後の見出しを現在位置とする
    if (heads.length && window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = heads[heads.length - 1].id.slice(ID_PREFIX.length);
    }
    ui.tocList.querySelectorAll('.mdv-toc-link').forEach((a) => {
      const on = a.getAttribute('data-slug') === current;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }

  function setMeta(pathText, dateMs) {
    ui.docPath.replaceChildren();
    const segs = String(pathText).split('/');
    segs.forEach((s, i) => {
      if (i) ui.docPath.appendChild(h('span', { class: 'mdv-doc-sep', 'aria-hidden': 'true' }, '/'));
      ui.docPath.appendChild(document.createTextNode(s));
    });
    const d = core.formatDate(dateMs);
    ui.docDate.textContent = d ? t('updated', d) : '';
  }

  function findFragmentTarget(fragment) {
    if (!fragment) return null;
    const tries = [fragment, core.safeDecode(fragment), fragment.toLowerCase(), core.slugify(fragment)];
    for (let i = 0; i < tries.length; i++) {
      if (!tries[i]) continue;
      const el = document.getElementById(ID_PREFIX + tries[i]);
      if (el && ui.prose.contains(el)) return el;
      const named = ui.prose.querySelector('[name="' + CSS.escape(ID_PREFIX + tries[i]) + '"]');
      if (named) return named;
    }
    return null;
  }

  /** 表示後のスクロール位置を決める。 */
  function settleScroll(fragment, nav) {
    nav = nav || {};
    state.anchorEl = null;
    state.userScrolled = false;
    if (typeof nav.keepScroll === 'number') { window.scrollTo(0, nav.keepScroll); return; }
    if (nav.traversal && state.scrollMap.has(state.navIdx)) { window.scrollTo(0, state.scrollMap.get(state.navIdx)); return; }
    const target = findFragmentTarget(fragment);
    if (target) {
      state.anchorEl = target;
      target.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }

  function mountView(opts) {
    // opts: { node, toc, ctx, title, metaPath, metaDate, notice, fragment, nav, entry, pendingCode }
    const seq = ++state.renderSeq;
    ui.prose.replaceChildren(opts.node);
    setMeta(opts.metaPath, opts.metaDate);
    ui.notice.hidden = !opts.notice;
    ui.notice.textContent = opts.notice || '';
    setView(opts.view || 'doc');
    renderToc(opts.toc || [], opts.ctx);
    document.title = opts.title ? opts.title + ' - ' + siteTitle() : siteTitle();
    state.current = opts.entry ? opts.entry.path : null;
    state.currentEntry = opts.entry || null;
    updateActiveLinks();
    renderMath(ui.prose, seq);
    settleScroll(opts.fragment, opts.nav);
    applyHits();
    markScrollable();
    scheduleHighlight(opts.pendingCode, seq);
    renderMermaid(ui.prose, seq).then(() => { if (seq === state.renderSeq) markScrollable(); }).catch(reportError);
    // 文書を切り替えたら本文領域にフォーカスを移す。ただし、入力中の欄からは奪わない
    const active = document.activeElement;
    const typing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.nodeName);
    if (!typing && !(opts.nav && typeof opts.nav.keepScroll === 'number')) {
      try { ui.main.focus({ preventScroll: true }); } catch (e) { /* 無視 */ }
    }
    return seq;
  }

  function renderDoc(entry, text, fragment, nav) {
    const ctx = { kind: 'doc', path: entry.path };
    const fallback = core.stripDocExt(entry.name);
    let node;
    let toc = [];
    let title = fallback;
    let notice = '';
    let pendingCode = null;
    if (entry.tooLarge) {
      node = h('pre', { class: 'mdv-plain' }, text);
      notice = t('plainNotice');
    } else {
      const fm = core.parseFrontMatter(text);
      const out = renderMarkdown(fm.body, ctx);
      node = out.frag;
      toc = out.toc;
      pendingCode = out.pendingCode;
      const h1 = toc.filter((x) => x.level === 1)[0];
      title = fm.data.title || (h1 && h1.text) || fallback;
    }
    entry.title = title;
    mountView({ node: node, toc: toc, ctx: ctx, title: title, metaPath: entry.path, metaDate: entry.mtime, notice: notice, fragment: fragment, nav: nav, entry: entry, pendingCode: pendingCode });
  }

  async function showDoc(path, fragment, nav) {
    const set = state.set;
    const entry = set.entries.get(path);
    if (!entry) { showMessage(t('notFoundTitle'), t('notFoundBody', path), path); return; }
    if (entry.kind !== 'doc') { showAsset(entry); return; }
    const seq = ++state.renderSeq;
    let text;
    try {
      text = await readDocText(entry, true);
    } catch (e) {
      if (seq !== state.renderSeq || state.set !== set) return;
      showMessage(t('notFoundTitle'), t('readFailed', path), path);
      return;
    }
    if (seq !== state.renderSeq || state.set !== set) return; // 読み込み中に別の場所へ移動した
    renderDoc(entry, text, fragment, nav);
  }

  function showMessage(title, body, metaPath, extra) {
    const node = h('div', { class: 'mdv-empty' }, [
      h('h1', { class: 'mdv-empty-title' }, title),
      h('p', { class: 'mdv-empty-body' }, body),
      h('p', null, [extra || null, ' ', state.set ? h('a', { class: 'mdv-btn', href: '#/' }, t('goHome')) : null])
    ]);
    mountView({ node: node, toc: [], ctx: { kind: 'doc', path: '' }, title: title, metaPath: metaPath || '', metaDate: 0, view: 'message' });
  }

  function showAsset(entry) {
    if (!state.config.allowDownloads) {
      // 保存できない環境では、押しても何も起きないボタンを出さない
      showMessage(t('assetTitle'), t('assetNoSave', entry.name), entry.path);
      return;
    }
    const btn = h('button', { class: 'mdv-btn mdv-btn-primary mdv-download', type: 'button' }, [icon('download'), t('download')]);
    btn.addEventListener('click', guard(() => downloadEntry(entry)));
    showMessage(t('assetTitle'), t('assetBody', entry.name), entry.path, btn);
  }

  function showHelp(fragment, nav) {
    let text = readJsonBlock('mdv-res-help-' + state.lang);
    if (typeof text !== 'string') text = readJsonBlock('mdv-res-help-en');
    if (typeof text !== 'string') text = '# ' + t('helpTitle');
    // お試し用の公開ページでは、使えない機能があることを先頭で伝える
    if (state.config.hosted) {
      const note = '> [!IMPORTANT]\n> ' + t('helpHostedNote') + '\n';
      const eol = text.indexOf('\n');
      text = text.charAt(0) === '#' && eol > 0 ? text.slice(0, eol + 1) + '\n' + note + text.slice(eol + 1) : note + '\n' + text;
    }
    const ctx = { kind: 'help', path: '' };
    const out = renderMarkdown(text, ctx);
    mountView({ node: out.frag, toc: out.toc, ctx: ctx, title: t('helpTitle'), metaPath: t('helpTitle'), metaDate: 0, fragment: fragment, nav: nav, view: 'help', pendingCode: out.pendingCode });
  }

  // ---- 横スクロールが必要な部分を、キーボードでも操作できるようにする（NFR-4）

  const SCROLLABLE = [
    ['.mdv-table-wrap', 'tableLabel'],
    ['.mdv-code pre', 'codeScrollLabel'],
    ['.math-display', 'mathScrollLabel'],
    ['.mdv-mermaid', 'diagramScrollLabel']
  ];

  function markScrollable() {
    if (!ui.prose || state.view === 'welcome') return;
    const changes = [];
    SCROLLABLE.forEach((def) => {
      ui.prose.querySelectorAll(def[0]).forEach((el) => {
        const scrolls = el.scrollWidth > el.clientWidth + 1;
        if (scrolls !== el.hasAttribute('tabindex')) changes.push([el, scrolls, def[1]]);
      });
    });
    // 計測と書き換えを分けて、レイアウトの計算が繰り返されないようにする
    changes.forEach((c) => {
      const el = c[0];
      if (c[1]) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'group');
        el.setAttribute('aria-label', t(c[2]));
      } else {
        el.removeAttribute('tabindex');
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
      }
    });
  }

  /** 設定の変更後などに、いまの表示を作り直す。 */
  function refreshView() {
    updateMenu();
    if (state.view === 'welcome') return;
    handleRoute({ keepScroll: window.scrollY, force: true });
  }

  // ------------------------------------------------------------------ ルーティング（FR-304, FR-306）

  function go(route, replace) {
    // 「#」だけの移動は、ブラウザーによって hashchange の届き方が異なる。先頭のページを指す「#/」にそろえる
    if (route === '#' || route === '') route = '#/';
    if (replace) {
      try {
        history.replaceState(null, '', route);
        handleRoute();
        return;
      } catch (e) { /* 置き換えられない環境では通常の移動にする */ }
    }
    // hashchange イベントは少し遅れて届く。その間の操作（検索欄へ戻るなど）と前後しないよう、
    // 待たずにここで表示を切り替え、あとから届くイベントは 1 回だけ読み飛ばす
    const before = location.href;
    if (location.hash !== route) location.hash = route;
    if (location.href !== before) state.skipHashEvents++;
    handleRoute();
  }

  function handleRoute(opts) {
    opts = opts || {};
    const route = core.parseRoute(location.hash);
    const hits = state.pendingHits;
    state.pendingHits = null;
    if (!opts.force) state.hitTerms = hits;

    // 履歴の位置を識別する番号を付ける。既に番号があれば「戻る／進む」での移動
    let traversal = false;
    const st = history.state;
    if (st && typeof st.mdvIdx === 'number') {
      traversal = st.mdvIdx !== state.navIdx;
      state.navIdx = st.mdvIdx;
      if (st.mdvIdx > state.navCounter) state.navCounter = st.mdvIdx;
    } else {
      state.navIdx = ++state.navCounter;
      try { history.replaceState({ mdvIdx: state.navIdx }, ''); } catch (e) { /* 無視 */ }
    }
    const nav = { traversal: traversal, keepScroll: opts.keepScroll };

    closeDrawer();
    if (!opts.force) closeSearchPanel();
    if (route.type === 'help') { showHelp(route.fragment, nav); return; }
    if (!state.set) {
      if (route.type === 'doc') {
        state.pendingRoute = route;
        ui.pending.textContent = t('pendingRoute', route.path);
        ui.pending.hidden = false;
      }
      setView('welcome');
      state.current = null;
      state.currentEntry = null;
      return;
    }

    let path;
    let fragment = route.fragment || '';
    if (route.type === 'doc') path = route.path;
    else if (route.type === 'fragment') path = state.current || state.set.home;
    else path = state.set.home;

    if (route.type === 'fragment') {
      try { history.replaceState(history.state, '', core.buildRoute(path, fragment)); } catch (e) { /* 無視 */ }
    }

    // 同じ文書の中での移動は、描き直さずに位置だけ変える
    if (!opts.force && state.view === 'doc' && state.current === path && state.currentEntry) {
      settleScroll(fragment, nav);
      applyHits();
      updateActiveLinks();
      return;
    }
    showDoc(path, fragment, nav).catch(reportError);
  }

  let scrollTick = false;
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      if (state.view !== 'welcome') state.scrollMap.set(state.navIdx, window.scrollY);
      updateTocCurrent();
    });
  }

  // ------------------------------------------------------------------ サイドバー

  function renderTreeNode(node, depth) {
    const ul = h('ul', depth === 0 ? { class: 'mdv-tree' } : null);
    node.files.forEach((f) => {
      ul.appendChild(h('li', null, h('a', { class: 'mdv-tree-link', href: core.buildRoute(f.path), title: f.path }, core.stripDocExt(f.name))));
    });
    node.dirs.forEach((d) => {
      const details = h('details', { 'data-path': d.path }, [
        h('summary', null, [icon('chevron'), h('span', null, d.name)]),
        renderTreeNode(d, depth + 1)
      ]);
      ul.appendChild(h('li', null, details));
    });
    return ul;
  }

  function renderSidebar() {
    const set = state.set;
    if (!set) return;
    const tree = renderTreeNode(set.tree, 0);
    if (set.docs.length <= 60) tree.querySelectorAll('details').forEach((d) => { d.open = true; });
    ui.sideTree.replaceChildren(tree);

    ui.sideNav.replaceChildren();
    if (set.navPath) {
      const entry = set.entries.get(set.navPath);
      readDocText(entry, false).then((text) => {
        if (state.set !== set) return;
        const out = renderMarkdown(core.parseFrontMatter(text).body, { kind: 'doc', path: set.navPath, nav: true });
        ui.sideNav.replaceChildren(out.frag);
        markNavLabels();
        updateActiveLinks();
      }).catch(() => { /* ナビを表示できない場合はファイル一覧だけにする */ });
    }
    applySideTab();
    updateActiveLinks();
  }

  /** カスタムナビの中の、リンクではない項目（区切りの見出し）に印を付ける。 */
  function markNavLabels() {
    ui.sideNav.querySelectorAll('li').forEach((li) => {
      Array.prototype.slice.call(li.childNodes).forEach((n) => {
        if (n.nodeType === 3 && n.nodeValue.trim()) {
          li.replaceChild(h('span', { class: 'mdv-sidenav-label' }, n.nodeValue.trim()), n);
        } else if (n.nodeType === 1 && n.nodeName === 'P' && !n.querySelector('a')) {
          n.classList.add('mdv-sidenav-label');
        }
      });
    });
  }

  function applySideTab() {
    const hasNav = !!(state.set && state.set.navPath);
    const tab = hasNav ? state.sideTab : 'files';
    ui.sideTabs.hidden = !hasNav;
    ui.sideNav.hidden = tab !== 'nav';
    ui.sideTree.hidden = tab !== 'files';
    ui.tabNav.setAttribute('aria-selected', tab === 'nav' ? 'true' : 'false');
    ui.tabFiles.setAttribute('aria-selected', tab === 'files' ? 'true' : 'false');
    // タブがあるときだけ、切り替え先をタブパネルとして伝える
    [[ui.sideNav, 'mdv-tab-nav'], [ui.sideTree, 'mdv-tab-files']].forEach((pair) => {
      if (hasNav) { pair[0].setAttribute('role', 'tabpanel'); pair[0].setAttribute('aria-labelledby', pair[1]); }
      else { pair[0].removeAttribute('role'); pair[0].removeAttribute('aria-labelledby'); }
    });
  }

  function updateActiveLinks() {
    const current = state.current ? core.buildRoute(state.current) : null;
    [ui.sideTree, ui.sideNav].forEach((box) => {
      box.querySelectorAll('a[href]').forEach((a) => {
        const on = current !== null && a.getAttribute('href') === current;
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    });
    const active = ui.sideTree.querySelector('a[aria-current="page"]');
    if (active) {
      let p = active.parentNode;
      while (p && p !== ui.sideTree) {
        if (p.nodeName === 'DETAILS') p.open = true;
        p = p.parentNode;
      }
      if (!ui.sideTree.hidden && typeof active.scrollIntoView === 'function') {
        const box = ui.sidebar.getBoundingClientRect();
        const r = active.getBoundingClientRect();
        if (r.top < box.top || r.bottom > box.bottom) active.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ------------------------------------------------------------------ 検索（FR-401〜405）

  function analyze(entry, text) {
    const src = text.length > INDEX_TEXT_MAX ? text.slice(0, INDEX_TEXT_MAX) : text;
    return core.analyzeDoc(src, core.stripDocExt(entry.name));
  }

  function updateSearchEntry(set, entry, text) {
    if (!set.search.has(entry.path)) return;
    const se = core.makeSearchEntry(entry.path, analyze(entry, text));
    set.search.set(entry.path, se);
    for (let i = 0; i < set.searchList.length; i++) {
      if (set.searchList[i].path === entry.path) { set.searchList[i] = se; break; }
    }
  }

  function startIndexing(set) {
    set.indexing = true;
    set.indexPromise = (async () => {
      let last = performance.now();
      for (const p of set.docs) {
        if (state.set !== set) return;
        const entry = set.entries.get(p);
        let analysis;
        try {
          analysis = analyze(entry, await readDocText(entry, false));
        } catch (e) {
          entry.unreadable = true;
          analysis = { title: core.stripDocExt(entry.name), headings: [], plain: '' };
        }
        if (!entry.title) entry.title = analysis.title;
        const se = core.makeSearchEntry(p, analysis);
        set.search.set(p, se);
        set.searchList.push(se);
        set.indexed++;
        if (performance.now() - last > 12) {
          onIndexProgress(set);
          await yieldToBrowser();
          last = performance.now();
        }
      }
      set.indexing = false;
      onIndexProgress(set);
    })();
    set.indexPromise.catch(reportError);
  }

  let progressTick = 0;
  function onIndexProgress(set) {
    if (state.set !== set || ui.searchPanel.hidden) return;
    const now = performance.now();
    if (set.indexing && now - progressTick < 250) return;
    progressTick = now;
    runSearch();
  }

  function resetSearch() {
    ui.searchInput.value = '';
    state.search.query = '';
    state.search.terms = [];
    closeSearchPanel();
  }

  function closeSearchPanel() {
    ui.searchPanel.hidden = true;
    ui.searchInput.setAttribute('aria-expanded', 'false');
    ui.searchInput.removeAttribute('aria-activedescendant');
    state.search.active = -1;
  }

  function highlightInto(parent, text, ranges) {
    let pos = 0;
    ranges.forEach((r) => {
      if (r[0] > pos) parent.appendChild(document.createTextNode(text.slice(pos, r[0])));
      parent.appendChild(h('mark', null, text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) parent.appendChild(document.createTextNode(text.slice(pos)));
  }

  function runSearch() {
    const set = state.set;
    const query = ui.searchInput.value;
    const terms = core.tokenizeQuery(query);
    state.search.query = query;
    state.search.terms = terms;
    if (!set || !terms.length) { closeSearchPanel(); return; }

    // カスタムナビに使っているファイル（_sidebar.md など）は目次であって本文ではないので、結果に出さない
    const list = set.navPath ? set.searchList.filter((e) => e.path !== set.navPath) : set.searchList;
    const found = core.searchDocs(list, terms, SEARCH_LIMIT);
    state.search.results = found.results;
    ui.searchList.replaceChildren();
    found.results.forEach((r, i) => {
      const se = set.search.get(r.path);
      const sn = core.makeSnippet(se.plain, terms, 40, r.hint);
      const title = h('span', { class: 'mdv-search-item-title' });
      highlightInto(title, r.title, core.findRanges(r.title, terms));
      const snippet = h('span', { class: 'mdv-search-item-snippet' });
      highlightInto(snippet, sn.text, sn.ranges);
      ui.searchList.appendChild(h('a', { class: 'mdv-search-item', role: 'option', id: 'mdv-search-opt-' + i, href: core.buildRoute(r.path), 'data-index': i }, [
        title, h('span', { class: 'mdv-search-item-path' }, r.path), snippet
      ]));
    });
    ui.searchEmpty.hidden = found.total > 0;
    ui.searchEmpty.textContent = found.total > 0 ? '' : t('searchNone', query.trim());
    ui.searchCount.textContent = found.total > found.results.length ? t('searchCountMore', found.total, found.results.length) : t('searchCount', found.total);
    ui.searchProgress.textContent = set.indexing ? t('searchIndexing', set.indexed, set.docs.length) : '';
    ui.searchPanel.hidden = false;
    ui.searchInput.setAttribute('aria-expanded', 'true');
    setActiveResult(found.results.length ? Math.min(Math.max(state.search.active, 0), found.results.length - 1) : -1);
  }

  function setActiveResult(i) {
    state.search.active = i;
    const items = ui.searchList.children;
    for (let k = 0; k < items.length; k++) {
      const on = k === i;
      items[k].classList.toggle('is-active', on);
      items[k].setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && typeof items[k].scrollIntoView === 'function') items[k].scrollIntoView({ block: 'nearest' });
    }
    if (i >= 0) ui.searchInput.setAttribute('aria-activedescendant', 'mdv-search-opt-' + i);
    else ui.searchInput.removeAttribute('aria-activedescendant');
  }

  function openResult(i) {
    const r = state.search.results[i];
    if (!r) return;
    state.pendingHits = state.search.terms.slice();
    closeSearchPanel();
    ui.searchInput.blur();
    go(core.buildRoute(r.path));
  }

  function onSearchKey(ev) {
    if (ev.isComposing) return; // 日本語入力の変換中
    const n = state.search.results.length;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (ui.searchPanel.hidden) runSearch(); else if (n) setActiveResult((state.search.active + 1) % n);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (n) setActiveResult((state.search.active - 1 + n) % n);
    } else if (ev.key === 'Enter') {
      if (!ui.searchPanel.hidden && n) { ev.preventDefault(); openResult(Math.max(state.search.active, 0)); }
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      if (!ui.searchPanel.hidden) closeSearchPanel();
      else { ui.searchInput.value = ''; state.hitTerms = null; clearHits(); ui.searchInput.blur(); }
    }
  }

  // ---- 本文中の一致語のハイライト（FR-403）

  function clearHits() {
    const marks = ui.prose.querySelectorAll('mark.mdv-hit');
    marks.forEach((m) => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  /** root の中の文字列のうち、検索語に一致する部分を mark で囲む。最初の mark を返す。 */
  function markHits(root, terms, limit) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        let p = node.parentNode;
        while (p && p !== root) {
          if (p.nodeType === 1) {
            const cls = p.getAttribute('class') || '';
            if (p.nodeName === 'svg' || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || /(^|\s)(katex|mdv-mermaid|mdv-anchor|mdv-code-bar|mdv-ph)(\s|$)/.test(cls)) return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let count = 0;
    let first = null;
    for (let i = 0; i < nodes.length && count < limit; i++) {
      const node = nodes[i];
      const text = node.nodeValue;
      if (!text || !text.trim()) continue;
      const ranges = core.findRanges(text, terms);
      if (!ranges.length) continue;
      const frag = document.createDocumentFragment();
      let pos = 0;
      ranges.forEach((r) => {
        if (r[0] > pos) frag.appendChild(document.createTextNode(text.slice(pos, r[0])));
        const mark = h('mark', { class: 'mdv-hit' }, text.slice(r[0], r[1]));
        if (!first) first = mark;
        frag.appendChild(mark);
        pos = r[1];
        count++;
      });
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    }
    return first;
  }

  function applyHits() {
    clearHits();
    const terms = state.hitTerms;
    if (!terms || !terms.length) return;
    const first = markHits(ui.prose, terms, 2000);
    if (first) {
      // 折りたたまれた details の中なら開く
      let p = first.parentNode;
      while (p && p !== ui.prose) {
        if (p.nodeName === 'DETAILS') p.open = true;
        p = p.parentNode;
      }
      state.anchorEl = first;
      first.scrollIntoView({ block: 'center' });
    }
  }

  // ------------------------------------------------------------------ 書き出し（FR-601〜603）

  function partsFromDom() {
    // 実行中に追加したポリシー（lockExternalMedia）は書き出しに含めない
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]:not([data-mdv-dyn])');
    const gen = document.querySelector('meta[name="generator"]');
    return {
      lang: state.lang,
      title: siteTitle(),
      csp: csp ? csp.getAttribute('content') : '',
      generator: gen ? gen.getAttribute('content') : core.NAME + ' ' + core.VERSION,
      css: document.getElementById('mdv-style').textContent,
      userCss: (document.getElementById('mdv-user-style') || { textContent: '' }).textContent,
      blocks: Array.prototype.map.call(document.querySelectorAll('script[id^="mdv-"]'), (s) => ({ id: s.id, type: s.getAttribute('type') || '', text: s.textContent }))
    };
  }

  /**
   * 隣の mdfolio.css があるかを確かめる（SPEC 3.10）。<link> の load / error はこのスクリプトより前に起きていることがあり、
   * ファイルがなくても空の style sheet ができる（Chromium）ので、同じファイルを画面に効かない形（media="not all"）で
   * もう一度読み込み、その結果で判断する。
   */
  function probeUserCss() {
    const link = document.getElementById('mdv-user-css');
    if (!link) return Promise.resolve(false);
    return new Promise((resolve) => {
      const probe = h('link', { rel: 'stylesheet', media: 'not all', href: link.getAttribute('href'), 'data-mdv-dyn': 'user-css-probe' });
      const done = (ok) => { probe.remove(); resolve(ok); };
      probe.addEventListener('load', () => done(true));
      probe.addEventListener('error', () => done(false));
      document.head.appendChild(probe);
    });
  }

  /**
   * 隣の mdfolio.css の状態。applied: 画面に効いているか。
   * text: 中身（http(s) の同じ配信元で読めたときだけ。file:// ではブラウザーの制約で読めないので null）。
   */
  async function adjacentCss() {
    const applied = await (state.userCssProbe || Promise.resolve(false));
    const link = document.getElementById('mdv-user-css');
    if (!applied || !link || !link.sheet) return { applied: false, text: null };
    try {
      return { applied: true, text: Array.prototype.map.call(link.sheet.cssRules, (r) => r.cssText).join('\n') };
    } catch (e) {
      return { applied: true, text: null };
    }
  }

  async function prepareExport(set) {
    await set.indexPromise;
    const plan = { docs: [], assets: [], skipped: 0, unreadable: 0, hasMath: false, hasMermaid: false, bytes: 0, parts: null };
    const refs = new Set();
    let last = performance.now();
    for (const p of set.docs) {
      const entry = set.entries.get(p);
      let text;
      try { text = await readDocText(entry, false); } catch (e) { plan.unreadable++; continue; }
      plan.docs.push(entry);
      plan.bytes += new TextEncoder().encode(text).length;
      if (!entry.tooLarge) {
        const r = state.renderer.collectRefs(core.parseFrontMatter(text).body);
        if (r.hasMath) plan.hasMath = true;
        if (r.hasMermaid) plan.hasMermaid = true;
        r.links.concat(r.images).forEach((href) => {
          const res = core.resolveLink(set.index, p, href);
          if (res.type === 'asset') refs.add(res.path);
        });
      }
      if (performance.now() - last > 12) { await yieldToBrowser(); last = performance.now(); }
    }
    for (const ap of refs) {
      const entry = set.entries.get(ap);
      try {
        if (entry.size === null) {
          const f = await entryFile(entry);
          entry.size = f.size;
          entry.mtime = f.lastModified;
        }
      } catch (e) { plan.skipped++; continue; }
      if (entry.size > core.LIMITS.maxAssetBytes) { plan.skipped++; continue; }
      plan.assets.push(entry);
      plan.bytes += Math.ceil(entry.size * 4 / 3);
    }
    // ビューア本体の大きさ（除外するライブラリは数えない）
    plan.parts = partsFromDom();
    plan.parts.blocks.forEach((b) => {
      if (!plan.hasMath && (b.id === 'mdv-lib-katex' || b.id === 'mdv-res-katex-css')) return;
      if (!plan.hasMermaid && b.id === 'mdv-lib-mermaid') return;
      if (b.id === 'mdv-site') return;
      plan.bytes += b.text.length;
    });
    plan.bytes += plan.parts.css.length;
    return plan;
  }

  async function buildSiteHtml(set, plan, title, home, userCss) {
    const files = [];
    plan.docs.forEach((e) => files.push({ path: e.path, kind: 'doc', text: e.text, mtime: e.mtime }));
    for (const e of plan.assets) {
      const blob = await assetBlob(e);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      // 種別は拡張子から決める（OS の設定によってブラウザが返す種別が変わるため）。分からないときだけブラウザの値を使う
      const known = core.mimeOf(e.path);
      const mime = known !== 'application/octet-stream' ? known : (blob.type || known);
      files.push({ path: e.path, kind: 'asset', mime: mime, base64: core.bytesToBase64(bytes), mtime: e.mtime });
      await yieldToBrowser();
    }
    const siteData = core.buildSiteData(set.name || title, files);
    // 書き出した HTML は別の場所で使うものなので、「お試し用の公開ページ」の指定は引き継がない
    const config = Object.assign({}, state.config, { title: title, home: home, hosted: false });
    const dropLibs = [];
    if (!plan.hasMath) dropLibs.push('katex');
    if (!plan.hasMermaid) dropLibs.push('mermaid');
    const parts = Object.assign({}, plan.parts, { lang: state.lang });
    return core.composeHtml(core.applySite(parts, { config: config, siteData: siteData, title: title, dropLibs: dropLibs, userCss: userCss || '' }));
  }

  let dialogSeq = 0;
  function dialogShell(extraClass, titleKey, leadText) {
    const titleId = 'mdv-dialog-title-' + (++dialogSeq);
    const dialog = h('dialog', { class: 'mdv-dialog ' + (extraClass || ''), 'aria-labelledby': titleId });
    const body = h('div', { class: 'mdv-dialog-body' });
    const foot = h('div', { class: 'mdv-dialog-foot' });
    const form = h('form', { class: 'mdv-dialog-form', method: 'dialog' }, [
      h('div', { class: 'mdv-dialog-head' }, [
        h('h2', { class: 'mdv-dialog-title', id: titleId }, t(titleKey)),
        leadText ? h('p', { class: 'mdv-dialog-lead' }, leadText) : null
      ]),
      body, foot
    ]);
    dialog.appendChild(form);
    dialog.addEventListener('close', () => dialog.remove());
    ui.app.appendChild(dialog);
    return { dialog: dialog, form: form, body: body, foot: foot };
  }

  async function openExportDialog() {
    const set = state.set;
    if (!set) return;
    const adjacent = await adjacentCss();
    if (state.set !== set) return;
    const d = dialogShell('mdv-dialog-export', 'exportTitle', t('exportLead'));
    const titleInput = h('input', { class: 'mdv-input mdv-export-title', type: 'text', value: siteTitle(), maxlength: '120' });
    const homeSelect = h('select', { class: 'mdv-input mdv-export-home' });
    const summary = h('p', { class: 'mdv-export-summary' }, t('exportPreparing'));
    const warn = h('p', { class: 'mdv-export-warn', hidden: true });
    const cancel = h('button', { class: 'mdv-btn mdv-export-cancel', type: 'button' }, t('cancel'));
    const run = h('button', { class: 'mdv-btn mdv-btn-primary mdv-export-run', type: 'submit', disabled: true }, t('exportDo'));
    // 見た目（CSS）: 選んだファイル → 隣の mdfolio.css（読めるとき）→ この HTML に埋め込まれているもの の順に候補にする（FR-1002〜1005）
    const inherited = (document.getElementById('mdv-user-style') || { textContent: '' }).textContent;
    let embed = adjacent.text !== null && adjacent.applied ? { text: adjacent.text, label: t('exportCssAdjacent') }
      : inherited ? { text: inherited, label: t('exportCssInherited') } : null;
    const cssStatus = h('p', { class: 'mdv-export-css-status' });
    const cssNote = h('p', { class: 'mdv-dialog-note mdv-export-css-note', hidden: true }, t('exportCssAdjacentNote'));
    const cssInput = h('input', { class: 'mdv-export-css-input', type: 'file', accept: '.css,text/css', hidden: true });
    const cssPick = h('button', { class: 'mdv-btn mdv-export-css-pick', type: 'button' }, t('exportCssPick'));
    const cssClear = h('button', { class: 'mdv-btn mdv-export-css-clear', type: 'button' }, t('exportCssClear'));
    const showCss = () => {
      cssStatus.textContent = embed ? t('exportCssStatus', embed.label) : t('exportCssNone');
      cssClear.hidden = !embed;
      cssNote.hidden = !(adjacent.applied && adjacent.text === null && !(embed && embed.picked));
    };
    cssPick.addEventListener('click', () => cssInput.click());
    cssClear.addEventListener('click', () => { embed = null; showCss(); });
    cssInput.addEventListener('change', guard(async () => {
      const file = cssInput.files && cssInput.files[0];
      cssInput.value = '';
      if (!file) return;
      if (file.size > core.LIMITS.maxUserCssBytes) { toast(t('exportCssTooLarge', file.name), { error: true }); return; }
      const text = (await file.text()).replace(/^\uFEFF/, '');
      if (/<\/style/i.test(text)) { toast(t('exportCssBad', file.name), { error: true }); return; }
      embed = { text: text, label: t('exportCssPicked', file.name), picked: true };
      showCss();
    }));
    showCss();
    append(d.body, [
      h('label', { class: 'mdv-field' }, [h('span', { class: 'mdv-field-label' }, t('exportSiteTitle')), titleInput]),
      h('label', { class: 'mdv-field' }, [h('span', { class: 'mdv-field-label' }, t('exportHome')), homeSelect]),
      h('div', { class: 'mdv-field mdv-export-css' }, [
        h('span', { class: 'mdv-field-label' }, t('exportCssLabel')),
        cssStatus, h('div', { class: 'mdv-export-css-actions' }, [cssPick, cssClear]), cssInput, cssNote
      ]),
      summary, warn
    ]);
    append(d.foot, [cancel, run]);
    cancel.addEventListener('click', () => d.dialog.close());
    d.dialog.showModal();

    let plan = null;
    d.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!plan) return;
      run.disabled = true;
      const title = titleInput.value.trim() || siteTitle();
      const name = core.sanitizeFileName(title, 'site') + '.html';
      buildSiteHtml(set, plan, title, homeSelect.value, embed ? embed.text : '').then((html) => {
        downloadBlob(new Blob([html], { type: 'text/html' }), name);
        d.dialog.close();
        toast(t('exported', name));
      }).catch((e) => {
        run.disabled = false;
        toast(t('exportFailed', (e && e.message) || String(e)), { error: true });
      });
    });

    try {
      plan = await prepareExport(set);
    } catch (e) {
      summary.textContent = t('exportFailed', (e && e.message) || String(e));
      return;
    }
    if (!d.dialog.isConnected) return;
    plan.docs.forEach((e) => {
      const opt = h('option', { value: e.path }, e.path);
      if (e.path === set.home) opt.selected = true;
      homeSelect.appendChild(opt);
    });
    summary.textContent = t('exportSummary', plan.docs.length, plan.assets.length, core.formatBytes(plan.bytes));
    const warns = [];
    if (plan.skipped) warns.push(t('exportSkipped', plan.skipped));
    if (plan.unreadable) warns.push(t('exportUnreadable', plan.unreadable));
    if (plan.bytes > core.LIMITS.warnTotalBytes) warns.push(t('exportLarge'));
    warn.hidden = !warns.length;
    warn.textContent = warns.join(' ');
    run.disabled = !plan.docs.length;
  }

  function openAboutDialog() {
    const d = dialogShell('mdv-dialog-wide mdv-dialog-about', 'aboutTitle', t('aboutLead', core.NAME, core.VERSION));
    const text = readJsonBlock('mdv-res-licenses');
    d.body.appendChild(h('pre', { class: 'mdv-licenses', tabindex: '0' }, typeof text === 'string' ? text : ''));
    const close = h('button', { class: 'mdv-btn mdv-btn-primary mdv-about-close', type: 'button' }, t('close'));
    close.addEventListener('click', () => d.dialog.close());
    d.foot.appendChild(close);
    d.dialog.showModal();
    close.focus();
  }

  // ------------------------------------------------------------------ イベント

  /**
   * 非同期のクリップボード API を使えるか。
   * 別オリジンのフレームの中では、埋め込む側が許可していないと使えない（呼ぶとコンソールにエラーが出る）ので、
   * 分かる場合は先に確かめて、従来の方式でコピーする。
   */
  function clipboardApiAllowed() {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false;
    try {
      const policy = document.permissionsPolicy || document.featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function' && !policy.allowsFeature('clipboard-write')) return false;
    } catch (e) { /* 判定できなければ、API を試す */ }
    return true;
  }

  /** 別のページの中（フレーム）に表示されているか。 */
  function isFramed() {
    try { return window.top !== window.self; } catch (e) { return true; }
  }

  /**
   * 従来の方式（見えない入力欄を選択してコピーする）でコピーする。できたら true。
   * 押した操作の中で同期的に呼ぶ必要がある（あとから呼ぶと、ブラウザーによっては拒否される）。
   */
  function copyWithSelection(text, btn) {
    const hadFocus = document.activeElement === btn;
    // 画面に固定した見えない入力欄に入れて選択する（位置を固定しておくと、選択のときに画面が動かない）
    const ta = h('textarea', { class: 'mdv-copy-buffer', 'aria-hidden': 'true', tabindex: '-1', readonly: true });
    ta.value = text;
    document.body.appendChild(ta);
    let ok = false;
    try {
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* 無視 */ }
      ok = document.execCommand('copy') === true;
    } catch (e) {
      ok = false;
    }
    ta.remove();
    if (hadFocus) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    return ok;
  }

  function copyCode(btn) {
    const wrap = btn.closest('.mdv-code');
    const code = wrap && wrap.querySelector('pre');
    if (!code) return;
    const text = code.textContent;
    const show = (key) => {
      btn.textContent = t(key);
      clearTimeout(btn._mdvTimer);
      btn._mdvTimer = setTimeout(() => { btn.textContent = t('copy'); }, key === 'copied' ? 1600 : 2600);
    };
    const viaApi = (onRefused) => navigator.clipboard.writeText(text).then(() => show('copied'), onRefused);
    if (!isFramed() && clipboardApiAllowed()) {
      viaApi(() => show(copyWithSelection(text, btn) ? 'copied' : 'copyFailed'));
      return;
    }
    // フレームの中では、非同期の API が拒否されることがある。拒否を待ってから従来の方式に切り替えると、
    // 「押した操作の中」ではなくなって失敗するブラウザーがあるので、先に従来の方式を試す
    if (copyWithSelection(text, btn)) show('copied');
    else if (clipboardApiAllowed()) viaApi(() => show('copyFailed'));
    else show('copyFailed');
  }

  function hasFiles(ev) {
    const types = ev.dataTransfer && ev.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') >= 0;
  }

  function setDragging(on) {
    ui.app.classList.toggle('is-dragover', on);
    ui.dropVeil.hidden = !on || state.view === 'welcome';
  }

  function wireEvents() {
    window.addEventListener('hashchange', () => {
      if (state.skipHashEvents > 0) { state.skipHashEvents--; return; } // go() で処理済み
      handleRoute();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach((type) => {
      window.addEventListener(type, () => { state.userScrolled = true; }, { passive: true, capture: true });
    });
    window.addEventListener('resize', applySidebarState);
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(markScrollable, 200);
    });
    if (darkQuery) {
      const onChange = () => applyTheme();
      if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange); else if (darkQuery.addListener) darkQuery.addListener(onChange);
    }

    ui.sidebarBtn.addEventListener('click', toggleSidebar);
    ui.scrim.addEventListener('click', closeDrawer);
    ui.themeBtn.addEventListener('click', cycleTheme);
    ui.menuBtn.addEventListener('click', () => { if (ui.menu.hidden) openMenu(); else closeMenu(); });
    ui.menuBtn.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' && ui.menu.hidden) { ev.preventDefault(); openMenu(); }
    });
    // メニューの中は、上下の矢印・Home・End で移動する。Tab で外へ出たら閉じる
    ui.menu.addEventListener('keydown', (ev) => {
      const items = Array.prototype.slice.call(ui.menu.querySelectorAll('.mdv-menu-item:not([hidden])'));
      const i = items.indexOf(document.activeElement);
      let next = -1;
      if (ev.key === 'ArrowDown') next = (i + 1) % items.length;
      else if (ev.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = items.length - 1;
      else if (ev.key === 'Tab') { ui.menuBtn.focus(); closeMenu(); return; }
      if (next >= 0) { ev.preventDefault(); items[next].focus(); }
    });

    ui.openFolderBtn.addEventListener('click', guard(openFolder));
    ui.openFilesBtn.addEventListener('click', guard(openFiles));
    ui.lastBtn.addEventListener('click', guard(openLastFolder));
    ui.dirInput.addEventListener('change', guard(() => {
      if (ui.dirInput.files && ui.dirInput.files.length) installSet(setFromFileList(ui.dirInput.files, true));
    }));
    ui.fileInput.addEventListener('change', guard(() => {
      if (ui.fileInput.files && ui.fileInput.files.length) installSet(setFromFileList(ui.fileInput.files, false));
    }));

    [ui.tabNav, ui.tabFiles].forEach((tab) => {
      tab.addEventListener('click', () => { state.sideTab = tab.getAttribute('data-tab'); applySideTab(); updateActiveLinks(); });
      // 矢印キーでもタブを切り替えられるようにする
      tab.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End') return;
        ev.preventDefault();
        const other = ev.key === 'Home' ? ui.tabNav : ev.key === 'End' ? ui.tabFiles : (tab === ui.tabNav ? ui.tabFiles : ui.tabNav);
        other.focus();
        other.click();
      });
    });

    // 検索
    ui.searchInput.addEventListener('input', () => {
      clearTimeout(state.search.timer);
      state.search.timer = setTimeout(() => { state.search.active = -1; runSearch(); }, 150);
    });
    ui.searchInput.addEventListener('focus', () => { if (ui.searchInput.value.trim()) runSearch(); });
    ui.searchInput.addEventListener('keydown', onSearchKey);
    ui.searchList.addEventListener('click', (ev) => {
      const item = ev.target.closest ? ev.target.closest('.mdv-search-item') : null;
      if (!item || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      openResult(Number(item.getAttribute('data-index')));
    });

    // 本文・サイドバー内のクリック
    document.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!target || !target.closest) return;
      if (!ui.menu.hidden && !target.closest('.mdv-menu-wrap')) closeMenu();
      if (!ui.searchPanel.hidden && !target.closest('.mdv-search')) closeSearchPanel();
      const copy = target.closest('.mdv-copy');
      if (copy) { copyCode(copy); return; }
      const asset = target.closest('a[data-mdv-asset]');
      // 保存を使わない設定のときは何もせず、リンク先（添付の説明のページ）へ移動させる
      if (asset && state.set && state.config.allowDownloads && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && ev.button === 0) {
        const entry = state.set.entries.get(asset.getAttribute('data-mdv-asset'));
        if (entry) { ev.preventDefault(); downloadEntry(entry); }
        return;
      }
      // アプリ内のリンク（#…）は、ブラウザーに任せず、ここで移動する。
      // 文書の URL と基準 URL が異なる環境（srcdoc で埋め込まれたフレームなど）では、
      // ブラウザーに任せると別のページへの移動になり、表示が消えてしまう。
      // 表示中の文書へのリンクをもう一度押したときは、先頭へ戻る（go() が同じ文書を表示し直す）
      const link = target.closest('a[href]');
      if (!link || ev.defaultPrevented) return;
      const href = link.getAttribute('href');
      if (href.charAt(0) !== '#') return;
      // 新しいタブで開く・保存するなどの操作は、ブラウザーに任せる
      if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || link.hasAttribute('download')) return;
      ev.preventDefault();
      go(href);
    });

    document.addEventListener('keydown', (ev) => {
      const tag = ev.target && ev.target.nodeName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ev.target && ev.target.isContentEditable);
      if ((ev.key === 'k' || ev.key === 'K') && (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey) {
        if (!state.set) return;
        ev.preventDefault();
        ui.searchInput.focus();
        ui.searchInput.select();
        return;
      }
      if (ev.key === '/' && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey && state.set) {
        ev.preventDefault();
        ui.searchInput.focus();
        ui.searchInput.select();
        return;
      }
      if (ev.key === 'Escape') {
        if (!ui.menu.hidden) { closeMenu(); ui.menuBtn.focus(); }
        if (!ui.searchPanel.hidden) closeSearchPanel();
        closeDrawer();
      }
    });

    // ドラッグ＆ドロップ（サイトモードでは受け付けない）
    window.addEventListener('dragenter', (ev) => {
      if (state.mode === 'site' || !hasFiles(ev)) return;
      ev.preventDefault();
      state.dragDepth++;
      setDragging(true);
    });
    window.addEventListener('dragover', (ev) => {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = state.mode === 'site' ? 'none' : 'copy';
    });
    window.addEventListener('dragleave', (ev) => {
      if (state.mode === 'site' || !hasFiles(ev)) return;
      state.dragDepth = Math.max(0, state.dragDepth - 1);
      if (!state.dragDepth) setDragging(false);
    });
    window.addEventListener('drop', (ev) => {
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      state.dragDepth = 0;
      setDragging(false);
      if (state.mode === 'site') return;
      openDataTransfer(ev.dataTransfer).catch(reportError);
    });

    // 印刷では、まだ色分けしていないコードブロックも済ませてから出力する
    window.addEventListener('beforeprint', flushHighlight);

    window.addEventListener('unhandledrejection', (ev) => {
      if (ev && ev.reason && ev.reason.name === 'AbortError') return;
      if (window.console && console.warn) console.warn('[mdfolio]', ev && ev.reason);
    });
  }

  // ------------------------------------------------------------------ 起動

  function init() {
    state.config = core.normalizeConfig(readJsonBlock('mdv-config'));
    state.userCssProbe = probeUserCss();
    state.settings = loadSettings();
    if (!externalAllowed()) lockExternalMedia(); // 文書を表示する前に行う
    const langPref = state.settings.lang === 'ja' || state.settings.lang === 'en' ? state.settings.lang
      : state.config.lang !== 'auto' ? state.config.lang : i18n.detect(navigator);
    state.lang = langPref;

    try { history.scrollRestoration = 'manual'; } catch (e) { /* 無視 */ }
    installSanitizerHook();
    createRenderer();
    buildChrome();
    applyLanguage();
    applySidebarState();
    updateChromeForSet();
    wireEvents();

    const raw = readJsonBlock('mdv-site');
    const check = core.validateSiteData(raw);
    if (check.ok) {
      state.mode = 'site';
      updateMenu();
      if (installSet(setFromSiteData(raw), { keepRoute: true })) return;
      state.mode = 'viewer';
    } else if (!check.empty) {
      toast(t('siteDataError'), { error: true });
    }
    updateMenu();
    loadLastFolder();
    handleRoute();
  }

  // テストや利用者スクリプトから状態を参照できるようにする（読み取り用）
  window.MDV.app = {
    get state() { return state; },
    version: core.VERSION
  };

  try {
    init();
  } catch (e) {
    const root = document.getElementById('mdv-root');
    if (root) root.textContent = 'mdfolio: ' + ((e && e.message) || e);
    throw e;
  }
})();
