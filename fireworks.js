/* 烟花特效：定时自动放 + 点击任意位置也能放。
   火箭从底部升空、到顶点爆开成多彩火花，带重力下坠与淡出。
   不挡点击（pointer-events:none），尊重 prefers-reduced-motion。 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cv = document.createElement('canvas');
  cv.id = 'fx-fireworks';
  Object.assign(cv.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '80'
  });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  // 调色板（与拖尾呼应，但烟火更亮）
  const palette = ['#ff5a1f', '#ffb020', '#ff3d77', '#22b8a6', '#5b8cff', '#a06bff', '#ffd23f'];
  const G = 0.06; // 火花重力

  const rockets = [];
  const sparks = [];
  let flash = null; // 爆开瞬间的亮光

  function launch(x, targetY) {
    const fromX = (x == null) ? innerWidth * (0.15 + Math.random() * 0.7) : x;
    const apex = (targetY == null)
      ? innerHeight * (0.12 + Math.random() * 0.32)
      : targetY;
    rockets.push({
      x: fromX,
      y: innerHeight + 8,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(9 + Math.random() * 4),       // 初速向上
      apex: apex,
      color: palette[(Math.random() * palette.length) | 0]
    });
  }

  function explode(x, y, baseColor) {
    const n = 70 + (Math.random() * 50 | 0);
    const power = 3.2 + Math.random() * 2.4;
    // 同一发以主色为主，掺一点白色火花更像真实烟花
    const useWhite = Math.random() < 0.6;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = power * (0.25 + Math.random() * 0.95);
      const white = useWhite && Math.random() < 0.18;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        decay: 0.008 + Math.random() * 0.014,
        size: 1.4 + Math.random() * 1.8,
        color: white ? '#ffffff' : (Math.random() < 0.25 ? palette[(Math.random() * palette.length) | 0] : baseColor),
        twinkle: Math.random() < 0.5
      });
    }
    flash = { x: x, y: y, r: 0, life: 1 };
  }

  // 自动放：间隔 1.4~3s
  let nextAuto = 900 + Math.random() * 1200;
  let t = 0;

  // 点击/触摸也能放
  function onPoint(e) {
    const p = (e.touches && e.touches[0]) || e;
    launch(p.clientX, p.clientY);
  }
  addEventListener('click', onPoint, { passive: true });
  addEventListener('touchstart', onPoint, { passive: true });

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    t++;

    // 自动发射
    if (t >= nextAuto) {
      launch();
      nextAuto = t + 80 + (Math.random() * 130 | 0); // 约 1.3~3.5s
    }

    // 火箭
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += G;
      r.x += r.vx;
      r.y += r.vy;
      // 画火箭尾迹
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (r.vy >= 0 || r.y <= r.apex) {
        explode(r.x, r.y, r.color);
        rockets.splice(i, 1);
      }
    }

    // 爆开亮光
    if (flash) {
      flash.r += 6;
      flash.life -= 0.08;
      if (flash.life <= 0) flash = null;
      else {
        const g = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.r);
        g.addColorStop(0, 'rgba(255,255,255,' + (flash.life * 0.5) + ')');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, flash.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 火花
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vx *= 0.985;
      s.vy = s.vy * 0.985 + G;
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      let a = s.life;
      if (s.twinkle) a *= (0.5 + 0.5 * Math.abs(Math.sin(t * 0.4 + i)));
      ctx.globalAlpha = Math.max(a, 0);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (0.4 + 0.6 * s.life), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  tick();
})();
