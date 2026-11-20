/*!
 * mdfolio app — UI and interaction
 * MIT License
 */
(function () {
  'use strict';
  // When the CLI (Node.js) evaluates this script there is no UI, so do nothing
  if (typeof document === 'undefined' || typeof window === 'undefined' || !document.getElementById('mdv-root')) return;

  const core = window.MDV.core;
  const mdx = window.MDV.md;
  const i18n = window.MDV.i18n;

  const SETTINGS_KEY = 'mdv:settings:v1';
  // External image permission is kept per HTML file (FR-1107): every file:// page shares one storage area,
  // so a shared value would turn external images on in every mdfolio file on the computer
  const EXTERNAL_KEY = 'mdv:external:' + String(window.location.pathname || '');
  const IDB_NAME = 'mdv';
  const IDB_STORE = 'kv';
  const AUTO_REFRESH_MS = 2000;
  const USER_CSS_PROBE_MS = 3000;
  const SEARCH_LIMIT = 50;
  const ID_PREFIX = 'user-content-';
  const HIGHLIGHT_MAX_CHARS = 200000;   // Code blocks longer than this are not syntax-highlighted
  const HIGHLIGHT_SYNC_CHARS = 20000;   // Per render, highlight synchronously (along with display) up to this many characters
  const HIGHLIGHT_SYNC_BLOCKS = 60;     // Likewise, up to this many blocks. The rest are processed bit by bit after display
  const INDEX_TEXT_MAX = 2 * 1024 * 1024;

  // ------------------------------------------------------------------ State

  const state = {
    config: core.normalizeConfig(null),
    settings: {},
    lang: 'en',
    mode: 'viewer',        // viewer (viewer mode) | site (site mode)
    set: null,             // The open document set
    view: 'welcome',       // welcome | doc | help | message
    current: null,         // Path of the document being displayed
    currentEntry: null,
    viewTitle: '',         // Title of the current view (document, help, not found), for the browser tab
    pendingRoute: null,    // Where to go once the document set has loaded
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
    userCssProbe: null,    // Whether an adjacent mdfolio.css exists (Promise<boolean>; probeUserCss)
    renderer: null,
    sideTab: 'nav',
    search: { timer: null, results: [], active: -1, query: '', terms: [] },
    refreshTimer: null,
    refreshBusy: false,
    dragDepth: 0,
    mediaLocked: false,    // Whether external images/media are blocked via CSP (lockExternalMedia)
    pendingCode: null,     // Code blocks to highlight after display (scheduleHighlight)
    skipHashEvents: 0      // Number of hashchange events to skip because go() already handled them
  };

  const ui = {};
  const bindings = [];
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  // ------------------------------------------------------------------ Small helpers

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

  /** Bind UI text to an element so it is all updated when the language changes (use only for permanent UI parts). */
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

  /**
   * Site title (FR-1104): the title setting, else the title of the home document (front matter title or its
   * first heading, once known), else the folder name.
   */
  function siteTitle() {
    if (state.config.title) return state.config.title;
    const set = state.set;
    if (!set) return core.NAME;
    const home = set.home && set.entries.get(set.home);
    return (home && home.title) || set.name || core.NAME;
  }

  /** Called when document titles become known: update the header, the tab title and the file list labels. */
  function refreshTitles() {
    if (!state.set) return;
    ui.title.textContent = siteTitle();
    if (state.view === 'welcome') document.title = siteTitle();
    else document.title = tabTitle(state.currentEntry ? state.currentEntry.title : state.viewTitle);
    refreshTreeLabels();
  }

  function tabTitle(title) {
    const site = siteTitle();
    return title && title !== site ? title + ' - ' + site : site;
  }

  /**
   * Focus an element in the sticky header or its menu without scrolling. Chromium otherwise scrolls the page
   * when focus moves to a sticky element (closing the menu jumped from deep in a document to near the top).
   */
  function focusNoScroll(el) {
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  function reportError(err) {
    const msg = err && err.message ? err.message : String(err);
    if (window.console && console.warn) console.warn('[mdfolio]', err);
    toast(t('errorGeneric', msg), { error: true });
  }

  /** Wrap an async operation and turn exceptions into notifications (FR-901). */
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

  // ------------------------------------------------------------------ Settings

  let legacyExternalImages; // see loadSettings

  function loadSettings() {
    let v = {};
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      v = raw ? JSON.parse(raw) : {};
      if (!v || typeof v !== 'object') v = {};
    } catch (e) {
      v = {};
    }
    // A shared value saved by 1.3.1 or earlier is ignored, but kept in storage (and when saving) because
    // files of those versions on the same computer still read it
    legacyExternalImages = v.externalImages;
    delete v.externalImages;
    try {
      const ext = window.localStorage.getItem(EXTERNAL_KEY);
      if (ext === '1' || ext === '0') v.externalImages = ext === '1';
    } catch (e) { /* storage unavailable */ }
    return v;
  }

  /** Save settings. Keep working even where saving is not possible (FR-702). Returns whether saving succeeded. */
  function saveSettings() {
    try {
      const shared = Object.assign({}, state.settings);
      delete shared.externalImages;
      if (legacyExternalImages !== undefined) shared.externalImages = legacyExternalImages;
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(shared));
      if (typeof state.settings.externalImages === 'boolean') {
        window.localStorage.setItem(EXTERNAL_KEY, state.settings.externalImages ? '1' : '0');
        if (window.localStorage.getItem(EXTERNAL_KEY) === null) return false;
      }
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
    if (state.config.lockExternalImages) return false; // Fixed by configuration (takes precedence over the user's setting)
    return typeof state.settings.externalImages === 'boolean' ? state.settings.externalImages : state.config.allowExternalImages;
  }

  // Also stop external images/media from loading via the browser's CSP (SEC-5).
  // Relying only on stripping them at render time (resolveMedia) cannot block loads from other paths,
  // such as image references in diagrams (Mermaid) or url() in styles. So while not allowed, add a policy that restricts img-src / media-src.
  // CSP can only be made stricter, so switching to "allowed" requires reloading the page.
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

  // ------------------------------------------------------------------ Notifications

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

  // ------------------------------------------------------------------ Page skeleton

  function buildChrome() {
    const root = document.getElementById('mdv-root');
    const app = ui.app = h('div', { class: 'mdv-app', 'data-view': 'welcome', 'data-has-set': 'false' });

    const skip = bind(h('a', { class: 'mdv-skip', href: '#mdv-main' }), (el) => { el.textContent = t('skipToContent'); });
    skip.addEventListener('click', (ev) => { ev.preventDefault(); ui.main.focus(); });

    // Header
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

    // Sidebar
    ui.tabNav = bind(h('button', { class: 'mdv-side-tab', type: 'button', role: 'tab', id: 'mdv-tab-nav', 'aria-controls': 'mdv-sidenav', 'data-tab': 'nav' }), (el) => { el.textContent = t('tabNav'); });
    ui.tabFiles = bind(h('button', { class: 'mdv-side-tab', type: 'button', role: 'tab', id: 'mdv-tab-files', 'aria-controls': 'mdv-side-tree', 'data-tab': 'files' }), (el) => { el.textContent = t('tabFiles'); });
    ui.sideTabs = h('div', { class: 'mdv-side-tabs', role: 'tablist', hidden: true }, [ui.tabNav, ui.tabFiles]);
    ui.sideNav = h('div', { class: 'mdv-sidenav', id: 'mdv-sidenav', hidden: true });
    ui.sideTree = h('div', { class: 'mdv-side-tree', id: 'mdv-side-tree' });
    ui.sidebar = bind(h('nav', { class: 'mdv-sidebar', id: 'mdv-sidebar' }, [ui.sideTabs, ui.sideNav, ui.sideTree]),
      (el) => { el.setAttribute('aria-label', t('sidebarLabel')); });
    ui.scrim = h('div', { class: 'mdv-scrim', hidden: true });

    // Main content
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

    // Other permanent parts
    ui.toasts = h('div', { class: 'mdv-toasts', 'aria-live': 'polite' });
    ui.dirInput = h('input', { class: 'mdv-hidden-input mdv-input-dir', type: 'file', webkitdirectory: true, multiple: true, tabindex: '-1', 'aria-hidden': 'true' });
    // On phones and tablets, do not filter by type (accept).
    // How the .md type is handled varies by device and storage app, and filtering can make Markdown files unselectable.
    // If something other than Markdown is chosen, report it at load time
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
      focusNoScroll(ui.menuBtn); // The items get hidden, so move focus back to the menu button (also the return target when a dialog closes)
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
    if (first) focusNoScroll(first);
  }

  function closeMenu() {
    if (ui.menu.hidden) return;
    ui.menu.hidden = true;
    ui.menuBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleExternalImages() {
    if (state.config.lockExternalImages) return;
    if (externalAllowed()) {
      // Allowed -> blocked can take effect immediately
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

  /** Blocked -> allowed requires a reload, so confirm it together with the fact that more hosts will be contacted. */
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
        // If settings cannot be saved, the allowed state will not survive the reload
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

  // ------------------------------------------------------------------ Opening and closing the sidebar

  function isNarrow() {
    return window.matchMedia('(max-width: 799px)').matches;
  }

  /** Start screen description. Omit the drop hint on touch devices, and mention it on the hosted trial page. */
  function welcomeLeadKey() {
    return 'welcomeLead' + (state.config.hosted ? 'Hosted' : '') + (coarsePointer() ? 'Touch' : '');
  }

  /** Whether the primary input is touch (fingers). */
  function coarsePointer() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }

  function applySidebarState() {
    const open = state.settings.sidebar !== false;
    ui.app.setAttribute('data-sidebar', open ? 'open' : 'closed');
    const expanded = isNarrow() ? ui.app.classList.contains('is-drawer-open') : open;
    ui.sidebarBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  /**
   * While the narrow-width drawer is open, the content behind it cannot take focus (FR-1108).
   * The header stays usable so that the sidebar button can close the drawer.
   */
  function setDrawerInert(open) {
    if (open) ui.sheet.setAttribute('inert', '');
    else ui.sheet.removeAttribute('inert');
  }

  function toggleSidebar() {
    if (isNarrow()) {
      const open = !ui.app.classList.contains('is-drawer-open');
      if (!open) { closeDrawer(); return; }
      ui.app.classList.add('is-drawer-open');
      ui.scrim.hidden = false;
      setDrawerInert(true);
      applySidebarState();
      updateActiveLinks();
      return;
    } else {
      state.settings.sidebar = state.settings.sidebar === false;
      saveSettings();
    }
    applySidebarState();
  }

  function closeDrawer(opts) {
    if (!ui.app.classList.contains('is-drawer-open')) return;
    // When focus was inside the drawer, return it to the sidebar button so it is not lost (FR-1108).
    // Not when a document was chosen in the drawer: the newly shown document handles focus then.
    const navigating = !!(opts && opts.navigating);
    const keepFocus = !!(opts && opts.keepFocus);
    const focusInside = ui.sidebar.contains(document.activeElement);
    ui.app.classList.remove('is-drawer-open');
    ui.scrim.hidden = true;
    setDrawerInert(false);
    applySidebarState();
    if (focusInside && !keepFocus) {
      if (navigating) { try { ui.main.focus({ preventScroll: true }); } catch (e) { ui.main.focus(); } } else focusNoScroll(ui.sidebarBtn);
    }
  }

  // ------------------------------------------------------------------ Document set

  function newSet(name, source) {
    return {
      id: ++state.setSeq,
      name: name || '',
      source: source,          // handles | files | embedded
      single: false,           // Only files were opened, not a folder
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
    set.urls.forEach((url) => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } });
    set.urls.clear();
  }

  /** Apply the document set to the UI. If it has no Markdown documents, only notify and change nothing (FR-902). */
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
    if (pending && set.entries.has(pending.path)) {
      target = core.buildRoute(pending.path, pending.fragment);
      if (typeof pending.keepScroll === 'number') {
        try {
          history.replaceState(null, '', target);
          handleRoute({ keepScroll: pending.keepScroll });
          return true;
        } catch (e) { /* fall back to a normal navigation */ }
      }
    }
    go(target, true);
    return true;
  }

  // ---- Choosing folders and files

  async function openFolder() {
    if (typeof window.showDirectoryPicker === 'function') {
      let handle = null;
      try {
        handle = await window.showDirectoryPicker({ mode: 'read' });
      } catch (e) {
        if (e && e.name === 'AbortError') return; // The user cancelled
        handle = null; // If unavailable or denied, fall back to the traditional method
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

  /** Build a document set from a list of Files obtained from <input> or a drop. */
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

  // ---- Drag and drop

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

  /** Walk entries obtained via webkitGetAsEntry (drops in Firefox / Safari). */
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
        } catch (e) { /* skip files that cannot be read */ }
      }
    }
  }

  async function openDataTransfer(dt) {
    // Extract everything needed while still inside the drop event (before the first await)
    const items = dt.items ? Array.prototype.filter.call(dt.items, (it) => it.kind === 'file') : [];
    const files = dt.files ? Array.prototype.slice.call(dt.files) : [];
    let handlePromises = null;
    let entries = null;
    if (items.length && typeof items[0].getAsFileSystemHandle === 'function') {
      // Set a timeout in case no handle is obtained or there is no response
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

  // ---- Embedded data (site mode)

  function setFromSiteData(data) {
    const set = newSet(data.name, 'embedded');
    data.files.forEach((f) => {
      if (f.kind === 'doc') addEntry(set, f.path, { text: f.text, size: f.text.length, mtime: f.mtime });
      else addEntry(set, f.path, { base64: f.base64, mime: f.mime, size: Math.floor(f.base64.length * 3 / 4), mtime: f.mtime });
    });
    return set;
  }

  // ---- Loading

  async function entryFile(entry) {
    if (entry.handle) return entry.handle.getFile();
    if (entry.file) return entry.file;
    throw new Error('no source');
  }

  /** Return the document's text. If fresh is true and there is a handle, re-read it from disk. */
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
      // If the type is unknown, infer it from the extension (so that SVG etc. can be shown in <img>)
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

  // ------------------------------------------------------------------ Last folder (FR-108)

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
      .catch(() => { /* failing to save does not affect viewing */ });
  }

  function loadLastFolder() {
    if (typeof window.showDirectoryPicker !== 'function' || !window.indexedDB) return;
    idbRun('readonly', (store) => store.get(lastKey())).then((rec) => {
      if (!rec || !rec.handle || typeof rec.handle.entries !== 'function') return;
      state.lastFolder = { handle: rec.handle, name: rec.name || rec.handle.name };
      ui.lastBtn.textContent = t('reopenLast', state.lastFolder.name);
      ui.lastWrap.hidden = false;
    }).catch(() => { /* not shown in environments where it is unavailable */ });
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

  // ------------------------------------------------------------------ Reload / auto-update (FR-109)

  async function reloadSet() {
    const set = state.set;
    if (!set) return;
    if (set.rootHandle) {
      const route = core.parseRoute(location.hash);
      const scrollY = window.scrollY;
      const fresh = newSet(set.name, 'handles');
      fresh.rootHandle = set.rootHandle;
      await scanDirHandle(fresh, set.rootHandle, '', null);
      // Come back to the same document at the same scroll position
      if (route.type === 'doc') state.pendingRoute = Object.assign({}, route, { keepScroll: scrollY });
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
      // Deleted, moved, permission revoked, etc. Do nothing until the next action
    } finally {
      state.refreshBusy = false;
    }
  }

  // ------------------------------------------------------------------ Rendering

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
      // Do not load image/media sources here; resolve them later
      if (node.hasAttribute('src')) {
        node.setAttribute('data-mdv-src', node.getAttribute('src'));
        node.removeAttribute('src');
      }
      // Do not let content claim the app's internal classes
      if (node.hasAttribute('class')) {
        const cls = node.getAttribute('class').split(/\s+/).filter((c) => c && !/^mdv-/i.test(c));
        if (cls.length) node.setAttribute('class', cls.join(' ')); else node.removeAttribute('class');
      }
      if (node.hasAttribute('style')) {
        const st = core.filterStyle(node.getAttribute('style'));
        if (st) node.setAttribute('style', st); else node.removeAttribute('style');
      }
      // input is only for displaying checkboxes
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
    // Syntax highlighting happens after sanitizing (highlightCode). Not specified here
    state.renderer = mdx.createRenderer({
      alertLabels: function () {
        return { note: t('alertNote'), tip: t('alertTip'), important: t('alertImportant'), warning: t('alertWarning'), caution: t('alertCaution') };
      }
    });
  }

  // ---- Syntax highlighting (FR-204)
  // The highlighting result (HTML with only span and class) is also passed through the sanitizer before insertion.
  // To avoid delaying display of large documents, anything beyond a set amount is processed bit by bit after display.

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

  /** Replace the contents of a code element with the highlighted version. Do not replace if even one character would change. */
  function highlightCode(code, lang) {
    const text = code.textContent;
    try {
      const html = window.hljs.highlight(text, { language: lang.toLowerCase(), ignoreIllegals: true }).value;
      const frag = window.DOMPurify.sanitize(html, HIGHLIGHT_PURIFY);
      if (frag.textContent !== text) return false;
      code.replaceChildren(frag);
      return true;
    } catch (e) {
      return false; // Even without highlighting, the code remains readable as is
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

  /** Process code blocks not highlighted at display time, starting with those nearest the viewport. */
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

  /** Finish all remaining highlighting at once (e.g. before printing). */
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
        // Scheme-less (//host/…) is treated as https (so it is not interpreted as a UNC path under file://)
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

  /** Heading text. Excludes the descriptions (placeholders) of images that could not be shown. */
  function headingText(hd) {
    if (!hd.querySelector('.mdv-ph')) return hd.textContent.trim();
    const copy = hd.cloneNode(true);
    copy.querySelectorAll('.mdv-ph').forEach((n) => n.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  /** Resolve links and images and add UI parts to a sanitized fragment. */
  function postProcess(frag, ctx) {
    // Links
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

    // Images and media
    frag.querySelectorAll('[data-mdv-src]').forEach((el) => {
      const src = el.getAttribute('data-mdv-src');
      el.removeAttribute('data-mdv-src');
      const tag = el.nodeName;
      if (tag !== 'IMG' && tag !== 'VIDEO' && tag !== 'AUDIO' && tag !== 'SOURCE') return;
      resolveMedia(el, src, ctx);
    });

    // Headings: collect material for the table of contents and add anchor links
    const toc = [];
    frag.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((hd) => {
      const id = hd.getAttribute('id') || '';
      if (id.indexOf(ID_PREFIX) !== 0) return;
      const slug = id.slice(ID_PREFIX.length);
      const level = Number(hd.nodeName.charAt(1));
      const text = headingText(hd);
      if (ctx.nav) return; // The sidebar nav gets no table of contents or anchors
      if (level <= 4) toc.push({ level: level, text: text, slug: slug });
      hd.appendChild(h('a', { class: 'mdv-anchor', href: routeFor(ctx, slug), 'aria-label': t('anchorLabel', text) }, '#'));
    });
    if (ctx.nav) return { toc: toc };

    // Task list checkboxes: give them names so their state can be read aloud
    frag.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.setAttribute('aria-label', t(box.hasAttribute('checked') ? 'taskDone' : 'taskTodo'));
    });

    // Code blocks: highlighting, language name and copy button
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

    // Tables: wrap in a horizontally scrollable box
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

  // ---- Lazily loaded libraries (KaTeX / Mermaid)

  /**
   * Carry the page's nonce over to script / style elements added later.
   * The distributed HTML uses a hash-based CSP, so this does nothing there. It is for environments that serve it with a nonce-based CSP.
   */
  function inheritNonce(el) {
    try {
      const src = document.querySelector('script[nonce]');
      const nonce = src ? (src.nonce || src.getAttribute('nonce')) : '';
      if (nonce) el.nonce = nonce;
    } catch (e) { /* ignore */ }
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
        document.head.appendChild(s); // If the CSP allows it (e.g. matching hash), it runs synchronously here
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

  /** Insert library CSS before the app's CSS, so that the app's and the user's CSS (mdfolio.css etc.) take precedence. */
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
        // \label{...} is for LaTeX cross-references, which KaTeX does not support: ignore it rather than show an error (FR-1110).
        // An even run of backslashes before "label" is line breaks (\\) followed by text, which is kept
        window.katex.render(tex.replace(/(\\+)label\{[^{}]*\}/g, (m, bs) => (bs.length % 2 ? bs.slice(1) : m)), el, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml', errorColor: '#B3261E', maxExpand: 1000, maxSize: 50 });
      } catch (e) {
        el.classList.add('mdv-math-raw');
      }
    });
  }

  const MERMAID_LIGHT = {
    darkMode: false, background: '#FFFFFF', primaryColor: '#E3ECF8', primaryTextColor: '#17202B', primaryBorderColor: '#1D4F91',
    secondaryColor: '#F2F5F8', secondaryTextColor: '#17202B', secondaryBorderColor: '#5A6878',
    tertiaryColor: '#FFFFFF', tertiaryTextColor: '#17202B', tertiaryBorderColor: '#D3DAE3',
    lineColor: '#3A4654', textColor: '#17202B', noteBkgColor: '#FFF6D6', noteTextColor: '#2B2300', noteBorderColor: '#C9A227',
    // Category colors (FR-1101); overridden by --chart-1 ... --chart-8 below
    pie1: '#2F6DB5', pie2: '#D9822B', pie3: '#3A9A6A', pie4: '#C2455A', pie5: '#7A5BB5', pie6: '#2A9BB0', pie7: '#B08A1E', pie8: '#7A8696',
    pieSectionTextColor: '#FFFFFF', pieStrokeColor: '#FFFFFF', pieOuterStrokeColor: '#D3DAE3'
  };
  const MERMAID_DARK = {
    darkMode: true, background: '#151F2C', primaryColor: '#1D2D42', primaryTextColor: '#DCE4EE', primaryBorderColor: '#8AB8F2',
    secondaryColor: '#1B2736', secondaryTextColor: '#DCE4EE', secondaryBorderColor: '#93A1B2',
    tertiaryColor: '#151F2C', tertiaryTextColor: '#DCE4EE', tertiaryBorderColor: '#2A3646',
    lineColor: '#93A1B2', textColor: '#DCE4EE', noteBkgColor: '#3D3200', noteTextColor: '#FFF3C4', noteBorderColor: '#8A6D00',
    pie1: '#6FA8EE', pie2: '#F0A45C', pie3: '#6CCB97', pie4: '#EE7F90', pie5: '#B39AF0', pie6: '#62C7DA', pie7: '#E2C25A', pie8: '#A9B4C2',
    pieSectionTextColor: '#0F1722', pieStrokeColor: '#151F2C', pieOuterStrokeColor: '#2A3646'
  };

  /**
   * Diagram colors are taken from the color variables in the CSS (document.css), so diagrams do not end up with different colors (FD-4).
   * Values the diagram library cannot parse (color-mix() etc.) are not used; the default colors are kept instead.
   */
  const MERMAID_FROM_CSS = {
    background: '--sheet', primaryColor: '--accent-soft', primaryTextColor: '--ink', primaryBorderColor: '--accent',
    secondaryColor: '--code-bg', secondaryTextColor: '--ink', secondaryBorderColor: '--muted',
    tertiaryColor: '--sheet', tertiaryTextColor: '--ink', tertiaryBorderColor: '--rule',
    lineColor: '--ink-soft', textColor: '--ink',
    pie1: '--chart-1', pie2: '--chart-2', pie3: '--chart-3', pie4: '--chart-4', pie5: '--chart-5', pie6: '--chart-6', pie7: '--chart-7', pie8: '--chart-8',
    pieStrokeColor: '--sheet', pieOuterStrokeColor: '--rule', pieTitleTextColor: '--ink', pieLegendTextColor: '--ink'
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

  /**
   * A diagram that would have to shrink below half of its natural width is shown at its natural size,
   * and the reader scrolls it sideways (FR-1102). Smaller diagrams keep shrinking to fit.
   */
  function fitWideDiagram(container) {
    const svg = container.querySelector(':scope > svg');
    if (!svg) return;
    // Decided again when the column width changes (resize, rotation, sidebar), so undo an earlier decision first
    if (container.classList.contains('is-wide')) {
      container.classList.remove('is-wide');
      const w = svg.getAttribute('data-mdv-width');
      if (w === null || w === '') svg.removeAttribute('width'); else svg.setAttribute('width', w);
      svg.style.width = svg.getAttribute('data-mdv-style-width') || '';
    }
    const avail = container.clientWidth;
    if (!avail) return;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const natural = (vb && vb.width) || parseFloat(svg.style.maxWidth) || 0;
    if (natural * 0.5 <= avail) return;
    if (!svg.hasAttribute('data-mdv-width')) {
      svg.setAttribute('data-mdv-width', svg.getAttribute('width') || '');
      svg.setAttribute('data-mdv-style-width', svg.style.width || '');
    }
    container.classList.add('is-wide');
    svg.setAttribute('width', String(Math.ceil(natural)));
    svg.style.width = Math.ceil(natural) + 'px';
  }

  function refitDiagrams() {
    if (!ui.prose) return;
    ui.prose.querySelectorAll('.mdv-mermaid').forEach(fitWideDiagram);
  }

  async function renderMermaidInto(container, code, seq) {
    try {
      const out = await window.mermaid.render('mdv-mmd-' + (++state.mermaidSeq), code);
      if (seq !== state.renderSeq) return;
      container.className = 'mdv-mermaid';
      container.innerHTML = out.svg;
      fitWideDiagram(container);
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

  /** When the theme changes, redraw the displayed diagrams to match the colors (FR-501). */
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

  // ------------------------------------------------------------------ Displaying documents

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
    // When scrolled to the bottom, treat the last heading that cannot reach the top as the current position
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

  /** Decide the scroll position after display. */
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
    // The indexer may have learned the home title first, so the header is refreshed on every render too
    ui.title.textContent = siteTitle();
    state.viewTitle = opts.title || '';
    document.title = tabTitle(opts.title);
    state.current = opts.entry ? opts.entry.path : null;
    state.currentEntry = opts.entry || null;
    updateActiveLinks();
    renderMath(ui.prose, seq);
    settleScroll(opts.fragment, opts.nav);
    applyHits();
    markScrollable();
    scheduleHighlight(opts.pendingCode, seq);
    renderMermaid(ui.prose, seq).then(() => { if (seq === state.renderSeq) markScrollable(); }).catch(reportError);
    // When switching documents, move focus to the main content area, but do not steal it from a field being typed in
    const active = document.activeElement;
    const typing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.nodeName);
    if (!typing && !(opts.nav && typeof opts.nav.keepScroll === 'number')) {
      try { ui.main.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
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
    const known = entry.title;
    entry.title = title;
    if (known !== title) refreshTitles();
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
    if (seq !== state.renderSeq || state.set !== set) return; // Navigated elsewhere while loading
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
      // Where saving is not possible, do not show a button that does nothing when pressed
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
    // On the hosted trial page, say up front that some features are unavailable
    if (state.config.hosted) {
      const note = '> [!IMPORTANT]\n> ' + t('helpHostedNote') + '\n';
      const eol = text.indexOf('\n');
      text = text.charAt(0) === '#' && eol > 0 ? text.slice(0, eol + 1) + '\n' + note + text.slice(eol + 1) : note + '\n' + text;
    }
    const ctx = { kind: 'help', path: '' };
    const out = renderMarkdown(text, ctx);
    mountView({ node: out.frag, toc: out.toc, ctx: ctx, title: t('helpTitle'), metaPath: t('helpTitle'), metaDate: 0, fragment: fragment, nav: nav, view: 'help', pendingCode: out.pendingCode });
  }

  // ---- Make areas that need horizontal scrolling operable by keyboard too (NFR-4)

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
    // Separate measuring from writing so layout is not recalculated repeatedly
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

  /** Rebuild the current view, e.g. after a settings change. */
  function refreshView() {
    updateMenu();
    if (state.view === 'welcome') return;
    handleRoute({ keepScroll: window.scrollY, force: true });
  }

  // ------------------------------------------------------------------ Routing (FR-304, FR-306)

  function go(route, replace) {
    // How hashchange arrives for a bare "#" differs between browsers. Normalize to "#/", which points to the home page
    if (route === '#' || route === '') route = '#/';
    if (replace) {
      try {
        history.replaceState(null, '', route);
        handleRoute();
        return;
      } catch (e) { /* where replacing is not possible, do a normal navigation */ }
    }
    // The hashchange event arrives slightly late. To avoid it interleaving with actions in between (e.g. returning to the search box),
    // switch the view here without waiting, and skip the event that arrives later exactly once
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

    // Number each history position. If it already has a number, this is a back/forward navigation
    let traversal = false;
    const st = history.state;
    if (st && typeof st.mdvIdx === 'number') {
      traversal = st.mdvIdx !== state.navIdx;
      state.navIdx = st.mdvIdx;
      if (st.mdvIdx > state.navCounter) state.navCounter = st.mdvIdx;
    } else {
      state.navIdx = ++state.navCounter;
      try { history.replaceState({ mdvIdx: state.navIdx }, ''); } catch (e) { /* ignore */ }
    }
    const nav = { traversal: traversal, keepScroll: opts.keepScroll };

    closeDrawer({ navigating: true });
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
      try { history.replaceState(history.state, '', core.buildRoute(path, fragment)); } catch (e) { /* ignore */ }
    }

    // Navigation within the same document only changes the position, without redrawing
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

  // ------------------------------------------------------------------ Sidebar

  /** Label in the file list (FR-1105): the document's title once known, else the file name without extension. */
  function treeLabel(f) {
    const entry = state.set && state.set.entries.get(f.path);
    return (entry && entry.title) || core.stripDocExt(f.name);
  }

  function refreshTreeLabels() {
    if (!state.set || !ui.sideTree) return;
    ui.sideTree.querySelectorAll('a.mdv-tree-link[data-path]').forEach((a) => {
      const label = treeLabel({ path: a.getAttribute('data-path'), name: core.basename(a.getAttribute('data-path')) });
      if (a.textContent !== label) a.textContent = label;
    });
  }

  function renderTreeNode(node, depth) {
    const ul = h('ul', depth === 0 ? { class: 'mdv-tree' } : null);
    node.files.forEach((f) => {
      ul.appendChild(h('li', null, h('a', { class: 'mdv-tree-link', href: core.buildRoute(f.path), title: f.path, 'data-path': f.path }, treeLabel(f))));
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
      }).catch(() => { /* if the nav cannot be shown, use only the file list */ });
    }
    applySideTab();
    updateActiveLinks();
  }

  /** Mark items in the custom nav that are not links (section headings). */
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
    // Only when there are tabs, expose the controlled element as a tab panel
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
    const treeActive = ui.sideTree.querySelector('a[aria-current="page"]');
    if (treeActive) {
      let p = treeActive.parentNode;
      while (p && p !== ui.sideTree) {
        if (p.nodeName === 'DETAILS') p.open = true;
        p = p.parentNode;
      }
    }
    // Bring the active item of the visible list (Nav or Files) into view (FR-1109)
    const active = !ui.sideNav.hidden ? ui.sideNav.querySelector('a[aria-current="page"]') : treeActive;
    const sidebarShown = isNarrow() ? ui.app.classList.contains('is-drawer-open') : ui.app.getAttribute('data-sidebar') !== 'closed';
    if (active && sidebarShown && typeof active.scrollIntoView === 'function') {
      const box = ui.sidebar.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      if (box.height && (r.top < box.top || r.bottom > box.bottom)) active.scrollIntoView({ block: 'nearest' });
    }
  }

  // ------------------------------------------------------------------ Search (FR-401 to 405)

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
      if (state.set === set) refreshTitles();
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

    // Files used for the custom nav (_sidebar.md etc.) are tables of contents, not content, so leave them out of results
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
    // IME composition in progress (e.g. Japanese input). Safari sends the Enter that confirms a conversion
    // after compositionend with isComposing false, but with keyCode 229
    if (ev.isComposing || ev.keyCode === 229) return;
    const n = state.search.results.length;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (ui.searchPanel.hidden) runSearch(); else if (n) setActiveResult((state.search.active + 1) % n);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (n) setActiveResult((state.search.active - 1 + n) % n);
    } else if (ev.key === 'Enter') {
      // Right after typing, the delayed search may not have run yet: run it now so Enter opens the top result (FR-1113)
      if (state.search.timer || ui.searchPanel.hidden || state.search.query !== ui.searchInput.value) {
        clearTimeout(state.search.timer);
        state.search.timer = null;
        state.search.active = -1;
        runSearch();
      }
      const count = state.search.results.length;
      if (!ui.searchPanel.hidden && count) { ev.preventDefault(); openResult(Math.max(state.search.active, 0)); }
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      if (!ui.searchPanel.hidden) closeSearchPanel();
      else { ui.searchInput.value = ''; state.hitTerms = null; clearHits(); ui.searchInput.blur(); }
    }
  }

  // ---- Highlighting matched terms in the document (FR-403)

  function clearHits() {
    const marks = ui.prose.querySelectorAll('mark.mdv-hit');
    marks.forEach((m) => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  /** Wrap the parts of text inside root that match the search terms in mark. Returns the first mark. */
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
      // Open it if inside a collapsed details element
      let p = first.parentNode;
      while (p && p !== ui.prose) {
        if (p.nodeName === 'DETAILS') p.open = true;
        p = p.parentNode;
      }
      state.anchorEl = first;
      first.scrollIntoView({ block: 'center' });
    }
  }

  // ------------------------------------------------------------------ Export (FR-601 to 603)

  function partsFromDom() {
    // Do not include policies added at runtime (lockExternalMedia) in the export
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
   * Check whether an adjacent mdfolio.css exists (SPEC 3.10). The <link> load / error may fire before this script runs,
   * and an empty style sheet is created even when the file is missing (Chromium), so load the same file again in a form that
   * does not affect the page (media="not all") and decide based on that result.
   */
  function probeUserCss() {
    const link = document.getElementById('mdv-user-css');
    if (!link) return Promise.resolve(false);
    return new Promise((resolve) => {
      const probe = h('link', { rel: 'stylesheet', media: 'not all', href: link.getAttribute('href'), 'data-mdv-dyn': 'user-css-probe' });
      let settled = false;
      const done = (ok) => { if (settled) return; settled = true; clearTimeout(timer); probe.remove(); resolve(ok); };
      // If a browser fires neither event, treat the CSS as absent rather than waiting forever (the export dialog waits for this)
      const timer = setTimeout(() => done(false), USER_CSS_PROBE_MS);
      probe.addEventListener('load', () => done(true));
      probe.addEventListener('error', () => done(false));
      document.head.appendChild(probe);
    });
  }

  /**
   * State of the adjacent mdfolio.css. applied: whether it is in effect on the page.
   * text: its contents (only when readable from the same http(s) origin; null under file://, where browser restrictions prevent reading it).
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
    // Size of the viewer itself (excluding libraries that are dropped)
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
      // Decide the type from the extension (the type the browser reports varies with OS settings). Use the browser's value only when unknown
      const known = core.mimeOf(e.path);
      const mime = known !== 'application/octet-stream' ? known : (blob.type || known);
      files.push({ path: e.path, kind: 'asset', mime: mime, base64: core.bytesToBase64(bytes), mtime: e.mtime });
      await yieldToBrowser();
    }
    const siteData = core.buildSiteData(set.name || title, files);
    // The exported HTML is meant for use elsewhere, so the "hosted trial page" flag is not carried over
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
    // Look (CSS): candidates in order are the chosen file -> the adjacent mdfolio.css (when readable) -> the CSS embedded in this HTML (FR-1002 to 1005)
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

  // ------------------------------------------------------------------ Events

  /**
   * Whether the async Clipboard API can be used.
   * Inside a cross-origin frame it cannot be used unless the embedding page allows it (calling it logs a console error),
   * so when this can be determined, check first and copy using the traditional method.
   */
  function clipboardApiAllowed() {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false;
    try {
      const policy = document.permissionsPolicy || document.featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function' && !policy.allowsFeature('clipboard-write')) return false;
    } catch (e) { /* if it cannot be determined, try the API */ }
    return true;
  }

  /** Whether the page is displayed inside another page (a frame). */
  function isFramed() {
    try { return window.top !== window.self; } catch (e) { return true; }
  }

  /**
   * Copy using the traditional method (select a hidden input field and copy). Returns true on success.
   * Must be called synchronously within the user's action (some browsers refuse if called later).
   */
  function copyWithSelection(text, btn) {
    const hadFocus = document.activeElement === btn;
    // Put the text in a hidden input fixed to the viewport and select it (fixing its position keeps the page from moving on select)
    const ta = h('textarea', { class: 'mdv-copy-buffer', 'aria-hidden': 'true', tabindex: '-1', readonly: true });
    ta.value = text;
    document.body.appendChild(ta);
    let ok = false;
    try {
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* ignore */ }
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
    // Inside a frame, the async API may be refused. Waiting for the refusal before falling back to the traditional method
    // fails in some browsers because it is no longer "within the user's action", so try the traditional method first
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
      if (state.skipHashEvents > 0) { state.skipHashEvents--; return; } // already handled by go()
      handleRoute();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach((type) => {
      window.addEventListener(type, () => { state.userScrolled = true; }, { passive: true, capture: true });
    });
    window.addEventListener('resize', () => {
      // Widening the window while the drawer is open must not leave the content inert. The sidebar stays
      // visible at the wider width, so focus stays where it is
      if (!isNarrow() && ui.app.classList.contains('is-drawer-open')) closeDrawer({ keepFocus: true });
      applySidebarState();
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { refitDiagrams(); markScrollable(); }, 200);
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
    // Inside the menu, move with the up/down arrows, Home and End. Close when Tab leaves it
    ui.menu.addEventListener('keydown', (ev) => {
      const items = Array.prototype.slice.call(ui.menu.querySelectorAll('.mdv-menu-item:not([hidden])'));
      const i = items.indexOf(document.activeElement);
      let next = -1;
      if (ev.key === 'ArrowDown') next = (i + 1) % items.length;
      else if (ev.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End') next = items.length - 1;
      else if (ev.key === 'Tab') { focusNoScroll(ui.menuBtn); closeMenu(); return; }
      if (next >= 0) { ev.preventDefault(); focusNoScroll(items[next]); }
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
      // Allow switching tabs with the arrow keys too
      tab.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End') return;
        ev.preventDefault();
        const other = ev.key === 'Home' ? ui.tabNav : ev.key === 'End' ? ui.tabFiles : (tab === ui.tabNav ? ui.tabFiles : ui.tabNav);
        other.focus();
        other.click();
      });
    });

    // Search
    ui.searchInput.addEventListener('input', () => {
      clearTimeout(state.search.timer);
      state.search.timer = setTimeout(() => { state.search.timer = null; state.search.active = -1; runSearch(); }, 150);
    });
    ui.searchInput.addEventListener('focus', () => { if (ui.searchInput.value.trim()) runSearch(); });
    ui.searchInput.addEventListener('keydown', onSearchKey);
    ui.searchList.addEventListener('click', (ev) => {
      const item = ev.target.closest ? ev.target.closest('.mdv-search-item') : null;
      if (!item || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      openResult(Number(item.getAttribute('data-index')));
    });

    // Clicks in the main content and sidebar
    document.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!target || !target.closest) return;
      if (!ui.menu.hidden && !target.closest('.mdv-menu-wrap')) closeMenu();
      if (!ui.searchPanel.hidden && !target.closest('.mdv-search')) closeSearchPanel();
      const copy = target.closest('.mdv-copy');
      if (copy) { copyCode(copy); return; }
      const asset = target.closest('a[data-mdv-asset]');
      // When saving is disabled by configuration, do nothing and let the link navigate (to the page describing the attachment)
      if (asset && state.set && state.config.allowDownloads && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey && ev.button === 0) {
        const entry = state.set.entries.get(asset.getAttribute('data-mdv-asset'));
        if (entry) { ev.preventDefault(); downloadEntry(entry); }
        return;
      }
      // In-app links (#…) are navigated here rather than left to the browser.
      // In environments where the document URL and base URL differ (e.g. a frame embedded via srcdoc),
      // leaving it to the browser would navigate to another page and the view would disappear.
      // Clicking a link to the currently displayed document again returns to the top (go() re-displays the same document)
      const link = target.closest('a[href]');
      if (!link || ev.defaultPrevented) return;
      const href = link.getAttribute('href');
      if (href.charAt(0) !== '#') return;
      // Leave actions like opening in a new tab or saving to the browser
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
        if (!ui.menu.hidden) { closeMenu(); focusNoScroll(ui.menuBtn); }
        if (!ui.searchPanel.hidden) closeSearchPanel();
        closeDrawer();
      }
    });

    // Drag and drop (not accepted in site mode)
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

    // When printing, finish highlighting code blocks not yet highlighted before output
    window.addEventListener('beforeprint', flushHighlight);

    window.addEventListener('unhandledrejection', (ev) => {
      if (ev && ev.reason && ev.reason.name === 'AbortError') return;
      if (window.console && console.warn) console.warn('[mdfolio]', ev && ev.reason);
    });
  }

  // ------------------------------------------------------------------ Startup

  function init() {
    state.config = core.normalizeConfig(readJsonBlock('mdv-config'));
    state.userCssProbe = probeUserCss();
    state.settings = loadSettings();
    if (!externalAllowed()) lockExternalMedia(); // do this before displaying any document
    const langPref = state.settings.lang === 'ja' || state.settings.lang === 'en' ? state.settings.lang
      : state.config.lang !== 'auto' ? state.config.lang : i18n.detect(navigator);
    state.lang = langPref;

    try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
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

  // Let tests and user scripts inspect the state (read-only)
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
