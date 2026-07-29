// 前端渲染：从 /api/content 读取内容并填充页面（前台始终与后台同步）
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => (s == null ? '' : String(s));

  // 主题切换
  function initTheme() {
    const root = document.documentElement;
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) root.classList.add('dark');
    const sync = () => toggle.textContent = root.classList.contains('dark') ? '☀' : '☾';
    sync();
    toggle.addEventListener('click', () => {
      root.classList.toggle('dark');
      localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
      sync();
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 优先取后端接口；在 GitHub Pages 等无后端环境自动回退到仓库内的静态 content.json
  function load() {
    return fetch('/api/content')
      .then(r => { if (!r.ok) throw new Error('api-unavailable'); return r.json(); })
      .catch(() => fetch('content.json').then(r => {
        if (!r.ok) throw new Error('static-unavailable');
        return r.json();
      }));
  }

  // ---------- 首页 ----------
  function renderHome(d) {
    const s = d.site || {};
    if ($('#hero-name')) $('#hero-name').innerHTML = esc(s.name) + '<span class="accent">.</span>';
    if ($('#hero-avatar')) $('#hero-avatar').src = esc(s.avatar || 'media/avatar-placeholder.svg');
    if ($('#hero-kicker')) $('#hero-kicker').textContent = esc(s.kicker);
    if ($('#hero-tagline')) $('#hero-tagline').textContent = esc(s.tagline);
    if ($('#hero-scroll')) $('#hero-scroll').textContent = esc(s.scrollHint || '向下滚动');
    if ($('#brand')) $('#brand').innerHTML = esc(s.name) + '<span class="dot">.</span>';
    renderNav(s.nav);

    const ab = $('#about-body');
    if (ab) ab.innerHTML = (d.about || []).map(p => `<p>${esc(p)}</p>`).join('');

    const grid = $('#projects');
    if (grid) grid.innerHTML = (d.projects || []).map(p => `
      <a class="card ${p.solid ? 'solid' : ''}" href="project.html?id=${esc(p.id)}">
        <div class="num">${String(p.id).padStart(2, '0')}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.desc)}</p>
        <span class="more">查看项目 <span class="arrow">→</span></span>
      </a>`).join('');

    const wl = $('#writing-list');
    if (wl) {
      wl.innerHTML = (d.posts || []).map(p => `
        <article class="post-item">
          <div class="post" tabindex="0" role="button" aria-expanded="false">
            <img class="thumb" src="${esc(p.image || 'media/placeholder.svg')}" alt="" />
            <span class="date">${esc(p.date)}</span>
            <span class="title">${esc(p.title)}</span>
            <span class="arrow">→</span>
          </div>
          <div class="post-body"><div>${p.body || ''}</div></div>
        </article>`).join('');
      initWritingModal();
    }

    const cl = $('#contact-list');
    if (cl) cl.innerHTML = (s.contact || []).map(c => `<a class="chip" href="${esc(c.url || '#')}">${esc(c.label)}</a>`).join('');
  }

  // ---------- 顶部导航 ----------
  function renderNav(nav) {
    const box = $('#nav-links');
    if (!box) return;
    const items = Array.isArray(nav) && nav.length ? nav : [
      { label: '关于', url: 'index.html#about' },
      { label: '项目', url: 'index.html#work' },
      { label: '文字', url: 'index.html#writing' },
      { label: '联系', url: 'index.html#contact' }
    ];
    box.innerHTML = items.map(n => `<a href="${esc(n.url)}">${esc(n.label)}</a>`).join('');
  }

  function initWritingModal() {
    const wmodal = document.getElementById('writingModal');
    if (!wmodal) return;
    const wmDate = document.getElementById('wmDate');
    const wmTitle = document.getElementById('wmTitle');
    const wmBody = document.getElementById('wmBody');
    const wmClose = document.getElementById('wmClose');
    function open(item) {
      const post = item.querySelector('.post');
      wmDate.textContent = post.querySelector('.date').textContent;
      wmTitle.textContent = post.querySelector('.title').textContent;
      wmBody.innerHTML = item.querySelector('.post-body').innerHTML;
      wmodal.classList.add('open');
      wmodal.setAttribute('aria-hidden', 'false');
      wmClose.focus();
    }
    function close() { wmodal.classList.remove('open'); wmodal.setAttribute('aria-hidden', 'true'); }
    document.querySelectorAll('.post-item').forEach(item => {
      const post = item.querySelector('.post');
      post.addEventListener('click', () => open(item));
      post.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item); } });
    });
    wmClose.addEventListener('click', close);
    wmodal.addEventListener('click', e => { if (e.target === wmodal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  // ---------- 项目详情页 ----------
  function renderProject(d) {
    const id = new URLSearchParams(location.search).get('id');
    const p = (d.projects || []).find(x => String(x.id) === String(id));
    const mount = $('#project-detail');
    if (!mount) return;
    if (!p) { mount.innerHTML = '<p>未找到该项目。</p>'; return; }
    mount.innerHTML = `
      <a class="back" href="index.html">← 返回主页</a>
      <section class="project">
        <div class="num">${String(p.id).padStart(2, '0')}</div>
        <h1>${esc(p.title)}</h1>
        <p class="lede">${esc(p.desc)}</p>
        ${p.image ? `<img class="proj-hero" src="${esc(p.image)}" alt="" />` : ''}
        <div class="prose">${p.body || ''}</div>
      </section>`;
  }

  initTheme();
  load().then(d => {
    if ($('#projects')) renderHome(d);
    if ($('#project-detail')) renderProject(d);
  }).catch(e => {
    console.error(e);
    const main = document.querySelector('main');
    if (main) main.insertAdjacentHTML('afterbegin',
      '<p style="padding:40px;color:#ff5a1f">内容加载失败，请确认后端已启动：在站点目录运行 <code>node server.js</code>。</p>');
  });
})();
